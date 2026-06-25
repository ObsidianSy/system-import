# Spec — Integração de Login via auth.owlflow (import_manager)

> **Status:** IMPLEMENTADO (aguardando teste em produção) · **Autor:** Quinn (QA) · **Data:** 2026-06-25
> feat-001..004 implementados; feat-005 sem mudança (o frontend já exibe as mensagens do backend). `tsc --noEmit` OK.
> App registrado no owlflow: `clientId owf_be64e19c9cff50627e344fec11f61090`.
> **Workflow:** Opus Owl — Spec antes de codar. Este documento é o contrato. Se não está aqui, não entra no sprint.

---

## 0. Contexto e Objetivo

Hoje o `import_manager` tem login próprio: `auth.login` (tRPC) faz `bcrypt.compare` contra a tabela
`users` e emite um JWT (`jose`, HS256) em **cookie httpOnly** (`COOKIE_NAME`), validado por
`sdk.authenticateRequest`.

**Objetivo:** trocar a autenticação de credenciais para o serviço central **auth.owlflow**
(`http://localhost:3100` em dev · `https://auth.obi7.cloud` em prod), igual ao que o **ERP_Fabricar** já faz,
**mantendo cookie httpOnly** e **controle de acesso local por allowlist de email**.

### Regra de acesso (definida pelo dono do produto)

- O **owlflow autentica qualquer pessoa** (e cria a conta no owlflow se não existir lá).
- Para **entrar no import_manager**, o email autenticado **precisa já existir na tabela `users`**,
  criado **manualmente por um admin** (email + nome + permissões). 
- 1º login com sucesso no owlflow → **auto-link por email** (preenche `authId`).
- Email válido no owlflow **sem** usuário local → **403 `USER_NOT_IN_ERP`**, **não cria nada**.

### Métodos nesta fase

- ✅ Email + senha (via owlflow).
- ❌ Google OAuth — fora de escopo nesta fase.
- ❌ Recuperação de senha — fora de escopo nesta fase.

---

## 1. Arquitetura escolhida

**Proxy no backend + cookie httpOnly** (decisão do dono). O `client_secret` **nunca** vai ao browser.

```
Browser ──trpc.auth.login(email,password)──> import_manager backend (tRPC)
                                                  │
                                                  ├─ fetch owlflow /auth/login  (x-client-id/secret server-side)
                                                  │     └─ 200 { tokens.accessToken (JWT: userId,email,appId,role) }
                                                  │
                                                  ├─ resolve user local:  authId → email(+auto-link) → SENÃO 403
                                                  │
                                                  └─ emite cookie httpOnly próprio (jose HS256, payload {userId:localId,email,name})
Browser <──Set-Cookie: session=...; user{...}──┘
Demais rotas (products, importations, ...) ──> backend local (sdk valida o cookie próprio, SEM MUDANÇA)
```

### Decisões em aberto (CONFIRMAR antes de implementar)

| # | Decisão | Recomendado | Alternativa |
|---|---------|-------------|-------------|
| **D1** | Modelo de sessão | **Forma 2:** owlflow só no login; backend emite cookie próprio (7–30d). `sdk` não muda; front quase não muda; sem refresh de 15min. Sem SSO real-time. | **Forma 1 (espelhar Fabricar):** repassar `accessToken` do owlflow (15min) + refresh token em cookie + interceptor. Mais fiel ao Fabricar, porém muda o transporte e adiciona refresh. |
| **D2** | Fallback local se owlflow cair | **Não na Fase 1** (simplicidade). Se owlflow fora → login indisponível. | **Sim:** manter `bcrypt` local como degradação (como o Fabricar). Exige manter senha local sincronizada. |

> O restante desta spec assume **D1 = Forma 2** e **D2 = sem fallback (Fase 1)**.

---

## 2. Risco / Achado de qualidade que afeta esta feature

⚠️ **Router duplicado.** O que roda em produção é `server/routers.ts` (o `auth` está **inline** ali).
Existe também `server/routers/index.ts` + `server/routers/auth.router.ts` **órfãos** (ninguém importa).
**As mudanças de `auth.login`/`auth.logout` vão no `server/routers.ts`** (o em uso). Recomenda-se,
em tarefa separada, consolidar/remover os routers órfãos para evitar editar o arquivo errado.

⚠️ **Secrets.** No `ERP_Fabricar` o `.env` versiona `JWT_SECRET`, `client_secret` e `admin-key` reais.
No `import_manager`, `AUTH_OWLFLOW_CLIENT_SECRET` e `JWT_SECRET` **devem** ficar fora do git (já há `.env` no `.gitignore` — validar) e **nunca** em variável `VITE_*` (não expor no bundle).

---

## 3. Pré-requisito operacional (@devops, fora do código)

Registrar o import_manager como Application no owlflow para obter as credenciais:

```bash
curl -X POST $AUTH_OWLFLOW_URL/admin/apps \
  -H "x-admin-key: $ADMIN_MASTER_KEY" -H "Content-Type: application/json" \
  -d '{ "name": "import_manager",
        "allowedOrigins": ["http://localhost:3000","https://<dominio-prod>"] }'
# Salvar clientId (owf_...) e clientSecret (owfs_...) — secret só aparece 1x.
```

**Crítico:** o `JWT_SECRET` do import_manager **deve ser idêntico** ao do owlflow (HS256 simétrico),
senão o backend não consegue verificar o `accessToken` do owlflow.

---

## 4. Spec — 8 Blocos

```json
{
  "project": {
    "name": "import_manager",
    "description": "Sistema de gestão de importação. Migrar login para auth.owlflow mantendo allowlist local por email e cookie httpOnly."
  },
  "sprints": [
    {
      "id": "sprint-auth-owlflow",
      "index": 0,
      "name": "Login via auth.owlflow",
      "description": "Autenticação de credenciais delegada ao owlflow via proxy backend; acesso controlado por allowlist local; sessão em cookie httpOnly próprio.",
      "coder_agent_id": "claude-dev",
      "stack": ["typescript", "trpc", "drizzle", "postgresql", "react", "jose"],
      "features": [
        {
          "id": "feat-001",
          "name": "Coluna authId na tabela users",
          "description": "Adicionar authId (nullable, unique) para linkar o usuário local ao userId do owlflow. password passa a ser opcional (autenticação externa).",
          "acceptance_criteria": [
            "Migration idempotente adiciona coluna authId TEXT na tabela users",
            "Índice único parcial em authId (permite múltiplos NULL, mas authId preenchido é único)",
            "Drizzle schema reflete authId: text('authId').unique()",
            "Usuários existentes permanecem com authId NULL até o 1º login via owlflow",
            "Nenhum dado existente é perdido (password preservado para eventual fallback)",
            "tsc --noEmit passa sem erros de tipo"
          ],
          "data_model": {
            "changes": "model users { + authId text unique nullable }",
            "sql": "ALTER TABLE \"users\" ADD COLUMN IF NOT EXISTS \"authId\" text;\nCREATE UNIQUE INDEX IF NOT EXISTS \"users_authId_key\" ON \"users\"(\"authId\");",
            "indexes": ["users_authId_key (unique)"]
          },
          "file_structure": {
            "create": ["SQL manual aplicado direto no banco de produção (ALTER TABLE users ADD authId) — drizzle migrations DESSINCRONIZADAS, NÃO usar db:push"],
            "modify": ["drizzle/schema.ts (apenas o tipo do ORM; não aplica nada no banco)"],
            "do_not_touch": ["server/routers/ (órfãos)", "drizzle/meta/_journal.json"]
          }
        },
        {
          "id": "feat-002",
          "name": "Serviço de proxy + resolução de usuário (owlflowAuth)",
          "description": "Service no backend que (a) chama owlflow /auth/login com client_id/secret server-side, (b) verifica o accessToken, (c) resolve o usuário local por authId → email(+auto-link) → ou nega.",
          "acceptance_criteria": [
            "Happy path: credenciais válidas + usuário local existe → retorna o User local",
            "Auto-link: usuário sem authId mas com email correspondente → UPDATE authId no 1º login",
            "Re-link: authId do token difere do salvo (usuário recriado no owlflow) → atualiza authId",
            "Allowlist: token válido mas email sem usuário local → erro USER_NOT_IN_ERP (NÃO cria usuário)",
            "Usuário local isActive=false → acesso negado mesmo com credenciais válidas",
            "Admin no owlflow (role='admin') → tratado como admin local (decisão: NÃO sobrescreve permissões granulares; ver integrations)",
            "Credenciais inválidas no owlflow (401) → erro 'Credenciais inválidas' (não revelar se email existe)",
            "owlflow indisponível (timeout/network) → erro claro 'Serviço de autenticação indisponível' (502/503)",
            "client_secret e admin-key NUNCA aparecem em logs nem em resposta ao cliente",
            "JWT do owlflow verificado com o mesmo JWT_SECRET (HS256); assinatura inválida → rejeita"
          ],
          "api_spec": {
            "method": "internal-service",
            "path": "server/services/owlflowAuth.ts → authenticateViaOwlflow(email, password)",
            "auth": "client_id + client_secret (server-side env)",
            "responses": {
              "ok": { "description": "User local resolvido", "body": { "user": "User" } },
              "INVALID_CREDENTIALS": { "description": "owlflow rejeitou (401)", "code": "UNAUTHORIZED" },
              "USER_NOT_IN_ERP": { "description": "Token válido, email não cadastrado localmente", "code": "FORBIDDEN" },
              "USER_INACTIVE": { "description": "Usuário local inativo", "code": "FORBIDDEN" },
              "AUTH_SERVICE_DOWN": { "description": "owlflow inacessível", "code": "INTERNAL_SERVER_ERROR/503" }
            }
          },
          "integrations": [
            {
              "feature": "Permissões granulares (canViewCostUSD, canEditImportations, ...)",
              "impact": "Continuam 100% LOCAIS. owlflow só fornece identidade + role. Admin do owlflow vira role='admin' local; permissões finas permanecem como cadastradas no import.",
              "path": "drizzle/schema.ts users.* / server/db.ts"
            }
          ],
          "file_structure": {
            "create": ["server/services/owlflowAuth.ts"],
            "modify": ["server/_core/env.ts"],
            "do_not_touch": ["server/_core/sdk.ts"]
          }
        },
        {
          "id": "feat-003",
          "name": "auth.login / auth.logout via owlflow (tRPC)",
          "description": "Reescrever auth.login (em server/routers.ts) para usar owlflowAuth e, em caso de sucesso, emitir o cookie de sessão próprio (mesma assinatura jose atual). auth.logout limpa o cookie e (opcional) notifica owlflow.",
          "acceptance_criteria": [
            "auth.login mantém a mesma assinatura de input { email, password } e o mesmo formato de retorno { success, user }",
            "Sucesso → seta cookie httpOnly COOKIE_NAME com JWT próprio (payload { userId: localId, email, name }) — sdk continua validando sem mudança",
            "auth.login NÃO valida mais bcrypt local (a validação é no owlflow) — exceto se D2=fallback for aprovado",
            "Erros mapeados para TRPCError: INVALID_CREDENTIALS→UNAUTHORIZED, USER_NOT_IN_ERP→FORBIDDEN (mensagem orientando procurar o admin), AUTH_SERVICE_DOWN→INTERNAL_SERVER_ERROR",
            "lastSignedIn atualizado em login bem-sucedido",
            "auth.logout limpa COOKIE_NAME (comportamento atual preservado)",
            "Rate limiting de login preservado/aplicado (authLimiter já existe no projeto)",
            "Nenhuma outra procedure (products, importations, ...) é afetada — protectedProcedure continua lendo ctx.user"
          ],
          "api_spec": {
            "method": "tRPC mutation",
            "path": "auth.login / auth.logout (server/routers.ts)",
            "auth": "publicProcedure",
            "responses": {
              "200": { "description": "Login OK", "body": { "success": true, "user": { "id": "localId", "email": "", "name": "", "role": "" } } },
              "UNAUTHORIZED": { "description": "Credenciais inválidas no owlflow" },
              "FORBIDDEN": { "description": "USER_NOT_IN_ERP ou usuário inativo" },
              "INTERNAL_SERVER_ERROR": { "description": "owlflow indisponível" }
            }
          },
          "integrations": [
            { "feature": "sdk.authenticateRequest", "impact": "Sem mudança (cookie próprio).", "path": "server/_core/sdk.ts" },
            { "feature": "Router duplicado", "impact": "Editar server/routers.ts (em uso), NÃO server/routers/auth.router.ts (órfão).", "path": "server/routers.ts" }
          ],
          "file_structure": { "modify": ["server/routers.ts"] }
        },
        {
          "id": "feat-004",
          "name": "Admin cria usuário (email-only, sem senha local)",
          "description": "Ajustar users.create para permitir cadastrar usuário da allowlist informando email + nome + role + permissões, sem exigir senha (password nullable / loginMethod='owlflow').",
          "acceptance_criteria": [
            "Admin cria usuário informando email, nome, role e permissões — password opcional",
            "Usuário criado com authId NULL (será linkado no 1º login por email)",
            "Validação: email único (409 se já existe)",
            "Apenas admin pode criar (regra atual preservada); bootstrap do 1º usuário continua válido",
            "Email normalizado (lowercase/trim) para o auto-link por email funcionar de forma consistente",
            "loginMethod marcado como 'owlflow' para usuários sem senha local"
          ],
          "integrations": [
            { "feature": "feat-002 auto-link", "impact": "O match do 1º login é por LOWER(email); criação deve normalizar email.", "path": "server/services/owlflowAuth.ts" }
          ],
          "file_structure": { "modify": ["server/routers.ts (users.create) ou server/routers/users.router.ts conforme o em uso"] }
        },
        {
          "id": "feat-005",
          "name": "Frontend — login + erro USER_NOT_IN_ERP",
          "description": "Tela de login praticamente inalterada (continua chamando trpc.auth.login). Tratar a mensagem de email não cadastrado e estados de loading/erro.",
          "acceptance_criteria": [
            "Login com email/senha continua funcionando pela mesma chamada trpc.auth.login",
            "Erro FORBIDDEN/USER_NOT_IN_ERP exibe mensagem clara: 'Seu email não está cadastrado. Peça ao administrador para criar sua conta.'",
            "Erro UNAUTHORIZED exibe 'Email ou senha inválidos' (sem revelar qual)",
            "Erro de serviço (owlflow down) exibe 'Serviço de autenticação indisponível, tente novamente'",
            "Botão de login desabilitado durante o request (loading state)",
            "Após sucesso, invalida/refetch da query auth.me e redireciona ao app",
            "Funciona em telas < 375px (mobile)"
          ],
          "file_structure": { "modify": ["client/src/pages/<login>.tsx (localizar)"] }
        }
      ]
    }
  ]
}
```

---

## 5. Plano de migração de usuários existentes

1. Usuários atuais permanecem com `authId = NULL` e seu `password` bcrypt preservado.
2. No 1º login via owlflow (mesmo email), o `authId` é preenchido por auto-link.
3. **Pré-condição:** o usuário precisa existir **também no owlflow** (com a mesma senha) — como o owlflow
   cria conta no registro, ou o admin do owlflow provisiona. Definir com @devops como os usuários atuais
   passam a existir no owlflow (registro manual vs. script).
4. Sem big-bang: quem não migrou ainda só consegue logar quando existir no owlflow **e** na allowlist local.

---

## 6. Edge cases que o QA vai verificar (gate)

- Email existe local mas com caixa diferente do owlflow → auto-link deve casar (normalização).
- `authId` já preenchido apontando para outro `userId` (usuário recriado no owlflow) → re-link.
- Dois usuários locais com mesmo email (não deveria, email é unique) → garantir unicidade.
- Token do owlflow expirado/!HS256/secret divergente → rejeição limpa, sem 500 vazando stack.
- owlflow retorna 429 (rate limit) → propagar mensagem amigável, não quebrar a tela.
- Logout não deve falhar a UX se o owlflow estiver fora (limpar cookie local de qualquer forma).
- Garantir que `client_secret`/`JWT_SECRET` não aparecem em logs (`[Context]`/`[SDK]` hoje logam payloads — revisar verbosidade).

---

## 7. Critérios de validação (Definition of Done)

- [ ] `tsc --noEmit` sem erros · `npm run lint` sem novos erros
- [ ] Migration aplicada de forma idempotente (rodar 2x não quebra)
- [ ] Teste do fluxo: login válido+allowlist → entra; válido sem allowlist → 403; owlflow down → erro tratado
- [ ] `client_secret` ausente do bundle do frontend (grep no build)
- [ ] Decisões D1 e D2 confirmadas e refletidas no código
- [ ] Documentar no SECURITY.md a dependência do owlflow e a paridade de JWT_SECRET
```

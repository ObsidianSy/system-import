# Plano de Organização e Melhoria — Frontend (import_manager)

> **Autor:** Quinn (QA) · **Data:** 2026-06-25 · **Base:** skills `ui-ux-pro-max` + `impeccable` (register *product*) + `DESIGN.md`
> Objetivo: tirar o sistema de "grande, mal organizado e genérico" para **organizado, consistente e profissional** — sem reescrever o produto, e sem quebrar o que funciona.

---

## 1. Diagnóstico (o porquê do "feio e desorganizado")

Medido no código, não no achismo:

| Problema | Evidência | Efeito |
|---|---|---|
| **Páginas-monstro** | 15.921 linhas em 27 páginas; 6+ telas com 800–1400 linhas (Galeria 1223, Importacoes 1096, Relatorios 997, DetalhesImportacao 985, Produtos 823) | Lógica + UI + estado tudo junto. Difícil manter, impossível reutilizar. |
| **Sem camada de componentes de domínio** | **54** componentes `ui/` (shadcn) vs **4** componentes de aplicação | Cada tela remonta seu layout do zero → por isso "parecem telas diferentes". |
| **Código morto / duplicado** | `ConfiguracoesUsuarios_new.tsx` (675 ln, não roteado), `ComponentShowcase.tsx` (1379 ln, não roteado), 2 telas de editar importação (`EditarImportacao` + `EditarImportacaoCompleta`, ambas roteadas) | ~2.000 linhas mortas + confusão de qual usar. |
| **Design system genérico** | tema shadcn "new-york" cru, azul Tailwind, **sem fonte própria** | Sem identidade → não "passa profissionalismo". (Tokens agora travados em `DESIGN.md`.) |
| **Forms com excesso de `useState`** | `NovaImportacao`, `EditarImportacaoCompleta` (10–15 estados cada) | Verboso, validação fragmentada, re-renders. `react-hook-form` **já está instalado** e não é usado. |
| **Inconsistência visual** | cores/raios/espaçamentos definidos ad-hoc por tela | A "falta de traços e detalhes" que você descreveu. |

**Raiz única:** falta uma **camada de componentes reutilizáveis** e um **conjunto de regras aplicado**. Resolver isso ataca quase todos os sintomas de uma vez.

---

## 2. Princípios que guiam o plano

- **Design serve a função** (register *product*): clareza e densidade de dados acima de decoração. O sistema é ferramenta de trabalho.
- **Tudo sai de token** (`DESIGN.md`): cor, raio, tipografia, espaçamento. Zero hardcode.
- **Componível, não copiável**: um padrão = um componente. Página compõe, não reinventa.
- **Cirúrgico**: preservar IA, rotas e comportamento. Modernizar o visual e a estrutura, não trocar o produto.
- **Estados completos**: toda tela com loading / vazio / erro, não só o "happy path".

---

## 3. Fases

> Cada fase tem **critério de verificação**. Esforço (P/M/G) e risco anotados.

### FASE 0 — Fundação visual *(esforço P · risco baixo · ROI altíssimo)*
- [x] `DESIGN.md` criado (tokens + regras de consistência).
- [ ] **Decidir e aplicar uma fonte própria** (ver Decisão D1). Uma linha de mudança global, maior lift de "profissionalismo" por esforço.
- [ ] Confirmar o **azul** como cor de marca (ou trocar — Decisão D2).
- **Verify:** a fonte nova renderiza em toda a UI; `DESIGN.md` atualizado com a família escolhida.

### FASE 1 — Limpeza *(esforço P · risco baixo)*
- [ ] Remover código morto: `ConfiguracoesUsuarios_new.tsx`, `ComponentShowcase.tsx` (confirmados não-roteados).
- [ ] Consolidar `EditarImportacao` vs `EditarImportacaoCompleta` em **uma** tela.
- **Verify:** `tsc --noEmit` e build passam; nenhuma rota quebrada; ~2.000 linhas a menos.

### FASE 2 — Camada de componentes de domínio *(esforço G · risco médio · maior ataque à desorganização)*
Criar os reutilizáveis que hoje não existem, extraídos dos padrões repetidos:
- `PageHeader` (título + breadcrumb + ações)
- `DataTable` padrão (ordenação, paginação, números **tabulares**, estados vazio/loading)
- `StatCard` / KPI (dashboard, relatórios)
- `FormSection` / `Field` (label acima, erro abaixo — padrão único)
- `FilterBar` / `SearchInput`
- `StatusBadge` (status de importação/estoque padronizados)
- `EmptyState`, `LoadingState`, `ErrorState`
- **Refatorar as páginas-monstro** para compor esses componentes → de 800–1400 ln para ~200–300.
- **Verify:** páginas-alvo reduzidas ≥50% em linhas; zero regressão visual/funcional; cada componente usado em ≥2 telas.

### FASE 3 — Consistência visual *(esforço M · risco baixo — fazer junto com a Fase 2)*
- [ ] Auditar e migrar cores hardcoded → tokens; raios/espaçamentos fora da escala → escala.
- [ ] Tabelas: valores (custo/qtd/imposto) com `tabular-nums` e alinhados à direita; hover/zebra padronizados.
- [ ] 1 botão primário (azul) por tela; resto secondary/outline/ghost.
- [ ] Contraste: `muted-foreground` está no limite — não usar em texto longo.
- **Verify:** grep sem cor hardcoded nas telas migradas; checklist do `DESIGN.md` (Do's/Don'ts) passa.

### FASE 4 — UX e estados *(esforço M · risco baixo)*
- [ ] Estados loading (skeletons) / vazio / erro em todas as telas.
- [ ] Migrar forms para **`react-hook-form` + `zod`** (já instalados; falta `@hookform/resolvers`).
- [ ] Acessibilidade: foco visível, labels, navegação por teclado, contraste WCAG AA.
- [ ] Responsivo / mobile nas telas principais.
- **Verify:** cada tela mostra os 3 estados; forms validam no client e no blur; teclado navega.

### FASE 5 — Performance *(esforço M · risco baixo)*
- [ ] Virtualizar listas longas (Produtos, Importacoes, Galeria) com `@tanstack/react-virtual`.
- [ ] Code splitting por rota (`lazy` + `Suspense`).
- **Verify:** lista de 500+ itens rola sem travar; bundle inicial menor.

---

## 4. Ordem recomendada

```
Sprint 1 (rápido + visível):   Fase 0 (fonte) + Fase 1 (limpeza)
Sprint 2 (o coração):          Fase 2 + Fase 3, começando por 1 tela-piloto
Sprint 3 (polimento):          Fase 4 (estados/forms) nas telas principais
Sprint 4 (escala):             Fase 5 (performance)
```

**Maior "profissionalismo" no menor tempo:** Sprint 1 inteiro + componentizar a tela mais usada. O resto propaga a partir dos componentes criados.

---

## 5. Decisões que dependem de você (antes de executar)

- **D1 — Fonte própria.** Recomendo **Inter** (neutra, profissional, gratuita, perfeita para product-UI denso) ou **Geist** (mais moderna/técnica). Hoje é a do sistema.
- **D2 — Cor de marca.** Manter o **azul** atual ou trocar por outra? (afeta `primary` no `DESIGN.md`).
- **D3 — Tela-piloto da Fase 2.** Por qual começar a componentização? Sugiro **Produtos** ou **Importacoes** (centrais e muito usadas) — viram o molde pro resto.

---

## 6. Instalações necessárias (só nas fases de execução)

- **Fase 4:** `@hookform/resolvers` (integra zod ao react-hook-form).
- **Fase 5:** `@tanstack/react-virtual`.

> ⚠️ **Cuidado com o lockfile.** Instalar pacote mexe no `pnpm-lock.yaml` — foi o que quebrou o deploy. Ao instalar, usar **pnpm 10.4.1** (a versão do `packageManager`) e conferir o build, para não reintroduzir o problema do hash do patch.

> Já instalados e prontos: `react-hook-form`, `zod`, `framer-motion`, `lucide-react`.

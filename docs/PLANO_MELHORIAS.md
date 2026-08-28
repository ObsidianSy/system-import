# PLANO COMPLETO DE MELHORIAS - Import Manager

## Resumo Executivo

Após análise completa de **todo o sistema** (frontend, backend, banco de dados, infraestrutura), foram identificados **70+ problemas** organizados em 6 categorias. Este plano apresenta as correções e melhorias em **5 fases**, ordenadas por prioridade e impacto.

---

## DIAGNÓSTICO GERAL

### O que está BOM no sistema:
- Arquitetura moderna e bem estruturada (React + tRPC + Drizzle ORM)
- Stack tecnológica sólida (TypeScript end-to-end, Zod validation)
- Sistema de permissões granular por usuário
- Separação de responsabilidades frontend/backend
- UI com componentes shadcn/ui bem implementados
- Dashboard adaptativo baseado em permissões do usuário
- Sistema de cálculo de custos multi-moeda (BRL/USD)
- Autenticação JWT com cookies HttpOnly
- Lazy loading de conexão com banco de dados
- useMemo usado corretamente no Dashboard

### O que precisa MELHORAR:
- Segurança (credenciais expostas, validação fraca)
- Performance (N+1 queries, agregações no cliente, sem paginação)
- Código duplicado massivamente (routers.ts duplica 3 routers inteiros)
- Falta de transações no banco de dados (operações multi-step sem rollback)
- Arquivos mortos no repositório
- Console.logs de debug em produção
- Script de índices com nomes de colunas errados
- Funcionalidades incompletas (email, percentual hardcoded)

---

## FASE 1 - SEGURANÇA E BUGS CRÍTICOS (Prioridade: URGENTE)

### 1.1 Remover credenciais expostas no código-fonte
**Arquivos afetados:**
- `create-admin.ts:5` - URL do banco hardcoded como fallback
- `create-admin.ts:12,41` - Senha admin `admin123` hardcoded e logada no console

**Ação:**
- Remover fallback de DATABASE_URL do create-admin.ts
- Exigir variável de ambiente para senha do admin
- Remover console.log que imprime a senha

### 1.2 Corrigir validação de entrada em campos numéricos
**Arquivos afetados:**
- `server/routers/orders.router.ts:16-23` - quantity e unitPriceUSD sem min/max
- `server/routers/products.router.ts:40-52` - averageCostUSD pode ser negativo
- `server/routers/importations.router.ts:74-101` - exchangeRate, taxas e quantidades sem validação

**Ação:**
- Adicionar `.min(0)` ou `.positive()` em todos campos monetários
- Adicionar `.int().positive()` em campos de quantidade
- Adicionar `.min(0).max(100)` em campos de taxa/percentual
- Validar exchangeRate com `.positive()`

### 1.3 Corrigir race condition na criação de usuários
**Arquivo:** `server/routers.ts:121-141`

**Ação:**
- Adicionar lock ou constraint unique + try/catch para evitar criação simultânea de múltiplos admins
- Usar transação para verificar e criar atomicamente

### 1.4 Adicionar transações em operações multi-step
**Arquivos afetados:**
- `server/routers/importations.router.ts:187-200` - delivery/revert sem transação
- `server/routers/importations.router.ts:308-337` - delete sem transação (reversão parcial possível)
- `server/importationHelpers.ts` - processamento de delivery

**Ação:**
- Envolver operações de delivery, revert e delete em transações do banco
- Se qualquer etapa falhar, fazer rollback completo
- Adicionar try-catch com logging adequado

### 1.5 Remover console.logs sensíveis de autenticação
**Arquivo:** `server/routers.ts:34-77`

**Ação:**
- Remover `console.log` que expõe tentativas de login, validade de senha, e dados de cookie
- Substituir por logging estruturado via Winston (já configurado)

---

## FASE 2 - PERFORMANCE E BANCO DE DADOS (Prioridade: ALTA)

### 2.1 Eliminar N+1 queries nas importações
**Arquivo:** `server/routers/importations.router.ts:15-37`

**Problema:** Para cada importação, faz 1 query adicional para buscar items. Com 100 importações = 101 queries.

**Ação:**
- Substituir `Promise.all(imports.map(async => getItems))` por um único JOIN
- Usar `db.select().from(importations).leftJoin(importationItems)` com agrupamento
- Ou buscar todos items de uma vez e agrupar em memória (batch query)

### 2.2 Otimizar dashboard com agregações no banco
**Arquivo:** `server/routers/dashboard.router.ts:7-63`

**Problema:** Carrega TODOS os produtos e importações na memória para calcular estatísticas simples.

**Ação:**
- Substituir `listProducts()` + `.reduce()` por queries SQL com `SUM()`, `COUNT()`, `AVG()`
- Usar `db.select({ total: sql<number>sum(products.currentStock) })`
- Calcular lowStockProducts com `WHERE currentStock <= minStock`

### 2.3 Corrigir script de índices (nomes de colunas errados)
**Arquivo:** `scripts/add-indexes.ts:22-125`

**Problema:** O script usa nomes snake_case (`current_stock`, `supplier_id`, `import_date`) mas o banco usa camelCase (`currentStock`, `supplierId`, `importDate`) conforme definido no schema Drizzle.

**Ação:**
- Corrigir TODOS os nomes de colunas no script:
  - `current_stock` → `"currentStock"`
  - `supplier_id` → `"supplierId"`
  - `import_date` → `"importDate"`
  - `importation_id` → `"importationId"`
  - `product_id` → `"productId"`
  - `movement_date` → remover (coluna não existe, é `createdAt`)
  - `order_date` → remover (coluna não existe, é `createdAt`)
  - `order_id` → `"orderId"`
  - Tabelas: `importation_items` → `"importationItems"`, `stock_movements` → `"stockMovements"`, `order_items` → `"orderItems"`

### 2.4 Otimizar getProductsWithAggregates
**Arquivo:** `server/db.ts:271-342`

**Problema:** Faz 4 queries separadas quando 1 query com sub-queries poderia resolver.

**Ação:**
- Consolidar em 1-2 queries com LEFT JOINs e sub-selects
- Usar CTEs (Common Table Expressions) para cálculos intermediários

### 2.5 Adicionar paginação no backend
**Arquivos afetados:**
- `server/routers/importations.router.ts` - list retorna TUDO
- `server/db.ts` - listProducts retorna TUDO
- `server/routers/orders.router.ts` - list retorna TUDO

**Ação:**
- Adicionar parâmetros `page` e `pageSize` em todas as queries de listagem
- Retornar `{ items, total, page, pageSize }` para suportar paginação no frontend
- Implementar cursor-based ou offset pagination

---

## FASE 3 - CÓDIGO LIMPO E REFATORAÇÃO (Prioridade: MÉDIA)

### 3.1 Remover arquivo duplicado `server/routers.ts`
**Problema GRAVE:** O arquivo `server/routers.ts` (500+ linhas) duplica INTEGRALMENTE os seguintes routers que já existem separados:
- `server/routers/auth.router.ts`
- `server/routers/users.router.ts`
- `server/routers/suppliers.router.ts`

Além disso, importa e usa os routers modulares para products, orders, importations, stock e dashboard.

**Ação:**
- Extrair auth e suppliers para routers modulares (`auth.router.ts`, `suppliers.router.ts`) se ainda não cobertos
- Substituir `routers.ts` por um `routers/index.ts` que apenas agrega os módulos
- Deletar as duplicações

### 3.2 Remover arquivos mortos
**Arquivos para deletar:**
- `client/src/pages/Produtos.old.tsx` - backup antigo
- `client/src/pages/Galeria.old.txt` - backup antigo

### 3.3 Extrair utilitários compartilhados
**Problema:** `centsToDecimal` e `decimalToCents` duplicados em múltiplos routers.

**Ação:**
- Criar `shared/utils/currency.ts` com funções de conversão
- Importar em todos os routers que usam

### 3.4 Remover console.logs de debug
**Arquivos afetados:**
- `client/src/pages/DetalhesProduto.tsx` - logs de URL e path
- `client/src/pages/EditarProduto.tsx` - logs de debug
- `client/src/pages/Galeria.tsx` - logs de carregamento
- `client/src/pages/ImportarExcel.tsx` - logs de processamento
- `server/routers.ts:34-77` - logs de autenticação

**Ação:**
- Remover todos os `console.log` de debug
- Para server: usar Winston logger com levels adequados

### 3.5 Remover código comentado
**Arquivo:** `server/routers/products.router.ts:81-84`
- Bloco comentado sobre "automatic price update logic"

**Ação:**
- Deletar código comentado (histórico está no Git)

### 3.6 Corrigir type safety - remover `as any`
**Arquivo:** `server/db.ts:103,147,489,511,520`

**Ação:**
- Substituir `as any` por tipos corretos do Drizzle
- Criar interfaces tipadas para os objetos de update

---

## FASE 4 - FRONTEND E UX (Prioridade: MÉDIA)

### 4.1 Adicionar paginação nas listagens
**Arquivos afetados:**
- `client/src/pages/Produtos.tsx` - lista sem paginação
- `client/src/pages/Fornecedores.tsx` - lista sem paginação
- `client/src/pages/Usuarios.tsx` - tabela sem paginação
- `client/src/pages/Estoque.tsx` - lista sem paginação

**Ação:**
- Implementar componente de paginação reutilizável
- Integrar com backend paginado (Fase 2.5)
- Padrão: 20 items por página com seletor

### 4.2 Corrigir valor hardcoded no Dashboard
**Arquivo:** `client/src/pages/Home.tsx:113`

**Problema:** `+20.1% em relação ao mês anterior` é texto estático, não calculado.

**Ação:**
- Calcular percentual real comparando mês atual vs anterior
- Usar dados de `stats.monthlyStats` para o cálculo
- Mostrar seta para cima/baixo baseado no resultado

### 4.3 Substituir `window.confirm()` por AlertDialog
**Arquivo:** `client/src/pages/Produtos.tsx:178`

**Problema:** Usa `window.confirm()` nativo em vez do AlertDialog do shadcn/ui.

**Ação:**
- Substituir por componente `AlertDialog` consistente com o resto do app
- Incluir mensagem clara sobre o que será deletado

### 4.4 Corrigir bug de print assíncrono
**Arquivo:** `client/src/pages/Pedidos.tsx:222-228`

**Problema:** `w.onload` é setado DEPOIS de `w.document.close()`, o evento pode já ter disparado.

**Ação:**
- Mover `w.onload = () => w.print()` para ANTES de `w.document.write()`
- Ou usar `setTimeout(() => w.print(), 500)` como fallback seguro

### 4.5 Corrigir erro de upload de imagem assíncrono
**Arquivo:** `client/src/pages/NovoProduto.tsx:34-50`

**Problema:** O `try/catch` não captura erros de `mutateAsync()` dentro do callback do FileReader.

**Ação:**
- Usar Promise wrapper para FileReader
- Mover upload para async/await puro com error handling correto

### 4.6 Implementar busca por nome do fornecedor
**Arquivo:** `client/src/pages/Importacoes.tsx:644`

**Problema:** Search só filtra por invoiceNumber e supplierId, mas não pelo nome do fornecedor.

**Ação:**
- Incluir `supplierName` no filtro de busca
- Fazer match case-insensitive

### 4.7 Refatorar funções de impressão duplicadas
**Arquivo:** `client/src/pages/Importacoes.tsx:165-637`

**Problema:** `handlePrintPurchaseOrder()` e `handlePrintInternal()` têm ~200 linhas quase idênticas.

**Ação:**
- Criar função base `generatePrintHTML(type: 'purchase' | 'internal', data)`
- Extrair estilos CSS comuns
- Variar apenas o conteúdo específico de cada tipo

### 4.8 Carregar taxa de câmbio padrão do servidor
**Arquivo:** `client/src/pages/NovaImportacao.tsx:64-67`

**Problema:** Exchange rate hardcoded como `5.46` e taxas como `60` e `18`.

**Ação:**
- Carregar valores padrão da tabela `taxConfig` via API
- Usar os valores da config ativa como defaults do formulário
- Já existe lógica parcial (linhas 84-92) mas o fallback é hardcoded

### 4.9 Adicionar validação de formulário mais robusta
**Arquivos afetados:**
- `NovoProduto.tsx` - falta validação de SKU, NCM
- `NovaImportacao.tsx` - permite valores negativos
- `Usuarios.tsx` - sem campo de confirmação de senha

**Ação:**
- Adicionar campo "confirmar senha" na criação de usuário
- Validar formato NCM (8 dígitos numéricos)
- Validar unicidade de SKU com debounce

### 4.10 Remover funcionalidade fake de email
**Arquivo:** `client/src/pages/Pedidos.tsx:389-394`

**Problema:** Botão "Enviar por Email" mostra `window.alert('em desenvolvimento')`.

**Ação:**
- Opção A: Remover botão até feature estar pronta
- Opção B: Desabilitar com tooltip "Em breve" (mais amigável)

---

## FASE 5 - MELHORIAS DE INFRAESTRUTURA E BOAS PRÁTICAS (Prioridade: NORMAL)

### 5.1 Adicionar foreign key constraints no schema
**Arquivo:** `drizzle/schema.ts`

**Problema:** Nenhuma foreign key é definida no schema. Dados órfãos podem existir.

**Ação:**
- Adicionar `.references(() => table.column)` nas colunas de FK:
  - `importationItems.importationId` → `importations.id`
  - `importationItems.productId` → `products.id`
  - `orders.userId` → `users.id`
  - `orders.supplierId` → `suppliers.id`
  - `orderItems.orderId` → `orders.id`
  - `orderItems.productId` → `products.id`
  - `stockMovements.productId` → `products.id`
  - `stockMovements.importationId` → `importations.id`
- Gerar e aplicar migration

### 5.2 Padronizar tratamento de erros
**Problema:** Backend usa mix de `throw new Error()`, `return []`, `console.error`

**Ação:**
- Criar classes de erro tipadas (NotFoundError, ValidationError, AuthError)
- Usar TRPCError do tRPC para erros padronizados
- Padronizar: routers lançam erros, services retornam Result types

### 5.3 Melhorar rate limiting
**Arquivo:** `server/_core/middleware/rateLimiter.ts:41-44`

**Problema:** Rate limiting skipado para TODOS endpoints autenticados.

**Ação:**
- Aplicar rate limiting a endpoints autenticados também
- Usar limites diferentes:
  - Público (login): 5 req/min
  - Autenticado (leitura): 100 req/min
  - Autenticado (escrita): 30 req/min

### 5.4 Configurar CORS adequadamente
**Arquivo:** `server/_core/index.ts`

**Ação:**
- Adicionar middleware CORS com origins permitidos
- Configurar para ambiente de desenvolvimento e produção separadamente

### 5.5 Adicionar testes automatizados
**Problema:** Vitest está configurado mas nenhum teste foi encontrado.

**Ação:**
- Criar testes para funções críticas:
  - Cálculos de custo (centsToDecimal, currency conversions)
  - Validações de input (Zod schemas)
  - Lógica de permissões
  - Processamento de delivery/revert

### 5.6 Aumentar custo do bcrypt
**Arquivo:** `server/routers.ts:149` (e `auth.router.ts`)

**Ação:**
- Aumentar de 10 para 12 rounds (recomendação moderna OWASP)

### 5.7 Melhorar logging de operações críticas
**Arquivos afetados:**
- `server/routers/importations.router.ts:186-200`
- `server/importationHelpers.ts`

**Ação:**
- Adicionar logging via Winston para:
  - Delivery de importações
  - Reversão de delivery
  - Exclusão de registros
  - Movimentações de estoque
- Formato: `[Module] Action: details {userId, entityId, timestamp}`

---

## RESUMO DE IMPACTO

| Fase | Items | Impacto | Esforço |
|------|-------|---------|---------|
| **Fase 1** - Segurança | 5 items | CRÍTICO - Previne brechas e perda de dados | Médio |
| **Fase 2** - Performance | 5 items | ALTO - Melhora velocidade 5-10x em listagens | Alto |
| **Fase 3** - Código Limpo | 6 items | MÉDIO - Reduz manutenção e bugs futuros | Médio |
| **Fase 4** - Frontend/UX | 10 items | MÉDIO - Melhora experiência do usuário | Alto |
| **Fase 5** - Infraestrutura | 7 items | NORMAL - Prepara para escala e manutenção | Alto |

### Métricas esperadas após implementação:
- **Queries no banco**: Redução de ~70% (N+1 → batch)
- **Tempo de resposta**: Dashboard 3-5x mais rápido
- **Código duplicado**: Eliminação de ~600 linhas
- **Vulnerabilidades**: 0 credenciais expostas
- **Type safety**: 100% sem `as any`

---

## ORDEM DE IMPLEMENTAÇÃO RECOMENDADA

```
Semana 1: Fase 1 (Segurança) - CRÍTICO
Semana 2: Fase 2.1-2.3 (Performance - Quick wins)
Semana 3: Fase 3.1-3.4 (Cleanup - Duplicações e mortos)
Semana 4: Fase 2.4-2.5 + Fase 4.1 (Paginação end-to-end)
Semana 5: Fase 4.2-4.10 (UX improvements)
Semana 6: Fase 5 (Infraestrutura e boas práticas)
```

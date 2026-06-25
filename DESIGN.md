---
name: Import Manager
description: Painel de gestão de importação — denso em dados, limpo e utilitário.
colors:
  background: "#ffffff"
  foreground: "oklch(0.235 0.015 65)"
  primary: "#1d4ed8"
  primary-foreground: "#eff6ff"
  secondary: "oklch(0.98 0.001 286.375)"
  secondary-foreground: "oklch(0.4 0.015 65)"
  muted: "oklch(0.967 0.001 286.375)"
  muted-foreground: "oklch(0.552 0.016 285.938)"
  accent: "oklch(0.967 0.001 286.375)"
  accent-foreground: "oklch(0.141 0.005 285.823)"
  destructive: "oklch(0.577 0.245 27.325)"
  border: "oklch(0.92 0.004 286.32)"
  input: "oklch(0.92 0.004 286.32)"
  ring: "oklch(0.623 0.214 259.815)"
  chart-1: "#93c5fd"
  chart-2: "#3b82f6"
  chart-3: "#2563eb"
  chart-4: "#1d4ed8"
  chart-5: "#1e40af"
typography:
  heading:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "normal"
rounded:
  sm: "6.4px"
  md: "8.4px"
  lg: "10.4px"
  xl: "14.4px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "#1d4ed8e6"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "36px"
  button-ghost:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "36px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "4px 12px"
  badge:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  card:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "24px"
---

# Design System: Import Manager

## 1. Overview

**Creative North Star: "O Painel Operacional Confiável"**

O Import Manager é uma ferramenta de trabalho, não uma vitrine. Quem usa passa horas lendo números — custos em USD/BRL, impostos, estoque, movimentações. O sistema serve esses dados: deve ser **limpo, denso e previsível**, com a interface desaparecendo para que a informação apareça. A cor age como ferramenta (azul = ação, vermelho = perigo, cinza = contexto), nunca como decoração.

O estado atual é o tema **shadcn/ui "new-york"** sem customização: base neutra, um único acento azul e tipografia do sistema. Isso é funcional, porém **genérico** — não tem identidade própria nem regras de consistência, e é justamente por isso que telas diferentes "parecem" diferentes. Este documento existe para **travar os tokens e as regras**: a partir daqui, tudo se reutiliza, nada se reinventa por tela.

**Key Characteristics:**
- Utilitário e denso — otimizado para leitura de dados, não para impacto visual.
- Um único acento (azul) com papel funcional, nunca decorativo.
- Quase plano: profundidade vem de bordas e sombras sutis, não de elevação dramática.
- Consistência por token: cores, raios e tipografia saem sempre das mesmas variáveis.

## 2. Colors

Paleta neutra fria (zinc) com um único acento azul corporativo. Suporta **light e dark mode** via classe `.dark` (tokens espelhados em `client/src/index.css`).

### Primary
- **Azul de Ação** (#1d4ed8 · Tailwind blue-700): a única cor de marca. Usada em botões primários, links, seleção, foco (ring) e séries de gráfico. É o que o usuário clica.

### Neutral
- **Tinta** (oklch 0.235 0.015 65): texto principal sobre fundo claro — quase preto, levemente quente.
- **Branco** (#ffffff): fundo de página, cards e popovers.
- **Cinza de Apoio / muted-foreground** (oklch 0.552): textos secundários, legendas, placeholders. **Atenção ao contraste** — ver Do's & Don'ts.
- **Superfície muted/accent** (oklch 0.967): fundos de hover, zebra de tabela, áreas de descanso.
- **Borda / input** (oklch 0.92): divisórias e contornos de campo. Sutil de propósito.

### Tertiary (estado)
- **Vermelho de Perigo / destructive** (oklch 0.577 0.245 27.325): exclusões, erros, alertas de estoque negativo. Nunca decorativo.

### Named Rules
**A Regra da Voz Única.** O azul é a única cor de marca. Em qualquer tela ele aparece em **≤10%** da superfície — botão primário, link ativo, foco. Encheu de azul, perdeu o significado de "clique aqui".

**A Regra Sem Hex Solto.** Toda cor sai de um token semântico (`bg-primary`, `text-muted-foreground`, `border-border`). `bg-blue-500` ou `#xxxxxx` hardcoded em componente é **proibido** — quebra o dark mode e a consistência.

## 3. Typography

**Fonte:** **Inter** (`Inter, ui-sans-serif, system-ui, sans-serif`) — carregada via Google Fonts com `display=swap`; migrável para self-host (`@fontsource-variable/inter`) na fase de performance.

**Character:** neutra, profissional e altamente legível em UI densa de dados. Suporta números tabulares — use `tabular-nums` em colunas de valores (custo, qtd, imposto).

### Hierarchy
- **Heading** (600, 1.5rem/24px, lh 1.25): títulos de página e seção.
- **Subheading** (600, 1.125rem/18px): títulos de card e blocos.
- **Body** (400, 0.875rem/14px, lh 1.5): texto e dados padrão. É o tamanho-base da UI (`text-sm`).
- **Label** (500, 0.75rem/12px): badges, legendas, cabeçalhos de tabela, metadados.
- **Numérico** (tabular): preços, quantidades e impostos devem usar `font-variant-numeric: tabular-nums` para alinhar colunas e não "dançar".

### Named Rules
**A Regra da Escala Fechada.** Os tamanhos de texto saem desta escala (12 / 14 / 18 / 24). Inventar `text-[15px]` ou `text-3xl` solto numa tela é o que faz o sistema parecer remendado.

## 4. Elevation

Sistema **quase plano**. A profundidade vem de **bordas** (1px, `border-border`) e de **sombras sutis** — não de elevação dramática. Cards e superfícies descansam no plano; sombra só aparece para destacar o que flutua (popover, dropdown, dialog, hover de campo).

### Shadow Vocabulary
- **shadow-xs** (`0 1px 2px 0 rgb(0 0 0 / 0.05)`): inputs, botões outline. Quase imperceptível — dá só uma borda de luz.
- **shadow-sm** (`0 1px 3px 0 rgb(0 0 0 / 0.1)`): cards em repouso.
- **shadow-md / lg**: reservadas para camadas que flutuam (popover, dropdown, dialog, sheet).

### Named Rules
**A Regra Plano-por-Padrão.** Superfícies são planas em repouso. Sombra é resposta a estado (flutuar, hover, foco), nunca enfeite. Sombra pesada em card estático faz a UI parecer 2014.

## 5. Components

Base: **shadcn/ui "new-york"** com `class-variance-authority` (cva). Variantes são API, não improviso — adicione variante no `cva`, nunca uma classe solta no uso.

### Buttons
- **Shape:** cantos suaves (rounded-md, 8.4px).
- **Tamanhos:** `sm` (h-8/32px), `default` (h-9/36px), `lg` (h-10/40px), `icon` (quadrado). Texto `text-sm`, peso 500.
- **Primary** (`default`): fundo azul, texto claro; hover escurece para `primary/90`.
- **Secondary:** cinza claro, hover `secondary/80`.
- **Outline:** borda + fundo transparente + shadow-xs; hover preenche com `accent`.
- **Ghost:** sem fundo; hover preenche com `accent`. Para ações terciárias.
- **Destructive:** vermelho; para exclusões/ações perigosas.
- **Link:** parece link, sublinha no hover.
- **Foco:** anel de 3px (`ring-ring/50`) — nunca remover.

### Inputs / Fields
- **Style:** altura 36px (h-9), rounded-md, borda `border-input`, fundo transparente, `text-base` no mobile / `text-sm` no desktop (evita zoom no iOS), shadow-xs.
- **Focus:** borda vira `ring` + anel de 3px.
- **Error:** `aria-invalid` pinta borda e anel de `destructive`.
- **Disabled:** opacidade 50% + cursor bloqueado.

### Badges
- **Style:** rounded-md, px-2 py-0.5, text-xs peso 500. Variantes: default (azul), secondary (cinza), destructive (vermelho), outline.
- **Uso:** status (importação, estoque), contadores, tags. Não usar como botão.

### Cards / Containers
- **Corner:** rounded-xl (14.4px) — o único componente que usa o raio maior.
- **Background:** `bg-card` (branco), texto `card-foreground`.
- **Shadow:** shadow-sm em repouso.
- **Padding interno:** 24px.

### Navigation
- **Sidebar** (`components/ui/sidebar`) é a navegação primária. Item ativo destacado por `sidebar-primary` (azul). Mantenha posição e estilo idênticos em todas as telas.

### Data Tables (componente-assinatura)
Tabelas são o coração do produto (produtos, importações, estoque). Regras: cabeçalho em `label` (12px/500), números **tabular** e alinhados à direita, zebra opcional com `muted`, linha com hover em `accent`, ações em `ghost`/`icon`. Listas com 50+ linhas devem ser virtualizadas.

## 6. Do's and Don'ts

### Do:
- **Do** usar tokens semânticos sempre: `bg-primary`, `text-muted-foreground`, `border-border`, `bg-card`. Eles já resolvem light/dark.
- **Do** manter **um único** botão primário (azul) por tela; o resto é secondary / outline / ghost.
- **Do** usar `rounded-md` em botões, inputs e badges; `rounded-xl` só em cards. Um raio por papel.
- **Do** usar números tabulares e alinhamento à direita em toda coluna de valor (custo, qtd, imposto).
- **Do** manter a escala de texto fechada (12 / 14 / 18 / 24) e o ritmo de espaçamento de 4/8px.
- **Do** garantir contraste: texto de corpo ≥ 4,5:1. O `muted-foreground` no fundo branco está no limite — **não** use para texto longo, só para metadados curtos.

### Don't:
- **Don't** hardcodar cor (`bg-blue-500`, `#1d4ed8`, `style={{color:...}}`) em componente. Quebra o dark mode e a consistência.
- **Don't** inventar tamanho de fonte, raio ou espaçamento fora da escala (`text-[15px]`, `rounded-[7px]`). É o que faz o sistema parecer remendado.
- **Don't** criar variante de botão/badge nova fora do `cva` — estenda o `cva`.
- **Don't** usar emoji como ícone. Use Lucide / SVG, tamanho e traço consistentes.
- **Don't** empilhar sombra pesada em card estático. Plano por padrão; sombra é resposta a estado.
- **Don't** remover o anel de foco (`focus-visible:ring`). Acessibilidade não é opcional.
- **Don't** encher a tela de azul. A Regra da Voz Única: ≤10% da superfície.

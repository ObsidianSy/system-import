# Import Manager

Sistema de gestão para operações de importação: cadastro de fornecedores,
acompanhamento de importações, controle de produtos e estoque, pedidos e
relatórios de venda.

Aplicação full-stack em TypeScript, com API tipada de ponta a ponta e
banco PostgreSQL versionado por migrations.

## O problema

Uma operação de importação vive em planilhas espalhadas: uma para o pedido ao
fornecedor, outra para o custo que chegou, outra para o estoque, outra para a
venda. Os números divergem entre elas e ninguém sabe qual está certo.

O sistema unifica esse fluxo em um só lugar, com o dado entrando uma vez e
sendo lido por todas as telas a partir da mesma fonte.

## Como está organizado

O contrato entre frontend e backend é o próprio TypeScript. As rotas são
definidas com tRPC no servidor e consumidas no cliente com os tipos já
resolvidos, sem geração de código nem cliente HTTP escrito à mão. Mudar a
assinatura de um procedimento quebra o build de quem consome, na hora.

Os procedimentos ficam separados por domínio, um router por área:

    server/routers/
      auth.router.ts          autenticação e sessão
      dashboard.router.ts     indicadores da home
      importations.router.ts  importações e seus itens
      orders.router.ts        pedidos a fornecedor
      products.router.ts      catálogo de produtos
      stock.router.ts         movimentações de estoque
      suppliers.router.ts     fornecedores
      users.router.ts         usuários e permissões
      external.router.ts      integração de vendas externas

O schema do banco é declarado em Drizzle e as alterações são aplicadas por
migrations numeradas em `drizzle/`, então o estado do banco é reproduzível a
partir do repositório.

## Stack

Frontend
- React 18, TypeScript, Vite
- TailwindCSS e shadcn/ui (Radix)
- TanStack Query para cache e sincronização de estado servidor
- wouter para rotas, react-hook-form e Zod para formulários
- Recharts nos relatórios

Backend
- Node com Express e tRPC
- Drizzle ORM sobre PostgreSQL
- JWT com jose, bcryptjs, login social via Google OAuth
- AWS S3 com URLs pré-assinadas para as imagens do catálogo
- Winston para log estruturado
- express-rate-limit protegendo os endpoints de autenticação

Infra
- Dockerfile para build de produção
- ESLint, Prettier e checagem de tipos no CI local

## Como rodar

Requisitos: Node 20 ou superior, pnpm e uma instância PostgreSQL.

    git clone https://github.com/ObsidianSy/system-import.git
    cd system-import
    pnpm install

Copie o arquivo de exemplo e preencha as variáveis:

    cp .env.example .env

As obrigatórias são `DATABASE_URL` e `JWT_SECRET`. As de OAuth e S3 podem
ficar vazias em desenvolvimento; sem elas o login social e o upload de
imagem ficam desabilitados, o resto funciona.

Aplique o schema e suba o servidor:

    pnpm db:push
    pnpm dev

A aplicação sobe em `http://localhost:3000`.

## Comandos

    pnpm dev          servidor de desenvolvimento com recarga
    pnpm build        build de produção (cliente e servidor)
    pnpm start        executa o build
    pnpm check        checagem de tipos, sem emitir
    pnpm lint         ESLint
    pnpm db:push      gera e aplica as migrations

## Estrutura

    client/src/       aplicação React
      pages/          25 telas do sistema
      components/     componentes compartilhados e primitivos de UI
      hooks/          hooks de dados e de formulário
    server/
      _core/          bootstrap do servidor, middlewares, tipos
      routers/        procedimentos tRPC por domínio
      services/       regras que não pertencem a um router só
    shared/           schema Drizzle e tipos usados pelos dois lados
    drizzle/          migrations versionadas
    docs/             notas de arquitetura e planos de refatoração

## Segurança

O arquivo `SECURITY.md` traz a checklist aplicada antes de cada deploy.
Os pontos já implementados no código:

- Rate limit de 5 tentativas por 15 minutos nos endpoints de login
- Senhas com hash bcrypt, nunca em texto puro
- Sessão por JWT assinado, com secret obrigatório na inicialização
- Uploads via URL pré-assinada, sem expor credencial da AWS ao cliente
- Modo de login automático de desenvolvimento desligado por padrão

## Estado atual

O sistema está em uso e as funcionalidades listadas acima estão implementadas.
O que ainda falta, declarado por honestidade:

- Não há suíte de testes automatizados. A validação hoje é manual e essa é a
  próxima dívida a pagar; o Vitest já está configurado no projeto.
- A tela de relatórios cobre os indicadores principais, mas ainda não permite
  exportação.

## Licença

MIT

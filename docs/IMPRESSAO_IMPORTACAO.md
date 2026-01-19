# Funcionalidade de Impressão de Importação

## Visão Geral
Foi implementada uma funcionalidade completa de impressão de relatórios de importação com **múltiplas opções de formato**, permitindo gerar documentos formatados para impressão ou PDF conforme a necessidade.

## Recursos Implementados

### 1. Dialog de Seleção de Tipo de Impressão
Antes de gerar a impressão, o usuário escolhe entre duas opções:

#### Opção 1: Pedido de Compra
- Formato formal e limpo
- Ideal para enviar ao fornecedor
- Inclui informações essenciais
- Foco em valores e totais
- Layout profissional e corporativo

#### Opção 2: Acompanhamento Interno
- Formato detalhado com fotos dos produtos
- Inclui SKUs dos produtos
- Ideal para controle interno e conferência
- Visual mais completo para gestão
- Facilita identificação física dos produtos

### 2. Botão de Impressão na Página de Detalhes
**Localização**: Página de detalhes da importação
- Botão "Imprimir" na barra de ações do cabeçalho
- Abre dialog com opções de tipo de impressão
- Gera relatório conforme seleção

**Arquivo**: [client/src/pages/DetalhesImportacao.tsx](../client/src/pages/DetalhesImportacao.tsx)

### 3. Impressão Rápida na Lista
**Localização**: Página de listagem de importações
- Ícone de impressora em cada linha da tabela
- Abre dialog de seleção antes de imprimir
- Não interrompe a navegação

**Arquivo**: [client/src/pages/Importacoes.tsx](../client/src/pages/Importacoes.tsx)

## Tipos de Impressão

O relatório de impressão inclui:

### Informações Básicas
- Número da fatura
- Status da importação
- Data da importação
- Nome do fornecedor
- Método de envio (se disponível)
- Número de rastreamento (se disponível)

### Resumo Financeiro (respeitando permissões)
- Subtotal em USD (produtos)
- Frete em USD
- Total em USD
- Taxa de câmbio
- Custo total em BRL

### Impostos e Taxas (se permitido)
- Imposto de importação
- ICMS
- Outras taxas

### Listagem de Produtos
Tabela completa com:
- Nome e descrição do produto
- Cor e tamanho (se aplicável)
- Quantidade
- Preço unitário USD (se permitido)
- Total USD (se permitido)
- Custo unitário BRL (se permitido)
- Custo total BRL (se permitido)

### Totais Consolidados
- Custo total em BRL
- Total de itens/unidades

### Observações
- Notas adicionais da importação (se houver)

### Rodapé
- Data e hora de geração do relatório

## Controle de Permissões

O relatório respeita automaticamente as permissões do usuário:
- `canViewCostUSD`: Exibe valores em dólar
- `canViewCostBRL`: Exibe valores em reais
- `canViewImportTaxes`: Exibe detalhes de impostos

Usuários sem permissão não verão essas informações no relatório.

## Formatação

### Estilo de Impressão
- Margens: 1cm em todas as bordas
- Fonte: Arial, sans-serif
- Tamanho base: 12px
- Layout responsivo para impressão

### Cores e Badges
Status da importação com cores identificáveis:
- **Pendente**: Amarelo
- **Em Trânsito**: Azul
- **Na Alfândega**: Roxo
- **Entregue**: Verde
- **Cancelada**: Vermelho

## Fluxo de Uso

### Impressão da Página de Detalhes
1. Usuário acessa detalhes de uma importação
2. Clica no botão "Imprimir"
3. **Dialog é aberto com duas opções:**
   - Pedido de Compra
   - Acompanhamento Interno
4. Usuário seleciona o tipo desejado
5. Clica em "Imprimir"
6. Nova aba é aberta com relatório formatado
7. Janela de impressão aparece automaticamente
8. Usuário pode imprimir ou salvar como PDF

### Impressão Rápida da Lista
1. Usuário visualiza lista de importações
2. Clica no ícone de impressora na linha desejada
3. **Dialog é aberto com duas opções:**
   - Pedido de Compra
   - Acompanhamento Interno
4. Usuário seleciona o tipo desejado
5. Clica em "Imprimir"
6. Nova aba é aberta com relatório formatado
7. Janela de impressão aparece automaticamente
8. A lista permanece aberta (não navega para outra página)

## Casos de Uso

### Quando usar "Pedido de Compra":
- ✅ Enviar para fornecedor
- ✅ Arquivo formal para documentação
- ✅ Compartilhar com contador/financeiro
- ✅ Anexar em emails oficiais
- ✅ Quando não precisa de fotos

### Quando usar "Acompanhamento Interno":
- ✅ Conferência de produtos ao receber importação
- ✅ Identificação física dos itens
- ✅ Controle de estoque
- ✅ Verificação de SKUs
- ✅ Trabalho de equipe de estoque/logística
- ✅ Treinamento de novos funcionários

## Observações Técnicas

### Implementação
- Dialog com RadioGroup para seleção de tipo
- Geração HTML dinâmica via JavaScript
- CSS inline para garantir formatação correta
- `window.open()` para nova janela
- `window.print()` automático após carregamento
- Funções separadas para cada tipo de impressão

### Fotos na Impressão Interna
- As fotos são carregadas dos dados da importação
- Fallback para placeholder quando não há imagem
- Tamanho fixo 80x80px para uniformidade
- Border radius e borda para melhor apresentação

### SKUs na Impressão Interna
- SKUs exibidos em fonte menor abaixo do nome
- Cor cinza (#666) para diferenciação visual
- Facilita conferência rápida do produto

### Compatibilidade
- Funciona em todos os navegadores modernos
- Suporte para salvar como PDF (recurso nativo do navegador)
- Layout otimizado para papel A4

### Performance
- Dados carregados da query existente
- Sem requisições adicionais ao servidor
- Processamento no cliente

## Manutenção Futura

### Possíveis Melhorias
1. ✅ **IMPLEMENTADO:** Múltiplos tipos de impressão
2. ✅ **IMPLEMENTADO:** Fotos e SKUs na impressão interna
3. Templates personalizáveis de impressão
4. Exportação direta para PDF no servidor
5. Impressão em lote de múltiplas importações
6. Logotipo da empresa no cabeçalho
7. QR code com link para detalhes online
8. Opção de enviar relatório por email
9. Salvar preferência do usuário (último tipo selecionado)
10. Visualização prévia antes de imprimir

### Customização
Para alterar o layout ou conteúdo:
1. Editar função `handlePrintPurchaseOrder` para tipo "Pedido de Compra"
2. Editar função `handlePrintInternal` para tipo "Acompanhamento Interno"
3. Modificar CSS inline nos templates HTML
4. Ajustar RadioGroup no Dialog para adicionar novos tipos

## Exemplo de Uso (Código)

### Dialog de Seleção
```typescript
// Estado para controlar dialog e tipo selecionado
const [showPrintDialog, setShowPrintDialog] = useState(false);
const [printType, setPrintType] = useState<"purchase" | "internal">("purchase");

// Abrir dialog
const handlePrint = () => {
  setShowPrintDialog(true);
};

// Executar impressão
const executePrint = () => {
  setShowPrintDialog(false);
  if (printType === "purchase") {
    handlePrintPurchaseOrder();
  } else {
    handlePrintInternal();
  }
};
```

### Botão na Interface
```typescript
<Button
  variant="outline"
  size="sm"
  onClick={handlePrint}
>
  <Printer className="h-3 w-3 mr-1" />
  Imprimir
</Button>
```

### Dialog Component
```typescript
<Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Opções de Impressão</DialogTitle>
      <DialogDescription>
        Escolha o tipo de impressão que deseja gerar
      </DialogDescription>
    </DialogHeader>
    <RadioGroup value={printType} onValueChange={setPrintType}>
      <div className="flex items-start space-x-3">
        <RadioGroupItem value="purchase" id="purchase" />
        <Label htmlFor="purchase">
          <div className="font-semibold">Pedido de Compra</div>
          <div className="text-sm text-muted-foreground">
            Formato formal para fornecedor
          </div>
        </Label>
      </div>
      <div className="flex items-start space-x-3">
        <RadioGroupItem value="internal" id="internal" />
        <Label htmlFor="internal">
          <div className="font-semibold">Acompanhamento Interno</div>
          <div className="text-sm text-muted-foreground">
            Com fotos e SKUs
          </div>
        </Label>
      </div>
    </RadioGroup>
    <Button onClick={executePrint}>
      <Printer className="h-4 w-4 mr-2" />
      Imprimir
    </Button>
  </DialogContent>
</Dialog>
```

## Suporte

Para dúvidas ou problemas:
1. Verificar permissões do usuário
2. Testar em navegador diferente
3. Verificar bloqueador de pop-ups
4. Consultar console do navegador para erros

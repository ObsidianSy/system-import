export interface ExternalStockData {
  sku: string;
  estoque: number; // quantidade
}

export interface ExternalProductData {
  sku: string;
  produto?: {
    nome?: string;
    categoria?: string;
    tipo_produto?: string;
    unidade_medida?: string;
    ativo?: boolean;
    is_kit?: boolean;
  };
  estoque?: {
    quantidade?: number;
    custo_medio?: number;
  };
  vendas?: {
    total_unidades?: number;
    vendas_7d?: number;
    vendas_30d?: number;
    vendas_90d?: number;
    primeira_venda?: string | null;
    ultima_venda?: string | null;
  };
}

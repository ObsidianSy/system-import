-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS obsidian;

-- 1. Passo 1 – Criar tabela de SKUs do sistema de importação
CREATE TABLE IF NOT EXISTS obsidian.import_itens (
  sku TEXT PRIMARY KEY,
  descricao TEXT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Consulta de ESTOQUE de todos os itens do sistema de importação
-- 2.1. Query base (pode virar VIEW)
CREATE OR REPLACE VIEW obsidian.v_import_estoque_resumo AS
SELECT
  i.sku,
  p.descricao,
  p.categoria,
  p.tipo_produto,
  p.unidade_medida,
  p.ativo,
  p.is_kit,
  p.quantidade       AS estoque_atual,
  p.custo_medio
FROM obsidian.import_itens      i
LEFT JOIN obsidian.v_estoque_api p
       ON p.sku = i.sku
WHERE i.ativo = TRUE
ORDER BY i.sku;

-- 3. Consulta de VENDAS de todos os itens do sistema de importação
-- 3.1. Query agregando vendas por SKU (total + 7/30/90 dias)
CREATE OR REPLACE VIEW obsidian.v_import_vendas_resumo AS
SELECT
  i.sku,

  -- Totais históricos
  COALESCE(SUM(v.quantidade_vendida), 0)                              AS total_unidades_vendidas,
  MIN(v.data_venda)                                                   AS primeira_venda,
  MAX(v.data_venda)                                                   AS ultima_venda,

  -- Janelas de giro
  COALESCE(SUM(v.quantidade_vendida) FILTER (
    WHERE v.data_venda >= CURRENT_DATE - INTERVAL '7 days'
  ), 0) AS vendas_7d,

  COALESCE(SUM(v.quantidade_vendida) FILTER (
    WHERE v.data_venda >= CURRENT_DATE - INTERVAL '30 days'
  ), 0) AS vendas_30d,

  COALESCE(SUM(v.quantidade_vendida) FILTER (
    WHERE v.data_venda >= CURRENT_DATE - INTERVAL '90 days'
  ), 0) AS vendas_90d

FROM obsidian.import_itens i
LEFT JOIN obsidian.vendas v
       ON v.sku_produto = i.sku
      AND (v.status_venda IS NULL OR UPPER(v.status_venda) NOT IN ('CANCELADA','CANCELADO'))
GROUP BY i.sku
ORDER BY i.sku;

-- 4. Consulta COMBINADA: estoque + vendas (all-in-one)
CREATE OR REPLACE VIEW obsidian.v_import_estoque_vendas AS
SELECT
  e.sku,
  e.descricao,
  e.categoria,
  e.tipo_produto,
  e.unidade_medida,
  e.ativo,
  e.is_kit,
  e.estoque_atual,
  e.custo_medio,

  COALESCE(v.total_unidades_vendidas, 0) AS total_unidades_vendidas,
  v.primeira_venda,
  v.ultima_venda,
  COALESCE(v.vendas_7d,  0)             AS vendas_7d,
  COALESCE(v.vendas_30d, 0)             AS vendas_30d,
  COALESCE(v.vendas_90d, 0)             AS vendas_90d

FROM obsidian.v_import_estoque_resumo e
LEFT JOIN obsidian.v_import_vendas_resumo v
       ON v.sku = e.sku
ORDER BY e.sku;

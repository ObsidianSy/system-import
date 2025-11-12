/**
 * Formata um valor em centavos para exibição em Reais
 * @param valueInCents - Valor em centavos (ex: 12345 = R$ 123,45)
 * @returns String formatada em BRL
 */
export function formatCurrency(valueInCents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valueInCents / 100);
}

/**
 * Formata um valor já em reais para exibição
 * @param valueInReais - Valor em reais (ex: 123.45)
 * @returns String formatada em BRL
 */
export function formatCurrencyBRL(valueInReais: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valueInReais);
}

/**
 * Formata um valor em dólares para exibição
 * @param valueInDollars - Valor em dólares (ex: 123.45)
 * @returns String formatada em USD
 */
export function formatCurrencyUSD(valueInDollars: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
  }).format(valueInDollars);
}

/**
 * Calcula o preço de venda baseado no custo médio + margem fixa
 * @param averageCostInCents - Custo médio em centavos
 * @param marginInCents - Margem em centavos (padrão: 500 = R$5,00)
 * @returns Preço de venda em centavos
 */
export function calculateSalePrice(
  averageCostInCents: number, 
  marginInCents: number = 500
): number {
  if (averageCostInCents <= 0) return 0;
  return averageCostInCents + marginInCents;
}

/**
 * Formata porcentagem
 * @param value - Valor decimal (ex: 0.60 = 60%)
 * @returns String formatada
 */
export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

/** Convert cents (integer) to decimal value */
export const centsToDecimal = (cents: number): number => cents / 100;

/** Convert decimal value to cents (integer) */
export const decimalToCents = (decimal: number): number => Math.round(decimal * 100);

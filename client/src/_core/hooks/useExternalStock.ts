import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';

/**
 * Custom hook to fetch and manage external stock data for products.
 * Centralizes the logic for batch fetching external stock and provides
 * a convenient interface for components.
 * 
 * @param skus - Array of SKU strings to fetch stock for
 * @param options - Query options (enabled, refetchInterval, etc.)
 * @returns Object with stock map, loading state, error, and helper functions
 */
export function useExternalStock(skus: string[], options?: { enabled?: boolean; refetchInterval?: number }) {
  const { data: externalStockData, isLoading, error, refetch } = trpc.external.getMultipleSkusStock.useQuery(
    { skus },
    {
      enabled: (options?.enabled ?? true) && skus.length > 0,
      refetchInterval: options?.refetchInterval,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    }
  );

  // Create a Map for O(1) lookups
  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    if (externalStockData) {
      externalStockData.forEach(item => {
        map.set(item.sku, item.estoque);
      });
    }
    return map;
  }, [externalStockData]);

  /**
   * Get stock for a specific SKU with fallback
   * @param sku - The SKU to get stock for
   * @param fallback - Fallback value if SKU not found (defaults to 0)
   */
  const getStock = (sku: string, fallback = 0): number => {
    return stockMap.get(sku) ?? fallback;
  };

  /**
   * Check if a SKU has low stock (below threshold)
   * @param sku - The SKU to check
   * @param threshold - Stock threshold (defaults to 5)
   */
  const isLowStock = (sku: string, threshold = 5): boolean => {
    const stock = getStock(sku);
    return stock > 0 && stock <= threshold;
  };

  /**
   * Check if a SKU is out of stock
   * @param sku - The SKU to check
   */
  const isOutOfStock = (sku: string): boolean => {
    return getStock(sku) === 0;
  };

  return {
    stockMap,
    stockData: externalStockData,
    isLoading,
    error,
    refetch,
    // Helper functions
    getStock,
    isLowStock,
    isOutOfStock,
  };
}

/**
 * Hook to fetch full external product data (stock + sales)
 */
export function useExternalProductData(skus: string[], options?: { enabled?: boolean }) {
  const { data, isLoading, error, refetch } = trpc.external.getMultipleSkusData.useQuery(
    { skus },
    {
      enabled: (options?.enabled ?? true) && skus.length > 0,
      staleTime: 5 * 60 * 1000,
      retry: 2,
    }
  );

  // Create maps for quick lookups
  const dataMap = useMemo(() => {
    const map = new Map<string, any>();
    if (data) {
      data.forEach(item => {
        map.set(item.sku, item);
      });
    }
    return map;
  }, [data]);

  const getProductData = (sku: string): any | undefined => {
    return dataMap.get(sku);
  };

  return {
    dataMap,
    productData: data,
    isLoading,
    error,
    refetch,
    getProductData,
  };
}

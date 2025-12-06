import axios from 'axios';
import { ExternalStockData, ExternalProductData } from '../../shared/externalTypes';
import { withRetry } from '../_core/retry';

// Configuration for the external API
const API_CONFIG = {
  BASE_URL: process.env.EXTERNAL_API_URL || 'https://docker-n8n-webhook.q4xusi.easypanel.host/webhook/a1b2d5s58d6555ewd55g',
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 2,
};

const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Normalizes n8n webhook response format.
 * n8n can return: array, {data: array}, or single object.
 */
function normalizeResponse<T>(data: any): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (data?.data && Array.isArray(data.data)) {
    return data.data;
  }
  if (data && typeof data === 'object') {
    return [data];
  }
  return [];
}

export class ExternalSalesService {
  private client;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Fetches stock data for multiple SKUs at once (simplified response).
   * Uses retry logic with exponential backoff for resilience.
   * 
   * @param skus - Array of SKU strings
   * @returns Array of {sku, estoque} objects
   */
  async getMultipleSkusStock(skus: string[]): Promise<ExternalStockData[]> {
    if (skus.length === 0) {
      return [];
    }

    try {
      if (DEBUG) {
        console.log(`[ExternalSalesService] Fetching stock for ${skus.length} SKUs`);
      }

      const response = await withRetry(
        () => axios.post(API_CONFIG.BASE_URL, { skus }),
        {
          maxRetries: API_CONFIG.MAX_RETRIES,
          timeout: API_CONFIG.TIMEOUT,
          onRetry: (error, attempt, delay) => {
            console.warn(`[ExternalSalesService] Retry ${attempt}/${API_CONFIG.MAX_RETRIES} after ${delay}ms due to:`, error.message);
          },
        }
      );

      const items = normalizeResponse<any>(response.data);

      // Convert full product data to simplified stock data
      const stockData: ExternalStockData[] = items.map((item) => ({
        sku: item.sku || item.produto?.sku || '',
        estoque: Number(item.estoque?.quantidade ?? item.estoque ?? 0),
      })).filter(item => item.sku); // Remove items without SKU

      if (DEBUG) {
        console.log(`[ExternalSalesService] Retrieved ${stockData.length} stock items`);
      }

      return stockData;
    } catch (error: any) {
      console.error(`[ExternalSalesService] Error fetching stock:`, error.message);
      // Return empty array instead of throwing to prevent breaking the UI
      return [];
    }
  }

  /**
   * Fetches full product data for multiple SKUs (stock + sales).
   * 
   * @param skus - Array of SKU strings
   * @returns Array of complete external product data
   */
  async getMultipleSkusData(skus: string[]): Promise<ExternalProductData[]> {
    if (skus.length === 0) {
      return [];
    }

    try {
      if (DEBUG) {
        console.log(`[ExternalSalesService] Fetching full data for ${skus.length} SKUs`);
      }

      const response = await withRetry(
        () => axios.post(API_CONFIG.BASE_URL, { skus }),
        {
          maxRetries: API_CONFIG.MAX_RETRIES,
          timeout: API_CONFIG.TIMEOUT,
        }
      );

      const items = normalizeResponse<ExternalProductData>(response.data);
      
      if (DEBUG) {
        console.log(`[ExternalSalesService] Retrieved ${items.length} product data items`);
      }

      return items;
    } catch (error: any) {
      console.error(`[ExternalSalesService] Error fetching product data:`, error.message);
      return [];
    }
  }

  /**
   * Fetches the full data for a single SKU.
   * 
   * @param sku - SKU string
   * @returns External product data or null
   */
  async getSkuData(sku: string): Promise<ExternalProductData | null> {
    try {
      const response = await withRetry(
        () => axios.post(API_CONFIG.BASE_URL, { skus: [sku] }),
        {
          maxRetries: API_CONFIG.MAX_RETRIES,
          timeout: API_CONFIG.TIMEOUT,
        }
      );

      const items = normalizeResponse<ExternalProductData>(response.data);
      return items.length > 0 ? items[0] : null;
    } catch (error: any) {
      console.error(`[ExternalSalesService] Error fetching SKU ${sku}:`, error.message);
      return null;
    }
  }

  /**
   * Fetches stock quantity for a single SKU.
   * Lightweight method for backward compatibility.
   * 
   * @param sku - SKU string
   * @returns Stock object with quantity or null
   */
  async getStock(sku: string): Promise<{ sku: string; quantity: number; lastUpdated: string } | null> {
    const data = await this.getSkuData(sku);
    if (!data) return null;

    const quantity = Number(data.estoque?.quantidade ?? 0);
    return {
      sku: data.sku,
      quantity,
      lastUpdated: new Date().toISOString(),
    };
  }
}

export const externalSalesService = new ExternalSalesService();

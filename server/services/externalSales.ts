import axios from 'axios';

// Configuration for the external API
const API_CONFIG = {
  BASE_URL: process.env.EXTERNAL_API_URL || 'https://docker-n8n-webhook.q4xusi.easypanel.host/webhook/a1b2d5s58d6555ewd55g',
};

// Simplified response format for stock-only queries
export interface ExternalStockData {
  sku: string;
  estoque: number;
}

// Full product data response (for detailed queries)
export interface ExternalProductData {
  sku: string;
  produto: {
    nome: string;
    categoria: string;
    tipo_produto: string;
    unidade_medida: string;
    ativo: boolean;
    is_kit: boolean;
  };
  estoque: {
    quantidade: number;
    custo_medio: number;
  };
  vendas: {
    total_unidades: number;
    vendas_7d: number;
    vendas_30d: number;
    vendas_90d: number;
    primeira_venda: string | null;
    ultima_venda: string | null;
  };
}

export class ExternalSalesService {
  private client;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Fetches stock data for multiple SKUs at once (simplified response).
   * This matches the webhook format: POST with { "skus": [...] }
   * Expected response: [{ "sku": "H201", "estoque": 37 }, ...]
   */
  async getMultipleSkusStock(skus: string[]): Promise<ExternalStockData[]> {
    try {
      if (skus.length === 0) {
        console.log(`[ExternalSalesService] No SKUs provided, returning empty array`);
        return [];
      }
      
      console.log(`[ExternalSalesService] Fetching stock for ${skus.length} SKUs:`, skus);
      console.log(`[ExternalSalesService] Sending POST to:`, API_CONFIG.BASE_URL);
      console.log(`[ExternalSalesService] Request body:`, JSON.stringify({ skus }, null, 2));
      
      const response = await axios.post<ExternalStockData[]>(API_CONFIG.BASE_URL, {
        skus
      });
      
      console.log(`[ExternalSalesService] Response status:`, response.status);
      console.log(`[ExternalSalesService] Raw response type:`, typeof response.data);
      console.log(`[ExternalSalesService] Is array?:`, Array.isArray(response.data));
      
      const responseData = response.data as any;
      let items: any[] = [];
      
      // Handle different response formats from n8n
      if (Array.isArray(responseData)) {
        // Direct array response
        items = responseData;
      } else if (responseData && responseData.data && Array.isArray(responseData.data)) {
        // Wrapped in { data: [...] }
        console.log(`[ExternalSalesService] Response has .data property with array of ${responseData.data.length} items`);
        items = responseData.data;
      } else if (responseData && typeof responseData === 'object') {
        // Single object, wrap in array
        console.log(`[ExternalSalesService] Response is a single object, wrapping in array`);
        items = [responseData];
      } else {
        console.warn(`[ExternalSalesService] Unexpected response format`);
        console.log(`[ExternalSalesService] Response data:`, JSON.stringify(responseData).substring(0, 200));
        return [];
      }
      
      console.log(`[ExternalSalesService] Processing ${items.length} items`);
      
      // Convert full product data to simplified stock data
      const stockData: ExternalStockData[] = items.map((item) => ({
        sku: item.sku,
        estoque: item.estoque?.quantidade ?? 0
      }));
      
      console.log(`[ExternalSalesService] Sample data:`, JSON.stringify(stockData.slice(0, 3)));
      console.log(`[ExternalSalesService] Returning ${stockData.length} stock items`);
      return stockData;
    } catch (error: any) {
      console.error(`[ExternalSalesService] Error fetching stock for multiple SKUs:`, error.message);
      if (error.response) {
        console.error(`[ExternalSalesService] Error response status:`, error.response.status);
        console.error(`[ExternalSalesService] Error response data:`, error.response.data);
      }
      return [];
    }
  }

  /**
   * Fetches data for multiple SKUs at once.
   */
  async getMultipleSkusData(skus: string[]): Promise<ExternalProductData[]> {
    try {
      if (skus.length === 0) return [];
      
      console.log(`[ExternalSalesService] Fetching data for ${skus.length} SKUs`);
      const response = await axios.post<ExternalProductData[]>(API_CONFIG.BASE_URL, {
        skus
      });
      
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error(`Error fetching data for multiple SKUs:`, error);
      return [];
    }
  }

  /**
   * Fetches the full data for a given SKU from the external system.
   */
  async getSkuData(sku: string): Promise<ExternalProductData | null> {
    try {
      console.log(`[ExternalSalesService] Fetching data for SKU: ${sku}`);
      
      // Scenario 2: POST with SKUs array (even for single SKU)
      // This matches the user's description of "Cenário 2"
      const response = await axios.post<ExternalProductData[]>(API_CONFIG.BASE_URL, {
        skus: [sku]
      });
      
      // If the API returns an array, take the first item
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data[0];
      }
      
      // Fallback if it returns a single object (unlikely given the spec but good for safety)
      if (!Array.isArray(response.data) && response.data) {
        return response.data as ExternalProductData;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching data for SKU ${sku}:`, error);
      return null;
    }
  }

  /**
   * Fetches the current stock quantity for a given SKU from the external system.
   * Kept for backward compatibility with initial implementation.
   */
  async getStock(sku: string): Promise<{ sku: string; quantity: number; lastUpdated: string } | null> {
    const data = await this.getSkuData(sku);
    if (!data) return null;

    return {
      sku: data.sku,
      quantity: data.estoque.quantidade,
      lastUpdated: new Date().toISOString(),
    };
  }
}

export const externalSalesService = new ExternalSalesService();


/**
 * E-commerce Platform Integration Clients
 * Handles bi-directional sync with Shopify and WooCommerce
 */

export interface PlatformCredentials {
  shopifyDomain?: string;
  shopifyAccessToken?: string;
  woocommerceUrl?: string;
  woocommerceConsumerKey?: string;
  woocommerceConsumerSecret?: string;
}

export interface ProductData {
  sku: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  barcode?: string;
  imageUrl?: string;
  category?: string;
}

export interface StockUpdateData {
  sku: string;
  quantity: number;
  locationId?: string;
}

/**
 * Shopify API Client
 */
export class ShopifyClient {
  private domain: string;
  private accessToken: string;
  private apiVersion = '2024-01';

  constructor(domain: string, accessToken: string) {
    this.domain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    this.accessToken = accessToken;
  }

  private async request(endpoint: string, method: string = 'GET', body?: any) {
    const url = `https://${this.domain}/admin/api/${this.apiVersion}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get product by SKU
   */
  async getProductBySku(sku: string) {
    try {
      const response = await this.request(`/products.json?fields=id,variants&limit=250`);
      const products = response.products || [];
      
      for (const product of products) {
        const variant = product.variants?.find((v: any) => v.sku === sku);
        if (variant) {
          return { productId: product.id, variantId: variant.id, variant };
        }
      }
      
      return null;
    } catch (error: any) {
      console.error('Error getting Shopify product:', error);
      throw error;
    }
  }

  /**
   * Update product inventory
   */
  async updateInventory(sku: string, quantity: number, locationId?: string) {
    try {
      const productData = await this.getProductBySku(sku);
      
      if (!productData) {
        throw new Error(`Product with SKU ${sku} not found in Shopify`);
      }

      // Get inventory item ID
      const variantResponse = await this.request(`/variants/${productData.variantId}.json`);
      const inventoryItemId = variantResponse.variant.inventory_item_id;

      // Get location if not provided
      let targetLocationId = locationId;
      if (!targetLocationId) {
        const locationsResponse = await this.request('/locations.json');
        targetLocationId = locationsResponse.locations[0]?.id;
      }

      // Update inventory level
      const updateResponse = await this.request('/inventory_levels/set.json', 'POST', {
        location_id: targetLocationId,
        inventory_item_id: inventoryItemId,
        available: quantity,
      });

      return updateResponse;
    } catch (error: any) {
      console.error('Error updating Shopify inventory:', error);
      throw error;
    }
  }

  /**
   * Update product details
   */
  async updateProduct(sku: string, data: Partial<ProductData>) {
    try {
      const productData = await this.getProductBySku(sku);
      
      if (!productData) {
        throw new Error(`Product with SKU ${sku} not found in Shopify`);
      }

      const updateData: any = {
        product: {},
      };

      if (data.name) updateData.product.title = data.name;
      if (data.description) updateData.product.body_html = data.description;

      // Update variant price
      if (data.price !== undefined) {
        await this.request(`/variants/${productData.variantId}.json`, 'PUT', {
          variant: {
            price: (data.price / 100).toFixed(2),
          },
        });
      }

      if (Object.keys(updateData.product).length > 0) {
        await this.request(`/products/${productData.productId}.json`, 'PUT', updateData);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error updating Shopify product:', error);
      throw error;
    }
  }
}

/**
 * WooCommerce API Client
 */
export class WooCommerceClient {
  private url: string;
  private consumerKey: string;
  private consumerSecret: string;

  constructor(url: string, consumerKey: string, consumerSecret: string) {
    this.url = url.replace(/\/$/, '');
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
  }

  private async request(endpoint: string, method: string = 'GET', body?: any) {
    const url = `${this.url}/wp-json/wc/v3${endpoint}`;
    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WooCommerce API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get product by SKU
   */
  async getProductBySku(sku: string) {
    try {
      const products = await this.request(`/products?sku=${encodeURIComponent(sku)}`);
      return products.length > 0 ? products[0] : null;
    } catch (error: any) {
      console.error('Error getting WooCommerce product:', error);
      throw error;
    }
  }

  /**
   * Update product inventory
   */
  async updateInventory(sku: string, quantity: number) {
    try {
      const product = await this.getProductBySku(sku);
      
      if (!product) {
        throw new Error(`Product with SKU ${sku} not found in WooCommerce`);
      }

      const updateResponse = await this.request(`/products/${product.id}`, 'PUT', {
        stock_quantity: quantity,
        manage_stock: true,
        stock_status: quantity > 0 ? 'instock' : 'outofstock',
      });

      return updateResponse;
    } catch (error: any) {
      console.error('Error updating WooCommerce inventory:', error);
      throw error;
    }
  }

  /**
   * Update product details
   */
  async updateProduct(sku: string, data: Partial<ProductData>) {
    try {
      const product = await this.getProductBySku(sku);
      
      if (!product) {
        throw new Error(`Product with SKU ${sku} not found in WooCommerce`);
      }

      const updateData: any = {};

      if (data.name) updateData.name = data.name;
      if (data.description) updateData.description = data.description;
      if (data.price !== undefined) updateData.regular_price = (data.price / 100).toFixed(2);

      const updateResponse = await this.request(`/products/${product.id}`, 'PUT', updateData);

      return updateResponse;
    } catch (error: any) {
      console.error('Error updating WooCommerce product:', error);
      throw error;
    }
  }
}

/**
 * Factory function to create platform client
 */
export function createPlatformClient(platform: 'shopify' | 'woocommerce', credentials: PlatformCredentials) {
  if (platform === 'shopify') {
    if (!credentials.shopifyDomain || !credentials.shopifyAccessToken) {
      throw new Error('Shopify credentials are required');
    }
    return new ShopifyClient(credentials.shopifyDomain, credentials.shopifyAccessToken);
  } else if (platform === 'woocommerce') {
    if (!credentials.woocommerceUrl || !credentials.woocommerceConsumerKey || !credentials.woocommerceConsumerSecret) {
      throw new Error('WooCommerce credentials are required');
    }
    return new WooCommerceClient(
      credentials.woocommerceUrl,
      credentials.woocommerceConsumerKey,
      credentials.woocommerceConsumerSecret
    );
  }
  
  throw new Error(`Unsupported platform: ${platform}`);
}

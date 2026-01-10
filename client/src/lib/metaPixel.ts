// src/lib/metaPixel.ts
/**
 * Meta Pixel Tracking Utility
 * 
 * Provides comprehensive e-commerce event tracking for Meta Pixel
 * with complete product catalog data for proper access and analytics.
 * 
 * All events include:
 * - Product IDs (content_ids)
 * - Product names (content_name)
 * - Prices and quantities
 * - SKU (if available)
 * - Category (if available)
 * - Complete contents array for catalog matching
 */

export type MetaPixelItem = {
  id?: string;           // Product ID (required for catalog)
  name?: string;         // Product name
  price?: number;        // Unit price
  quantity?: number;     // Quantity
  category?: string;     // Product category
  sku?: string;         // SKU code (for catalog matching)
  brand?: string;       // Brand name
};

function fbqSafe(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const anyWin = window as any;
  if (typeof anyWin.fbq === "function") {
    anyWin.fbq("track", event, params || {});
  }
}

/**
 * Track when a user views a product detail page
 * 
 * This event is critical for catalog data - Meta uses this to understand
 * which products users are viewing, enabling better ad targeting.
 */
export function trackViewContent(
  productId: string,
  productName: string,
  price: number,
  options?: {
    currency?: string;
    sku?: string;
    category?: string;
    brand?: string;
  }
) {
  const currency = options?.currency || "INR";
  const params: Record<string, unknown> = {
    content_ids: [productId],
    content_name: productName,
    content_type: "product",
    value: price,
    currency,
  };

  // Add SKU if available (important for catalog matching)
  if (options?.sku) {
    params.content_id = options.sku; // Alternative ID for catalog
  }

  // Add category if available
  if (options?.category) {
    params.content_category = options.category;
  }

  // Add brand if available
  if (options?.brand) {
    params.brand = options.brand;
  }

  fbqSafe("ViewContent", params);
}

/**
 * Track when a user adds a product to cart
 * 
 * Essential for catalog data - tracks which products users are interested in.
 * The contents array provides detailed product information for catalog matching.
 */
export function trackAddToCart(items: MetaPixelItem[] = [], currency = "INR") {
  if (items.length === 0) return;
  
  const contentIds = items.map((item) => item.id || "").filter(Boolean);
  const contentNames = items.map((item) => item.name || "").filter(Boolean);
  const totalValue = items.reduce((sum, item) => {
    const itemPrice = Number(item.price || 0);
    const itemQty = Number(item.quantity || 1);
    return sum + itemPrice * itemQty;
  }, 0);

  // Build contents array with complete product data for catalog
  const contents = items.map((item) => {
    const content: Record<string, unknown> = {
      id: item.id || "",
      name: item.name || "",
      quantity: item.quantity || 1,
      item_price: item.price || 0,
    };

    // Add SKU if available (critical for catalog matching)
    if (item.sku) {
      content.product_id = item.sku;
    }

    // Add category if available
    if (item.category) {
      content.category = item.category;
    }

    // Add brand if available
    if (item.brand) {
      content.brand = item.brand;
    }

    return content;
  });

  fbqSafe("AddToCart", {
    content_ids: contentIds,
    content_name: contentNames.join(", "),
    content_type: "product",
    value: totalValue,
    currency,
    contents,
    num_items: items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0),
  });
}

/**
 * Track when a user initiates checkout
 * 
 * Important for understanding conversion funnel and catalog performance.
 * Includes complete product data for catalog matching.
 */
export function trackInitiateCheckout(items: MetaPixelItem[] = [], value?: number, currency = "INR") {
  if (items.length === 0) return;
  
  const contentIds = items.map((item) => item.id || "").filter(Boolean);
  const contentNames = items.map((item) => item.name || "").filter(Boolean);
  const totalValue = value !== undefined ? value : items.reduce((sum, item) => {
    const itemPrice = Number(item.price || 0);
    const itemQty = Number(item.quantity || 1);
    return sum + itemPrice * itemQty;
  }, 0);

  // Build contents array with complete product data for catalog
  const contents = items.map((item) => {
    const content: Record<string, unknown> = {
      id: item.id || "",
      name: item.name || "",
      quantity: item.quantity || 1,
      item_price: item.price || 0,
    };

    // Add SKU if available
    if (item.sku) {
      content.product_id = item.sku;
    }

    // Add category if available
    if (item.category) {
      content.category = item.category;
    }

    // Add brand if available
    if (item.brand) {
      content.brand = item.brand;
    }

    return content;
  });

  fbqSafe("InitiateCheckout", {
    content_ids: contentIds,
    content_name: contentNames.join(", "),
    content_type: "product",
    value: totalValue,
    currency,
    contents,
    num_items: items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0),
  });
}

/**
 * Track when a purchase is completed
 * 
 * Most important event for catalog data - confirms which products were purchased.
 * This data is used to:
 * - Update catalog performance metrics
 * - Optimize ad campaigns
 * - Build lookalike audiences
 * - Track ROI
 */
export function trackPurchase(
  transactionId: string,
  value: number,
  items: MetaPixelItem[] = [],
  currency = "INR"
) {
  const contentIds = items.map((item) => item.id || "").filter(Boolean);
  const contentNames = items.map((item) => item.name || "").filter(Boolean);

  // Build contents array with complete product data for catalog
  const contents = items.map((item) => {
    const content: Record<string, unknown> = {
      id: item.id || "",
      name: item.name || "",
      quantity: item.quantity || 1,
      item_price: item.price || 0,
    };

    // Add SKU if available (critical for catalog matching)
    if (item.sku) {
      content.product_id = item.sku;
    }

    // Add category if available
    if (item.category) {
      content.category = item.category;
    }

    // Add brand if available
    if (item.brand) {
      content.brand = item.brand;
    }

    return content;
  });

  fbqSafe("Purchase", {
    content_ids: contentIds,
    content_name: contentNames.join(", "),
    content_type: "product",
    value,
    currency,
    contents,
    num_items: items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0),
  });
}


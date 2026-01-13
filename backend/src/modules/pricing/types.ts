// Types aligned with exactOptionalPropertyTypes:true

export type CartProductRef = {
  _id: string;
  name?: string;
  price?: number;
  images?: Array<string | { url: string }>;
};

export type CartItem = {
  _id?: string;
  product?: CartProductRef; // optional (we may only have productId)
  productId?: string;       // optional (we may only have product)
  name?: string;
  price: number;
  qty: number;
};

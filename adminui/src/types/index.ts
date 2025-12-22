export type KPI = {
  label: string;
  value: number;
  icon?: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  status: "active" | "inactive";
  images: string[];
};

export type Order = {
  id: string;
  customerName: string;
  totalAmount: number;
  date: string;
  status: "pending" | "shipped" | "completed";
};

export type Blog = {
  id: string;
  title: string;
  author: string;
  date: string;
  content: string;
  featuredImage: string;
};

export type Coupon = {
  id: string;
  code: string;
  discount: number;
  expiry: string;
  status: "active" | "inactive";
};

export type Testimonial = {
  id: string;
  name: string;
  review: string;
  rating: number;
  featured: boolean;
};
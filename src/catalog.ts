import catalogue from "./catalog.json";

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  fullDescription?: string;
  collection?: string;
  image: string;
  imageAlt?: string;
  images?: string[];
  videoUrl?: string;
  price?: number;
  originalPrice?: number;
  createdAt?: string;
  material?: string;
  dimensions?: string;
  careInstructions?: string;
  isNew?: boolean;
  isBestseller?: boolean;
  featured?: boolean;
  sortOrder?: number;
  available?: boolean;
  variants?: { name: string; available: boolean }[];
  seoTitle?: string;
  seoDescription?: string;
  published: boolean;
  preview?: boolean;
};

export type Category = {
  name: string;
  slug: string;
  image: string;
  preview?: boolean;
};

const liveProducts: Product[] = catalogue.products;
const previewProducts: Product[] = catalogue.previewProducts;

export const products = (import.meta.env.DEV
  ? [...liveProducts, ...previewProducts]
  : liveProducts)
  .filter((product) => product.published);

export const categories: Category[] = (import.meta.env.DEV
  ? catalogue.categories
  : catalogue.categories.filter((category) => !category.preview));

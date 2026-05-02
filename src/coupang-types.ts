/**
 * 쿠팡 파트너스 Open API 타입
 */

export interface CoupangProduct {
  productId: number;
  productName: string;
  productPrice: number;
  productImage: string;
  productUrl: string;
  isRocket: boolean;
  isFreeShipping: boolean;
}

export interface CoupangSearchResult {
  query: string;
  products: CoupangProduct[];
  cached: boolean;
}

export interface CoupangProductRaw {
  productId: number;
  productName: string;
  productPrice: number;
  productImage: string;
  productUrl: string;
  isRocket: boolean;
  isFreeShipping: boolean;
}

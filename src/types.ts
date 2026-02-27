export interface BookItem {
  id: string;
  title: string;
  author: string;
  price: number;
  stock: number;
  category: string;
  description: string;
  cover_url: string;
  contraportada_url?: string;
  createdAt?: any;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role?: 'owner' | 'admin' | 'vendedor';
}

export interface SaleItem {
  bookId: string;
  title: string;
  price: number;
  quantity: number;
  stock: number;
  cover_url?: string;
}

export interface SaleRecord {
  id: string;
  items: SaleItem[];
  clientId: string;
  clientName: string;
  total: number;
  amountPaid: number;
  debt: number;
  sellerId: string;
  sellerName: string;
  timestamp: any;
  date?: any;
}

export interface ClientRecord {
  id: string;
  name: string;
  totalDebt: number;
  createdAt: any;
}

export interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: any;
  timestamp: any;
}

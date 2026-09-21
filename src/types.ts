export interface ContactResult {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  source: 'meta' | 'google_maps' | 'google_my_business';
  category: string;
  rating?: number;
  reviews?: number;
  verified: boolean;
  lastUpdated: string;
}

export interface SearchConfig {
  query: string;
  location: string;
  sources: ('meta' | 'google_maps' | 'google_my_business')[];
  category: string;
  maxResults: number;
  includePhone: boolean;
  includeWebsite: boolean;
  verifiedOnly: boolean;
}

export type ViewType = 'search' | 'results' | 'export' | 'settings' | 'compliance';

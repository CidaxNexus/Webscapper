export interface ContactResult {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  source: 'meta' | 'google_maps' | 'google_my_business' | 'tiktok';
  category: string;
  rating?: number;
  reviews?: number;
  verified: boolean;
  lastUpdated: string;
}

export interface SearchConfig {
  query: string;
  location: string;
  sources: ('meta' | 'google_maps' | 'google_my_business' | 'tiktok')[];
  category: string;
  maxResults: number;
  includePhone: boolean;
  includeWebsite: boolean;
  verifiedOnly: boolean;
}

export interface WebsiteScrapeResult {
  url: string;
  businessName: string;
  emails: string[];
  phones: string[];
  address: string;
  socialLinks: Record<string, string[]>;
  description: string;
  pagesScraped: number;
  success: boolean;
  error: string;
  scrapedAt: string;
}

export type ViewType = 'search' | 'results' | 'scraper' | 'export' | 'settings' | 'compliance';

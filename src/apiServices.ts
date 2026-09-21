/**
 * API Service Layer for ContactHarvest
 * 
 * This file handles all API integrations with external platforms.
 * Configure your API keys in the Settings tab or via environment variables.
 */

import { ContactResult, SearchConfig } from './types';

// ============================================
// API CONFIGURATION
// ============================================

interface APIConfig {
  metaApiKey: string;
  googleMapsApiKey: string;
  googleMyBusinessApiKey: string;
  tiktokApiKey: string;
  backendScraperUrl: string;
}

// Get API config from localStorage or use defaults
export function getAPIConfig(): APIConfig {
  const stored = localStorage.getItem('contactharvest_api_config');
  if (stored) {
    return JSON.parse(stored);
  }
  
  return {
    metaApiKey: '',
    googleMapsApiKey: '',
    googleMyBusinessApiKey: '',
    tiktokApiKey: '',
    backendScraperUrl: 'http://localhost:3001',
  };
}

// Save API config to localStorage
export function saveAPIConfig(config: APIConfig): void {
  localStorage.setItem('contactharvest_api_config', JSON.stringify(config));
}

// ============================================
// META (FACEBOOK/INSTAGRAM) GRAPH API
// ============================================

/**
 * Search for businesses on Meta platforms
 * Docs: https://developers.facebook.com/docs/graph-api
 */
export async function searchMetaBusinesses(config: SearchConfig): Promise<ContactResult[]> {
  const apiConfig = getAPIConfig();
  
  if (!apiConfig.metaApiKey) {
    console.warn('Meta API key not configured');
    return [];
  }

  try {
    // Meta Graph API - Search for pages
    const response = await fetch(
      `https://graph.facebook.com/v18.0/pages/search?q=${encodeURIComponent(config.query)}&limit=${config.maxResults}&access_token=${apiConfig.metaApiKey}`
    );

    if (!response.ok) {
      throw new Error(`Meta API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform Meta API response to our format
    const results: ContactResult[] = (data.data || []).map((page: any) => ({
      id: `meta_${page.id}`,
      businessName: page.name,
      email: page.email || '',
      phone: page.phone || '',
      website: page.website || '',
      address: page.location ? formatAddress(page.location) : '',
      source: 'meta' as const,
      category: page.category || 'Business',
      rating: page.overall_star_rating || 0,
      reviews: page.rating_count || 0,
      verified: page.is_verified || false,
      lastUpdated: new Date().toISOString().split('T')[0],
    }));

    return results.filter(r => r.email); // Only return results with emails
  } catch (error) {
    console.error('Meta API error:', error);
    return [];
  }
}

/**
 * Get detailed business information from Meta
 */
export async function getMetaBusinessDetails(pageId: string): Promise<any> {
  const apiConfig = getAPIConfig();
  
  if (!apiConfig.metaApiKey) {
    throw new Error('Meta API key not configured');
  }

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}?fields=name,email,phone,website,location,category,is_verified,overall_star_rating,rating_count&access_token=${apiConfig.metaApiKey}`
  );

  if (!response.ok) {
    throw new Error(`Meta API error: ${response.statusText}`);
  }

  return response.json();
}

// ============================================
// GOOGLE MAPS / PLACES API
// ============================================

/**
 * Search for businesses using Google Places API
 * Docs: https://developers.google.com/maps/documentation/places/web-service
 */
export async function searchGoogleMaps(config: SearchConfig): Promise<ContactResult[]> {
  const apiConfig = getAPIConfig();
  
  if (!apiConfig.googleMapsApiKey) {
    console.warn('Google Maps API key not configured');
    return [];
  }

  try {
    // Build search query
    const query = config.location 
      ? `${config.query} in ${config.location}`
      : config.query;

    // Text Search API
    const searchResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiConfig.googleMapsApiKey}`
    );

    if (!searchResponse.ok) {
      throw new Error(`Google Maps API error: ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();
    
    if (searchData.status !== 'OK') {
      console.warn('Google Maps search failed:', searchData.status);
      return [];
    }

    // Get detailed information for each place
    const results: ContactResult[] = [];
    
    for (const place of searchData.results.slice(0, config.maxResults)) {
      try {
        const details = await getGooglePlaceDetails(place.place_id, apiConfig.googleMapsApiKey);
        
        if (details.result) {
          results.push({
            id: `google_maps_${place.place_id}`,
            businessName: details.result.name,
            email: extractEmailFromWebsite(details.result.website) || '',
            phone: details.result.formatted_phone_number || '',
            website: details.result.website || '',
            address: details.result.formatted_address || '',
            source: 'google_maps' as const,
            category: details.result.types?.[0] || 'Business',
            rating: details.result.rating || 0,
            reviews: details.result.user_ratings_total || 0,
            verified: details.result.business_status === 'OPERATIONAL',
            lastUpdated: new Date().toISOString().split('T')[0],
          });
        }
      } catch (error) {
        console.error('Error fetching place details:', error);
      }
    }

    return results.filter(r => r.email || r.phone);
  } catch (error) {
    console.error('Google Maps API error:', error);
    return [];
  }
}

/**
 * Get detailed place information from Google Places API
 */
async function getGooglePlaceDetails(placeId: string, apiKey: string): Promise<any> {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_phone_number,website,formatted_address,rating,user_ratings_total,types,business_status&key=${apiKey}`
  );

  if (!response.ok) {
    throw new Error(`Google Places Details API error: ${response.statusText}`);
  }

  return response.json();
}

// ============================================
// GOOGLE MY BUSINESS API
// ============================================

/**
 * Search for businesses using Google My Business API
 * Docs: https://developers.google.com/my-business/reference/rest
 */
export async function searchGoogleMyBusiness(config: SearchConfig): Promise<ContactResult[]> {
  const apiConfig = getAPIConfig();
  
  if (!apiConfig.googleMyBusinessApiKey) {
    console.warn('Google My Business API key not configured');
    return [];
  }

  try {
    // Note: Google My Business API requires OAuth 2.0 authentication
    // This is a simplified example - you'll need to implement proper OAuth flow
    
    // For now, we'll use the Places API as a fallback
    // In production, you'd use the actual GMB API with proper authentication
    
    const response = await fetch(
      `https://mybusiness.googleapis.com/v4/accounts/${config.query}?key=${apiConfig.googleMyBusinessApiKey}`
    );

    if (!response.ok) {
      throw new Error(`Google My Business API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform GMB API response
    const results: ContactResult[] = (data.locations || []).map((location: any) => ({
      id: `gmb_${location.name}`,
      businessName: location.locationName || location.title,
      email: location.email || '',
      phone: location.primaryPhone || '',
      website: location.websiteUri || '',
      address: formatGMBAddress(location.address),
      source: 'google_my_business' as const,
      category: location.primaryCategory?.displayName || 'Business',
      rating: location.averageRating || 0,
      reviews: location.totalReviewCount || 0,
      verified: location.state?.isVerified || false,
      lastUpdated: new Date().toISOString().split('T')[0],
    }));

    return results;
  } catch (error) {
    console.error('Google My Business API error:', error);
    // Fallback to Google Maps API
    return searchGoogleMaps(config);
  }
}

// ============================================
// TIKTOK BUSINESS API
// ============================================

/**
 * Search for businesses on TikTok
 * Docs: https://developers.tiktok.com/doc/about-tiktok-for-developers/
 */
export async function searchTikTokBusinesses(config: SearchConfig): Promise<ContactResult[]> {
  const apiConfig = getAPIConfig();
  
  if (!apiConfig.tiktokApiKey) {
    console.warn('TikTok API key not configured');
    return [];
  }

  try {
    // TikTok API - Search for business accounts
    // Note: TikTok's API is more limited for business discovery
    // You may need to use their Marketing API or Research API
    
    const response = await fetch(
      `https://open.tiktokapis.com/v2/research/user/query/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiConfig.tiktokApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: {
            username: config.query,
          },
          fields: ['display_name', 'profile_description', 'is_verified'],
          max_count: config.maxResults,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`TikTok API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform TikTok API response
    const results: ContactResult[] = (data.data.users || []).map((user: any) => ({
      id: `tiktok_${user.username}`,
      businessName: user.display_name || user.username,
      email: '', // TikTok doesn't provide emails directly
      phone: '', // TikTok doesn't provide phones directly
      website: user.profile_deep_link || `https://tiktok.com/@${user.username}`,
      address: '',
      source: 'tiktok' as const,
      category: 'TikTok Creator',
      rating: 0,
      reviews: 0,
      verified: user.is_verified || false,
      lastUpdated: new Date().toISOString().split('T')[0],
    }));

    return results;
  } catch (error) {
    console.error('TikTok API error:', error);
    return [];
  }
}

// ============================================
// WEBSITE SCRAPER (BACKEND)
// ============================================

/**
 * Scrape websites using the backend scraper service
 */
export async function scrapeWebsites(urls: string[], deep: boolean = false): Promise<any[]> {
  const apiConfig = getAPIConfig();
  
  try {
    const response = await fetch(`${apiConfig.backendScraperUrl}/api/scrape/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ urls, deep }),
    });

    if (!response.ok) {
      throw new Error(`Backend scraper error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Website scraper error:', error);
    return [];
  }
}

/**
 * Scrape a single website
 */
export async function scrapeWebsite(url: string, deep: boolean = false): Promise<any> {
  const apiConfig = getAPIConfig();
  
  try {
    const response = await fetch(`${apiConfig.backendScraperUrl}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, deep }),
    });

    if (!response.ok) {
      throw new Error(`Backend scraper error: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Website scraper error:', error);
    return null;
  }
}

// ============================================
// COMBINED SEARCH
// ============================================

/**
 * Search across all configured sources
 */
export async function searchAllSources(config: SearchConfig): Promise<ContactResult[]> {
  const promises: Promise<ContactResult[]>[] = [];

  if (config.sources.includes('meta')) {
    promises.push(searchMetaBusinesses(config));
  }

  if (config.sources.includes('google_maps')) {
    promises.push(searchGoogleMaps(config));
  }

  if (config.sources.includes('google_my_business')) {
    promises.push(searchGoogleMyBusiness(config));
  }

  if (config.sources.includes('tiktok')) {
    promises.push(searchTikTokBusinesses(config));
  }

  // Wait for all searches to complete
  const resultsArrays = await Promise.all(promises);
  
  // Flatten and deduplicate results
  const allResults = resultsArrays.flat();
  
  // Remove duplicates based on email
  const uniqueResults = Array.from(
    new Map(allResults.map(r => [r.email, r])).values()
  );

  // Apply filters
  let filtered = uniqueResults;
  
  if (config.verifiedOnly) {
    filtered = filtered.filter(r => r.verified);
  }

  return filtered.slice(0, config.maxResults);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatAddress(location: any): string {
  if (!location) return '';
  
  const parts = [
    location.street,
    location.city,
    location.state,
    location.zip,
    location.country,
  ].filter(Boolean);
  
  return parts.join(', ');
}

function formatGMBAddress(address: any): string {
  if (!address) return '';
  
  const parts = [
    address.address_lines?.join(', '),
    address.locality,
    address.administrative_area,
    address.postal_code,
    address.region_code,
  ].filter(Boolean);
  
  return parts.join(', ');
}

function extractEmailFromWebsite(website: string): string {
  // This is a placeholder - in production, you'd scrape the website
  // to find contact emails
  if (!website) return '';
  
  // For demo purposes, generate a placeholder email
  try {
    const domain = new URL(website).hostname.replace('www.', '');
    return `contact@${domain}`;
  } catch {
    return '';
  }
}

// ============================================
// API KEY VALIDATION
// ============================================

/**
 * Test if an API key is valid
 */
export async function testAPIKey(platform: string, apiKey: string): Promise<boolean> {
  try {
    switch (platform) {
      case 'meta':
        const metaResponse = await fetch(
          `https://graph.facebook.com/v18.0/me?access_token=${apiKey}`
        );
        return metaResponse.ok;
        
      case 'google_maps':
        const mapsResponse = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?query=test&key=${apiKey}`
        );
        const mapsData = await mapsResponse.json();
        return mapsData.status === 'OK' || mapsData.status === 'ZERO_RESULTS';
        
      case 'tiktok':
        // TikTok API validation would go here
        return apiKey.length > 0;
        
      default:
        return false;
    }
  } catch (error) {
    return false;
  }
}

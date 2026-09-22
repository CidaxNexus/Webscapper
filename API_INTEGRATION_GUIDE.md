# API Integration Guide - Where to Connect APIs on the Frontend

## 📍 Quick Answer: Where to Add API Keys

**Go to: Settings Tab → API Configuration Section**

The Settings page has dedicated input fields for each API key:
1. Meta (Facebook/Instagram) API Key
2. Google Maps API Key
3. Google My Business API Key
4. TikTok Business API Key
5. Backend Scraper Service URL

---

## 🗂️ File Structure Overview

```
src/
├── App.tsx                      # Main application component
├── SettingsPage.tsx             # ⭐ API keys are configured HERE
├── apiServices.ts               # ⭐ API calls are made HERE
├── WebsiteScraperView.tsx       # Website scraper UI
├── types.ts                     # TypeScript type definitions
└── mockData.ts                  # Demo data (used when no API keys)
```

---

## 🔑 Step 1: Configure API Keys (Settings Page)

### Location: `src/SettingsPage.tsx`

This is where you enter and save your API keys. The keys are stored in browser localStorage.

**What it does:**
- Provides input fields for all API keys
- Tests API key validity
- Saves configuration to localStorage
- Shows connection status

**How to use:**
1. Click on "Settings" in the sidebar
2. Enter your API keys in the respective fields
3. Click "Test Key" to verify each key works
4. Click "Save Configuration" to persist

**Code snippet (lines 1-50):**
```typescript
// API keys are stored in localStorage
const [config, setConfig] = useState<APIConfig>({
  metaApiKey: '',
  googleMapsApiKey: '',
  googleMyBusinessApiKey: '',
  tiktokApiKey: '',
  backendScraperUrl: 'http://localhost:3001',
});

// Save to localStorage
const handleSave = () => {
  saveAPIConfig(config);
  // ...
};
```

---

## 🌐 Step 2: API Service Layer (Where API Calls Happen)

### Location: `src/apiServices.ts`

This file contains all the actual API integration code. Each platform has its own function.

### Meta (Facebook/Instagram) API

**Function:** `searchMetaBusinesses()` (lines 50-100)

```typescript
export async function searchMetaBusinesses(config: SearchConfig): Promise<ContactResult[]> {
  const apiConfig = getAPIConfig();
  
  // Make API call to Meta Graph API
  const response = await fetch(
    `https://graph.facebook.com/v18.0/pages/search?q=${encodeURIComponent(config.query)}&limit=${config.maxResults}&access_token=${apiConfig.metaApiKey}`
  );
  
  // Transform response to our format
  const results = (data.data || []).map((page: any) => ({
    id: `meta_${page.id}`,
    businessName: page.name,
    email: page.email || '',
    phone: page.phone || '',
    // ...
  }));
  
  return results;
}
```

**How to get Meta API key:**
1. Go to https://developers.facebook.com/
2. Create a new app
3. Add "Facebook Login" product
4. Get your App ID and App Secret
5. Generate an access token

---

### Google Maps API

**Function:** `searchGoogleMaps()` (lines 110-180)

```typescript
export async function searchGoogleMaps(config: SearchConfig): Promise<ContactResult[]> {
  const apiConfig = getAPIConfig();
  
  // Text Search API
  const searchResponse = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiConfig.googleMapsApiKey}`
  );
  
  // Get detailed information for each place
  for (const place of searchData.results) {
    const details = await getGooglePlaceDetails(place.place_id, apiConfig.googleMapsApiKey);
    // Transform to our format
  }
}
```

**How to get Google Maps API key:**
1. Go to https://console.cloud.google.com/
2. Create a new project
3. Enable "Places API" and "Maps JavaScript API"
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy the API key

---

### Google My Business API

**Function:** `searchGoogleMyBusiness()` (lines 190-240)

```typescript
export async function searchGoogleMyBusiness(config: SearchConfig): Promise<ContactResult[]> {
  const apiConfig = getAPIConfig();
  
  // Note: GMB API requires OAuth 2.0 authentication
  const response = await fetch(
    `https://mybusiness.googleapis.com/v4/accounts/${config.query}?key=${apiConfig.googleMyBusinessApiKey}`
  );
}
```

**How to get Google My Business API key:**
1. Go to https://developers.google.com/my-business
2. Set up OAuth 2.0 credentials
3. Request API access (requires approval)
4. Get your API key

---

### TikTok Business API

**Function:** `searchTikTokBusinesses()` (lines 250-300)

```typescript
export async function searchTikTokBusinesses(config: SearchConfig): Promise<ContactResult[]> {
  const apiConfig = getAPIConfig();
  
  const response = await fetch(
    `https://open.tiktokapis.com/v2/research/user/query/`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiConfig.tiktokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: { username: config.query },
        fields: ['display_name', 'profile_description', 'is_verified'],
      }),
    }
  );
}
```

**How to get TikTok API key:**
1. Go to https://developers.tiktok.com/
2. Create a developer account
3. Create a new app
4. Request API access
5. Get your access token

---

## 🔍 Step 3: Combined Search (Where All APIs Are Called)

### Location: `src/apiServices.ts` → `searchAllSources()` function (lines 310-350)

```typescript
export async function searchAllSources(config: SearchConfig): Promise<ContactResult[]> {
  const promises: Promise<ContactResult[]>[] = [];

  // Call each API based on selected sources
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
  
  return uniqueResults;
}
```

---

## 🎯 Step 4: Frontend Integration (Where Search is Triggered)

### Location: `src/App.tsx` → `handleSearch()` function (lines 50-120)

```typescript
const handleSearch = useCallback(async () => {
  if (!config.query.trim()) return;
  setIsSearching(true);
  
  // Check if API keys are configured
  const apiConfig = getAPIConfig();
  const hasAPIKeys = apiConfig.metaApiKey || apiConfig.googleMapsApiKey || 
                     apiConfig.googleMyBusinessApiKey || apiConfig.tiktokApiKey;

  if (!hasAPIKeys) {
    // Use mock data if no API keys configured
    console.log('No API keys configured, using demo data');
    // ... use mockResults
    return;
  }

  // Use real API services
  try {
    const apiResults = await searchAllSources(config);
    setResults(apiResults);
  } catch (error) {
    console.error('Search error:', error);
    // Fallback to mock data on error
  } finally {
    setIsSearching(false);
  }
}, [config]);
```

---

## 📊 Data Flow Diagram

```
User Input (Search Tab)
        ↓
handleSearch() in App.tsx
        ↓
Check if API keys exist (getAPIConfig())
        ↓
    ┌───┴───┐
    │       │
 NO API    HAS API
    │       │
    ↓       ↓
Mock    searchAllSources() in apiServices.ts
Data        ↓
    │   ┌───┴───┬───────────┬──────────┐
    │   │       │           │          │
    │   ↓       ↓           ↓          ↓
    │ Meta   Google     Google      TikTok
    │  API    Maps       GMB         API
    │   │       │           │          │
    │   └───┬───┴───────────┴──────────┘
    │       │
    │   Combine & Deduplicate Results
    │       │
    └───┬───┘
        ↓
   Display Results
```

---

## 🔧 How to Add a New API Source

### Step 1: Add to types.ts

```typescript
// In src/types.ts
export interface ContactResult {
  source: 'meta' | 'google_maps' | 'google_my_business' | 'tiktok' | 'new_source';
  // ...
}

export interface SearchConfig {
  sources: ('meta' | 'google_maps' | 'google_my_business' | 'tiktok' | 'new_source')[];
  // ...
}
```

### Step 2: Add API function in apiServices.ts

```typescript
// In src/apiServices.ts
export async function searchNewSource(config: SearchConfig): Promise<ContactResult[]> {
  const apiConfig = getAPIConfig();
  
  const response = await fetch('https://api.newsource.com/search', {
    headers: {
      'Authorization': `Bearer ${apiConfig.newSourceApiKey}`,
    },
  });
  
  // Transform response
  return results;
}
```

### Step 3: Add to combined search

```typescript
// In searchAllSources() function
if (config.sources.includes('new_source')) {
  promises.push(searchNewSource(config));
}
```

### Step 4: Add to Settings page

```typescript
// In src/SettingsPage.tsx
<div>
  <label>New Source API Key</label>
  <input
    type="password"
    value={config.newSourceApiKey}
    onChange={e => setConfig(prev => ({ ...prev, newSourceApiKey: e.target.value }))}
  />
</div>
```

### Step 5: Add to UI source selector

```typescript
// In src/App.tsx source selection section
{ id: 'new_source' as const, name: 'New Source', desc: 'Description', icon: NewIcon, color: 'purple' }
```

---

## 🎨 UI Components That Use APIs

### 1. Search Tab (`src/App.tsx`)
- **Location:** Lines 320-490
- **What it does:** Provides search form UI
- **API connection:** Calls `handleSearch()` which uses `searchAllSources()`

### 2. Web Scraper Tab (`src/WebsiteScraperView.tsx`)
- **Location:** Entire file
- **What it does:** Scrapes websites directly
- **API connection:** Calls backend scraper service at `backendScraperUrl`

### 3. Settings Tab (`src/SettingsPage.tsx`)
- **Location:** Entire file
- **What it does:** Configure API keys
- **API connection:** Saves to localStorage, tests API keys

### 4. Results Tab (`src/App.tsx`)
- **Location:** Lines 500-700
- **What it does:** Displays search results
- **API connection:** Receives data from `searchAllSources()`

---

## 🔐 Security Best Practices

### Where API Keys Are Stored
- **Current:** Browser localStorage
- **Production:** Environment variables or secure backend

### Recommended Production Setup

```typescript
// Instead of localStorage, use environment variables
const API_CONFIG = {
  metaApiKey: import.meta.env.VITE_META_API_KEY,
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  // ...
};
```

### Backend Proxy (Recommended)

For production, route API calls through your backend:

```typescript
// Frontend calls your backend
const response = await fetch('/api/search/meta', {
  method: 'POST',
  body: JSON.stringify(config),
});

// Backend makes actual API call with secure keys
app.post('/api/search/meta', async (req, res) => {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/pages/search?access_token=${process.env.META_API_KEY}`
  );
  res.json(await response.json());
});
```

---

## 📝 Quick Reference

| What | Where | File |
|------|-------|------|
| Enter API keys | Settings tab | `src/SettingsPage.tsx` |
| API calls are made | apiServices.ts | `src/apiServices.ts` |
| Search is triggered | Search tab | `src/App.tsx` → `handleSearch()` |
| Results are displayed | Results tab | `src/App.tsx` → Results View |
| Website scraping | Web Scraper tab | `src/WebsiteScraperView.tsx` |
| API key storage | localStorage | `src/apiServices.ts` → `saveAPIConfig()` |

---

## 🚀 Getting Started

1. **Open the app** → Click "Settings" in sidebar
2. **Add API keys** → Enter keys for platforms you want to use
3. **Test keys** → Click "Test Key" for each platform
4. **Save** → Click "Save Configuration"
5. **Search** → Go to "Search" tab and start searching
6. **View results** → Results appear in "Results" tab
7. **Export** → Download from "Export" tab

---

## 🆘 Troubleshooting

### "No API keys configured" message
- Go to Settings tab
- Add at least one API key
- Click "Save Configuration"

### API test fails
- Check API key is correct
- Verify API key has proper permissions
- Check API quota/limits
- Review API documentation for your platform

### Search returns no results
- Verify API keys are working (test them)
- Check search query is valid
- Try different search terms
- Check API rate limits

### Backend scraper not connecting
- Make sure backend is running: `cd backend && npm start`
- Check backend URL in Settings matches your backend port
- Verify CORS is enabled on backend

---

## 📚 Additional Resources

- [Meta Graph API Docs](https://developers.facebook.com/docs/graph-api)
- [Google Places API Docs](https://developers.google.com/maps/documentation/places)
- [Google My Business API Docs](https://developers.google.com/my-business)
- [TikTok for Developers](https://developers.tiktok.com/)
- [SCRAPING_GUIDE.md](./SCRAPING_GUIDE.md) - Detailed scraping techniques

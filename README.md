# ContactHarvest - Business Email Finder & Web Scraper

A professional web application for finding business contact information from multiple sources including Meta Business Pages, Google Maps, Google My Business, TikTok, and direct website scraping.

## 🚀 Features

### Frontend Dashboard
- **Multi-Source Search**: Search across Meta, Google Maps, Google My Business, and TikTok
- **Website Scraper**: Extract contact info directly from business websites
- **Results Management**: View, filter, and manage scraped contacts
- **Export Options**: Export to CSV and JSON formats
- **Compliance Dashboard**: Legal notices and best practices

### Backend Scraping Services
- **Node.js Scraper**: Puppeteer-based scraper for JavaScript-heavy sites
- **Python Scraper**: BeautifulSoup + Playwright for dynamic content
- **REST API**: Full API for programmatic access
- **Ethical Scraping**: Respects robots.txt, rate limiting, proper user agents

## 📁 Project Structure

```
├── src/                          # React frontend
│   ├── App.tsx                   # Main application
│   ├── WebsiteScraperView.tsx    # Website scraper UI
│   ├── types.ts                  # TypeScript types
│   └── mockData.ts               # Demo data
├── backend/                      # Backend scraping services
│   ├── scraper-service.js        # Node.js scraper (Puppeteer)
│   ├── scraper.py                # Python scraper (BeautifulSoup)
│   ├── package.json              # Node.js dependencies
│   └── requirements.txt          # Python dependencies
└── SCRAPING_GUIDE.md             # Comprehensive scraping guide
```

## 🛠️ Setup & Installation

### Frontend (React Dashboard)

The frontend is already built and ready to use. To run in development mode:

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

### Backend - Option 1: Node.js Scraper (Recommended)

```bash
cd backend
npm install
npm start
```

The scraper service will run on `http://localhost:3001`

**Endpoints:**
- `POST /api/scrape` - Scrape single URL
- `POST /api/scrape/batch` - Scrape multiple URLs
- `POST /api/extract-emails` - Extract emails from text
- `GET /api/health` - Health check

### Backend - Option 2: Python Scraper

```bash
cd backend
pip install -r requirements.txt
playwright install chromium  # For dynamic sites
python scraper.py --serve
```

The API server will run on `http://localhost:8000`

**Endpoints:**
- `POST /api/scrape?url=<url>&deep=<true|false>` - Scrape URL
- `POST /api/scrape/batch` - Scrape multiple URLs
- `POST /api/extract-emails` - Extract emails from text
- `GET /api/health` - Health check

## 🎯 Usage

### 1. Search Platform Sources

1. Go to the **Search** tab
2. Enter business name/keyword and location
3. Select data sources (Meta, Google Maps, GMB, TikTok)
4. Click "Start Search"
5. View results in the **Results** tab
6. Export from the **Export** tab

### 2. Scrape Websites Directly

1. Go to the **Web Scraper** tab
2. Enter one or more website URLs (one per line)
3. Optionally enable "Deep Scrape" to follow contact links
4. Click "Start Scraping"
5. View extracted emails, phones, addresses, and social links

**Note:** Make sure the backend scraper service is running for real scraping. Without it, the frontend will show demo results.

### 3. Export Data

1. Go to the **Export** tab
2. Choose format (CSV or JSON)
3. Download your contacts

## 🔧 Configuration

### Frontend Settings

In the **Settings** tab, you can configure:
- API keys for Meta, Google Maps, and TikTok
- Request delays and rate limiting
- Concurrent requests
- Email validation options

### Backend Configuration

**Node.js Scraper** (`scraper-service.js`):
```javascript
const CONFIG = {
  requestDelay: 2000,        // Delay between requests (ms)
  timeout: 30000,            // Page load timeout (ms)
  maxRetries: 3,             // Max retry attempts
  userAgent: 'ContactHarvest/1.0',
  maxConcurrent: 3,          // Max concurrent scrapes
};
```

**Python Scraper** (`scraper.py`):
```python
@dataclass
class ScraperConfig:
    request_delay: tuple = (2, 5)  # Random delay range (seconds)
    timeout: int = 30
    max_retries: int = 3
    max_pages: int = 5
    respect_robots: bool = True
    validate_emails: bool = True
```

## 📊 Data Sources

### Platform APIs (Recommended)

1. **Meta Graph API** - Facebook & Instagram business data
   - Docs: https://developers.facebook.com/docs/graph-api
   
2. **Google Places API** - Business location data
   - Docs: https://developers.google.com/maps/documentation/places
   
3. **Google Business Profile API** - GMB data
   - Docs: https://developers.google.com/my-business
   
4. **TikTok for Developers** - TikTok business data
   - Docs: https://developers.tiktok.com

### Direct Website Scraping

For websites without APIs, use the built-in scraper:
- Extracts emails, phones, addresses
- Follows contact/about pages (deep scrape)
- Respects robots.txt
- Rate limited to avoid overwhelming servers

## ⚖️ Legal & Compliance

### Important Notices

**This tool is for educational and demonstration purposes.** Before using any web scraping tool:

1. **Check Platform ToS**: Each platform (Meta, Google, TikTok) has specific terms
2. **Use Official APIs**: Always prefer official APIs over scraping
3. **Respect robots.txt**: Check before scraping any website
4. **Rate Limiting**: Don't overwhelm servers with requests
5. **Privacy Laws**: Comply with GDPR, CCPA, and other regulations
6. **Opt-Out**: Provide mechanisms for businesses to opt out

### Best Practices

✅ **DO:**
- Use official APIs when available
- Check robots.txt before scraping
- Respect rate limits (2-5 second delays)
- Only scrape publicly available business information
- Provide opt-out mechanisms
- Comply with privacy laws

❌ **DON'T:**
- Scrape behind login walls without permission
- Ignore robots.txt restrictions
- Overwhelm servers with requests
- Scrape personal (non-business) information
- Violate platform Terms of Service
- Use data for spam or harassment

## 🔍 Scraping Techniques

### Static Pages (HTTP Requests)
- Fast and lightweight
- Works for simple HTML pages
- Tools: `requests` + `BeautifulSoup` (Python), `axios` + `cheerio` (Node.js)

### Dynamic Pages (Browser Automation)
- Required for JavaScript-heavy sites
- Slower but more powerful
- Tools: `Puppeteer` (Node.js), `Playwright` (Python/Node.js)

### Email Extraction
- Regex pattern matching
- Mailto link detection
- Schema.org structured data
- Contact page crawling

See `SCRAPING_GUIDE.md` for detailed technical documentation.

## 🐛 Troubleshooting

### Backend Not Connecting

If the frontend shows "Backend service not available":

1. Make sure the backend is running:
   ```bash
   cd backend
   npm start  # or python scraper.py --serve
   ```

2. Check the backend URL in the Web Scraper tab matches your backend port

3. Verify CORS is enabled (should be by default)

### Scraping Fails

Common issues:
- **Blocked by robots.txt**: The site doesn't allow scraping
- **Timeout**: Site is slow or blocking automated access
- **Invalid URL**: Check URL format (include https://)
- **Rate limited**: Too many requests, increase delay

### Demo Mode

If the backend is not running, the frontend will show demo results. This is normal for testing the UI.

## 📝 API Examples

### Scrape Single URL (Node.js Backend)

```bash
curl -X POST http://localhost:3001/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example-business.com", "deep": true}'
```

### Scrape Multiple URLs

```bash
curl -X POST http://localhost:3001/api/scrape/batch \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://business1.com", "https://business2.com"]}'
```

### Python CLI Usage

```bash
# Scrape single URL
python scraper.py --url https://example-business.com

# Deep scrape
python scraper.py --url https://example-business.com --deep

# Batch scrape from file
python scraper.py --batch urls.txt --output results.json
```

## 🚀 Production Deployment

For production use:

1. **Set up proper API keys** for Meta, Google, TikTok
2. **Use a queue system** (Redis + Bull) for managing scraping jobs
3. **Add authentication** to your backend API
4. **Implement database storage** (PostgreSQL recommended)
5. **Add monitoring and logging**
6. **Use rotating proxies** to avoid IP bans
7. **Implement proper error handling**
8. **Add email validation** before storing contacts

## 📚 Additional Resources

- [SCRAPING_GUIDE.md](SCRAPING_GUIDE.md) - Comprehensive scraping guide
- [Puppeteer Documentation](https://pptr.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [BeautifulSoup Documentation](https://www.crummy.com/software/BeautifulSoup/bs4/doc/)
- [Meta Graph API](https://developers.facebook.com/docs/graph-api)
- [Google Places API](https://developers.google.com/maps/documentation/places)

## 🤝 Contributing

This is a demonstration project. For production use, ensure compliance with all applicable laws and platform terms of service.

## 📄 License

This project is for educational purposes. Always comply with platform terms of service and applicable laws when scraping websites.

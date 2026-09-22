# Web Scraping Guide for Contact Extraction

## Overview

Web scraping involves programmatically extracting data from websites. For contact information, we typically extract:
- Email addresses
- Phone numbers
- Business names
- Addresses
- Social media links

## Technical Approaches

### 1. HTTP Request-Based Scraping (Static Pages)

**Best for:** Simple websites with static HTML content
**Tools:** 
- Python: `requests` + `BeautifulSoup`
- Node.js: `axios` + `cheerio`

**Example (Python):**
```python
import requests
from bs4 import BeautifulSoup
import re

def scrape_website(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Extract emails using regex
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    emails = re.findall(email_pattern, response.text)
    
    # Extract phone numbers
    phone_pattern = r'\+?1?\d{9,15}'
    phones = re.findall(phone_pattern, response.text)
    
    # Extract from meta tags
    meta_desc = soup.find('meta', attrs={'name': 'description'})
    business_name = soup.find('title').text if soup.find('title') else ''
    
    return {
        'emails': list(set(emails)),
        'phones': list(set(phones)),
        'business_name': business_name,
        'description': meta_desc['content'] if meta_desc else ''
    }
```

**Example (Node.js):**
```javascript
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeWebsite(url) {
    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = response.data.match(emailRegex) || [];
    
    // Extract from contact page
    const contactLinks = [];
    $('a[href*="contact"], a[href*="about"]').each((i, el) => {
        contactLinks.push($(el).attr('href'));
    });
    
    return {
        emails: [...new Set(emails)],
        contactLinks
    };
}
```

### 2. Browser Automation (Dynamic/JavaScript Pages)

**Best for:** Modern websites that load content with JavaScript
**Tools:**
- Python: `Selenium`, `Playwright`
- Node.js: `Puppeteer`, `Playwright`

**Example (Puppeteer - Node.js):**
```javascript
const puppeteer = require('puppeteer');

async function scrapeDynamicSite(url) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Wait for content to load
    await page.waitForSelector('body');
    
    // Extract emails from page content
    const emails = await page.evaluate(() => {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        return document.body.innerText.match(emailRegex) || [];
    });
    
    // Extract from mailto links
    const mailtoLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href^="mailto:"]'))
            .map(a => a.href.replace('mailto:', ''));
    });
    
    await browser.close();
    
    return {
        emails: [...new Set([...emails, ...mailtoLinks])]
    };
}
```

**Example (Playwright - Python):**
```python
from playwright.sync_api import sync_playwright
import re

def scrape_with_playwright(url):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url, wait_until='networkidle')
        
        # Extract all text content
        content = page.inner_text('body')
        
        # Find emails
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        emails = re.findall(email_pattern, content)
        
        # Extract mailto links
        mailto_links = page.eval_on_selector_all(
            'a[href^="mailto:"]',
            'elements => elements.map(e => e.href.replace("mailto:", ""))'
        )
        
        browser.close()
        
        return {
            'emails': list(set(emails + mailto_links))
        }
```

### 3. API-Based Extraction

**Best for:** Platforms with official APIs (most reliable and legal)

**Meta/Facebook Graph API:**
```python
import requests

def get_facebook_business(page_id, access_token):
    url = f'https://graph.facebook.com/v18.0/{page_id}'
    params = {
        'fields': 'name,email,phone,website,address',
        'access_token': access_token
    }
    
    response = requests.get(url, params=params)
    return response.json()
```

**Google Places API:**
```python
import requests

def search_google_places(query, location, api_key):
    url = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
    params = {
        'query': query,
        'location': location,
        'key': api_key
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    results = []
    for place in data.get('results', []):
        # Get place details
        details_url = f'https://maps.googleapis.com/maps/api/place/details/json'
        details_params = {
            'place_id': place['place_id'],
            'fields': 'name,formatted_phone_number,website,formatted_address',
            'key': api_key
        }
        
        details_response = requests.get(details_url, params=details_params)
        results.append(details_response.json().get('result', {}))
    
    return results
```

**TikTok Business API:**
```python
import requests

def get_tiktok_business(username, access_token):
    url = f'https://open.tiktokapis.com/v2/user/info/'
    headers = {
        'Authorization': f'Bearer {access_token}'
    }
    params = {
        'fields': 'display_name,avatar_url,profile_description'
    }
    
    response = requests.get(url, headers=headers, params=params)
    return response.json()
```

## Advanced Techniques

### 1. Multi-Page Crawling

```python
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

def crawl_website(start_url, max_pages=10):
    visited = set()
    to_visit = [start_url]
    all_emails = []
    
    while to_visit and len(visited) < max_pages:
        url = to_visit.pop(0)
        
        if url in visited:
            continue
            
        visited.add(url)
        
        try:
            response = requests.get(url, timeout=10)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract emails
            email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
            emails = re.findall(email_pattern, response.text)
            all_emails.extend(emails)
            
            # Find contact pages
            for link in soup.find_all('a', href=True):
                href = link['href']
                full_url = urljoin(url, href)
                
                # Only follow links on same domain
                if urlparse(full_url).netloc == urlparse(start_url).netloc:
                    if 'contact' in href.lower() or 'about' in href.lower():
                        if full_url not in visited:
                            to_visit.append(full_url)
        except:
            continue
    
    return list(set(all_emails))
```

### 2. Email Validation

```python
import re
import dns.resolver
import smtplib

def validate_email_format(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_email_domain(email):
    domain = email.split('@')[1]
    try:
        records = dns.resolver.resolve(domain, 'MX')
        return len(records) > 0
    except:
        return False

def validate_email_deliverable(email):
    # Note: This can get you blocked if done excessively
    domain = email.split('@')[1]
    try:
        records = dns.resolver.resolve(domain, 'MX')
        mx_record = records[0].exchange.to_text()
        
        server = smtplib.SMTP(timeout=10)
        server.set_debuglevel(0)
        server.connect(mx_record)
        server.helo(server.local_hostname)
        server.mail('test@example.com')
        code, message = server.rcpt(email)
        server.quit()
        
        return code == 250
    except:
        return False
```

### 3. Rate Limiting & Respect

```python
import time
import random

class EthicalScraper:
    def __init__(self, delay_range=(2, 5)):
        self.delay_range = delay_range
        self.request_count = 0
    
    def wait(self):
        """Wait between requests to avoid overwhelming servers"""
        delay = random.uniform(*self.delay_range)
        time.sleep(delay)
    
    def check_robots_txt(self, url):
        """Check if scraping is allowed"""
        from urllib.parse import urlparse
        import requests
        
        domain = urlparse(url).netloc
        robots_url = f'https://{domain}/robots.txt'
        
        try:
            response = requests.get(robots_url, timeout=5)
            return response.text
        except:
            return None
    
    def should_scrape(self, url):
        """Check robots.txt before scraping"""
        robots_content = self.check_robots_txt(url)
        if robots_content:
            # Simple check - in production, use a proper robots.txt parser
            if 'Disallow: /' in robots_content:
                return False
        return True
```

## Integration with ContactHarvest

### Backend Service Example (Node.js/Express)

```javascript
const express = require('express');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');

const app = express();

// Scraper service
class ContactScraper {
    async scrapeWebsite(url) {
        try {
            const browser = await puppeteer.launch({ 
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            const page = await browser.newPage();
            await page.setUserAgent('ContactHarvest/1.0 (Business Contact Finder)');
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            
            // Extract emails
            const emails = await page.evaluate(() => {
                const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                const text = document.body.innerText;
                const matches = text.match(emailRegex) || [];
                
                // Also check mailto links
                const mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]'))
                    .map(a => a.href.replace('mailto:', ''));
                
                return [...new Set([...matches, ...mailtoLinks])];
            });
            
            // Extract business info
            const businessInfo = await page.evaluate(() => {
                const title = document.querySelector('title')?.innerText || '';
                const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
                const phone = document.body.innerText.match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/g) || [];
                
                return {
                    name: title.split('|')[0].trim(),
                    description: metaDesc,
                    phones: [...new Set(phone)]
                };
            });
            
            await browser.close();
            
            return {
                success: true,
                emails,
                ...businessInfo,
                source: 'website'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async scrapeMultiple(urls) {
        const results = [];
        
        for (const url of urls) {
            const result = await this.scrapeWebsite(url);
            results.push({ url, ...result });
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        return results;
    }
}

const scraper = new ContactScraper();

// API endpoint
app.post('/api/scrape', async (req, res) => {
    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls)) {
        return res.status(400).json({ error: 'URLs array required' });
    }
    
    const results = await scraper.scrapeMultiple(urls);
    res.json({ results });
});

app.listen(3001, () => {
    console.log('Scraping service running on port 3001');
});
```

### Frontend Integration (React)

```typescript
// Add to your React app
async function scrapeWebsites(urls: string[]) {
    const response = await fetch('http://localhost:3001/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls })
    });
    
    const data = await response.json();
    return data.results;
}

// Usage in component
const handleWebsiteScrape = async () => {
    const urls = [
        'https://example-business.com',
        'https://another-business.com'
    ];
    
    const results = await scrapeWebsites(urls);
    
    // Add to existing results
    const newContacts = results
        .filter(r => r.success && r.emails.length > 0)
        .map(r => ({
            id: Date.now().toString() + Math.random(),
            businessName: r.name || 'Unknown',
            email: r.emails[0],
            phone: r.phones?.[0] || '',
            website: r.url,
            address: '',
            source: 'website',
            category: 'Website Scrape',
            verified: false,
            lastUpdated: new Date().toISOString().split('T')[0]
        }));
    
    setResults(prev => [...prev, ...newContacts]);
};
```

## Legal & Ethical Guidelines

### ✅ DO:
- Check robots.txt before scraping
- Use official APIs when available
- Respect rate limits (2-5 second delays)
- Identify your scraper with a proper User-Agent
- Only scrape publicly available information
- Comply with GDPR, CCPA, and other privacy laws
- Provide opt-out mechanisms for contacted businesses

### ❌ DON'T:
- Scrape behind login walls without permission
- Ignore robots.txt restrictions
- Overwhelm servers with requests
- Scrape personal (non-business) information
- Violate platform Terms of Service
- Use scraped data for spam or harassment

## Recommended Tech Stack

**For Production:**
- **Backend:** Node.js + Express or Python + FastAPI
- **Scraping:** Puppeteer/Playwright for dynamic sites, Cheerio/BeautifulSoup for static
- **Queue:** Redis + Bull (for managing scraping jobs)
- **Database:** PostgreSQL (for storing contacts)
- **Proxy:** Use rotating proxies to avoid IP bans

**For Our ContactHarvest App:**
- Add a backend service (Node.js/Express)
- Integrate Puppeteer for website scraping
- Use official APIs for Meta, Google, TikTok
- Implement rate limiting and queuing
- Add email validation before storing

## Next Steps

1. Set up a backend service (Node.js/Express)
2. Implement Puppeteer-based website scraper
3. Add official API integrations (Meta, Google, TikTok)
4. Implement email validation
5. Add rate limiting and queuing system
6. Update frontend to call backend API
7. Add proper error handling and logging
8. Implement data persistence (database)

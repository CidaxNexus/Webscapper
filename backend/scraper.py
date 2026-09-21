"""
ContactHarvest - Python Web Scraper
====================================

A comprehensive web scraping tool for extracting business contact information.

SETUP:
    pip install requests beautifulsoup4 playwright lxml
    playwright install chromium

USAGE:
    python scraper.py --url https://example-business.com
    python scraper.py --batch urls.txt --output results.json
    python scraper.py --serve  # Run as API server
"""

import re
import json
import time
import random
import argparse
import logging
from urllib.parse import urljoin, urlparse
from typing import List, Dict, Optional, Set
from dataclasses import dataclass, asdict
from datetime import datetime

import requests
from bs4 import BeautifulSoup

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ============================================
# CONFIGURATION
# ============================================

@dataclass
class ScraperConfig:
    request_delay: tuple = (2, 5)  # Random delay range (seconds)
    timeout: int = 30
    max_retries: int = 3
    max_pages: int = 5
    user_agent: str = 'ContactHarvest/1.0 (Business Contact Finder; +https://contactharvest.app)'
    respect_robots: bool = True
    validate_emails: bool = True
    
    # Email blacklist (common false positives)
    email_blacklist: Set[str] = {
        'example.com', 'test.com', 'email.com', 'domain.com',
        'sentry.io', 'wixpress.com', 'sentry-next-browser',
    }


# ============================================
# DATA MODELS
# ============================================

@dataclass
class ScrapedContact:
    url: str
    business_name: str = ''
    emails: List[str] = None
    phones: List[str] = None
    address: str = ''
    social_links: Dict[str, List[str]] = None
    description: str = ''
    pages_scraped: int = 1
    success: bool = True
    error: str = ''
    scraped_at: str = ''
    
    def __post_init__(self):
        if self.emails is None:
            self.emails = []
        if self.phones is None:
            self.phones = []
        if self.social_links is None:
            self.social_links = {}
        if not self.scraped_at:
            self.scraped_at = datetime.now().isoformat()


# ============================================
# UTILITY FUNCTIONS
# ============================================

def extract_emails(text: str, blacklist: Set[str] = None) -> List[str]:
    """Extract email addresses from text using regex."""
    if blacklist is None:
        blacklist = ScraperConfig().email_blacklist
    
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    matches = re.findall(email_pattern, text)
    
    # Filter and deduplicate
    valid_emails = []
    for email in matches:
        email = email.lower().strip()
        domain = email.split('@')[1] if '@' in email else ''
        
        # Skip blacklisted domains
        if any(bl in domain for bl in blacklist):
            continue
        
        # Skip common false positives
        if email.startswith(('image@', 'photo@', 'noreply@', 'no-reply@')):
            continue
        
        valid_emails.append(email)
    
    return list(set(valid_emails))


def extract_phones(text: str) -> List[str]:
    """Extract phone numbers from text."""
    phone_patterns = [
        r'\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}',  # US format
        r'\+\d{1,3}[\s.-]?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{1,9}',  # International
        r'\(\d{3}\)\s?\d{3}[-.]?\d{4}',  # (XXX) XXX-XXXX
    ]
    
    phones = []
    for pattern in phone_patterns:
        matches = re.findall(pattern, text)
        phones.extend(matches)
    
    # Clean and deduplicate
    cleaned = []
    for phone in phones:
        phone = phone.strip()
        if len(re.sub(r'\D', '', phone)) >= 10:
            cleaned.append(phone)
    
    return list(set(cleaned))


def extract_social_links(soup: BeautifulSoup) -> Dict[str, List[str]]:
    """Extract social media links from HTML."""
    social = {
        'facebook': [],
        'instagram': [],
        'twitter': [],
        'linkedin': [],
        'tiktok': [],
        'youtube': [],
        'pinterest': [],
    }
    
    patterns = {
        'facebook': ['facebook.com', 'fb.com'],
        'instagram': ['instagram.com'],
        'twitter': ['twitter.com', 'x.com'],
        'linkedin': ['linkedin.com'],
        'tiktok': ['tiktok.com'],
        'youtube': ['youtube.com', 'youtu.be'],
        'pinterest': ['pinterest.com'],
    }
    
    for link in soup.find_all('a', href=True):
        href = link['href'].lower()
        for platform, domains in patterns.items():
            if any(domain in href for domain in domains):
                social[platform].append(link['href'])
    
    # Deduplicate
    return {k: list(set(v)) for k, v in social.items() if v}


def check_robots_txt(url: str, config: ScraperConfig) -> Optional[str]:
    """Fetch and return robots.txt content."""
    try:
        parsed = urlparse(url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        
        response = requests.get(
            robots_url,
            timeout=5,
            headers={'User-Agent': config.user_agent}
        )
        
        if response.status_code == 200:
            return response.text
    except Exception:
        pass
    
    return None


def is_allowed_by_robots(robots_txt: str, path: str) -> bool:
    """Check if a path is allowed by robots.txt."""
    if not robots_txt:
        return True
    
    lines = robots_txt.split('\n')
    is_disallowed = False
    
    for line in lines:
        line = line.strip().lower()
        
        if line.startswith('disallow:'):
            disallowed_path = line.replace('disallow:', '').strip()
            if disallowed_path == '/' or path.startswith(disallowed_path):
                is_disallowed = True
        
        if line.startswith('allow:') and is_disallowed:
            allowed_path = line.replace('allow:', '').strip()
            if path.startswith(allowed_path):
                is_disallowed = False
    
    return not is_disallowed


# ============================================
# SCRAPER CLASS
# ============================================

class ContactScraper:
    """Main scraper class for extracting business contact information."""
    
    def __init__(self, config: ScraperConfig = None):
        self.config = config or ScraperConfig()
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': self.config.user_agent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        })
    
    def _wait(self):
        """Wait a random amount of time between requests."""
        delay = random.uniform(*self.config.request_delay)
        time.sleep(delay)
    
    def _fetch_page(self, url: str) -> Optional[str]:
        """Fetch a page with retries."""
        for attempt in range(self.config.max_retries):
            try:
                response = self.session.get(url, timeout=self.config.timeout)
                response.raise_for_status()
                return response.text
            except requests.RequestException as e:
                logger.warning(f"Attempt {attempt + 1} failed for {url}: {e}")
                if attempt < self.config.max_retries - 1:
                    self._wait()
        
        return None
    
    def scrape(self, url: str) -> ScrapedContact:
        """Scrape a single URL for contact information."""
        logger.info(f"Scraping: {url}")
        
        # Validate URL
        try:
            parsed = urlparse(url)
            if not parsed.scheme:
                url = 'https://' + url
                parsed = urlparse(url)
        except Exception:
            return ScrapedContact(url=url, success=False, error='Invalid URL')
        
        # Check robots.txt
        if self.config.respect_robots:
            robots_txt = check_robots_txt(url, self.config)
            path = parsed.path or '/'
            
            if not is_allowed_by_robots(robots_txt, path):
                return ScrapedContact(url=url, success=False, error='Blocked by robots.txt')
        
        # Fetch page
        html = self._fetch_page(url)
        if not html:
            return ScrapedContact(url=url, success=False, error='Failed to fetch page')
        
        # Parse HTML
        soup = BeautifulSoup(html, 'lxml')
        
        # Extract business name
        business_name = ''
        og_title = soup.find('meta', property='og:title')
        if og_title:
            business_name = og_title.get('content', '')
        elif soup.title:
            business_name = soup.title.string.split('|')[0].split('-')[0].strip()
        
        # Extract meta description
        description = ''
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc:
            description = meta_desc.get('content', '')
        
        # Extract emails
        emails = extract_emails(html, self.config.email_blacklist)
        
        # Also check mailto links
        mailto_links = [
            a['href'].replace('mailto:', '').split('?')[0]
            for a in soup.find_all('a', href=lambda h: h and h.startswith('mailto:'))
        ]
        emails = list(set(emails + mailto_links))
        
        # Extract phones
        phones = extract_phones(soup.get_text())
        
        # Also check tel links
        tel_links = [
            a['href'].replace('tel:', '')
            for a in soup.find_all('a', href=lambda h: h and h.startswith('tel:'))
        ]
        phones = list(set(phones + tel_links))
        
        # Extract social links
        social_links = extract_social_links(soup)
        
        # Extract address from schema.org
        address = ''
        address_el = soup.find(attrs={'itemtype': re.compile('PostalAddress')})
        if address_el:
            parts = []
            street = address_el.find(attrs={'itemprop': 'streetAddress'})
            city = address_el.find(attrs={'itemprop': 'addressLocality'})
            state = address_el.find(attrs={'itemprop': 'addressRegion'})
            zipcode = address_el.find(attrs={'itemprop': 'postalCode'})
            
            if street: parts.append(street.get_text().strip())
            if city: parts.append(city.get_text().strip())
            if state: parts.append(state.get_text().strip())
            if zipcode: parts.append(zipcode.get_text().strip())
            
            address = ', '.join(parts)
        
        return ScrapedContact(
            url=url,
            business_name=business_name,
            emails=emails,
            phones=phones,
            address=address,
            social_links=social_links,
            description=description,
        )
    
    def scrape_deep(self, url: str, max_pages: int = None) -> ScrapedContact:
        """Scrape a website deeply, following contact/about links."""
        max_pages = max_pages or self.config.max_pages
        
        # First page
        first_result = self.scrape(url)
        if not first_result.success:
            return first_result
        
        # Find contact pages
        html = self._fetch_page(url)
        if not html:
            return first_result
        
        soup = BeautifulSoup(html, 'lxml')
        contact_urls = set()
        
        for link in soup.find_all('a', href=True):
            href = link['href'].lower()
            text = link.get_text().lower()
            
            if any(kw in href or kw in text for kw in ['contact', 'about', 'reach']):
                full_url = urljoin(url, link['href'])
                if urlparse(full_url).netloc == urlparse(url).netloc:
                    contact_urls.add(full_url)
        
        # Scrape additional pages
        all_emails = set(first_result.emails)
        all_phones = set(first_result.phones)
        all_social = first_result.social_links.copy()
        pages_scraped = 1
        
        for contact_url in list(contact_urls)[:max_pages - 1]:
            self._wait()
            
            result = self.scrape(contact_url)
            if result.success:
                pages_scraped += 1
                all_emails.update(result.emails)
                all_phones.update(result.phones)
                
                for platform, links in result.social_links.items():
                    if platform not in all_social:
                        all_social[platform] = []
                    all_social[platform].extend(links)
        
        return ScrapedContact(
            url=url,
            business_name=first_result.business_name,
            emails=list(all_emails),
            phones=list(all_phones),
            address=first_result.address,
            social_links=all_social,
            description=first_result.description,
            pages_scraped=pages_scraped,
        )
    
    def scrape_batch(self, urls: List[str]) -> List[ScrapedContact]:
        """Scrape multiple URLs."""
        results = []
        
        for url in urls:
            result = self.scrape(url)
            results.append(result)
            self._wait()
        
        return results


# ============================================
# DYNAMIC PAGE SCRAPER (Playwright)
# ============================================

class DynamicScraper:
    """Scraper for JavaScript-heavy websites using Playwright."""
    
    def __init__(self, config: ScraperConfig = None):
        self.config = config or ScraperConfig()
    
    async def scrape(self, url: str) -> ScrapedContact:
        """Scrape a dynamic website using Playwright."""
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            return ScrapedContact(
                url=url, success=False,
                error='Playwright not installed. Run: pip install playwright && playwright install chromium'
            )
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            await page.set_extra_http_headers({
                'User-Agent': self.config.user_agent
            })
            
            try:
                await page.goto(url, wait_until='networkidle', timeout=self.config.timeout * 1000)
                
                # Wait for content
                await page.wait_for_timeout(2000)
                
                # Extract all text
                content = await page.inner_text('body')
                html = await page.content()
                
                # Extract data
                emails = extract_emails(content + html, self.config.email_blacklist)
                phones = extract_phones(content)
                
                # Get mailto links
                mailto_links = await page.eval_on_selector_all(
                    'a[href^="mailto:"]',
                    'elements => elements.map(e => e.href.replace("mailto:", "").split("?")[0])'
                )
                emails = list(set(emails + mailto_links))
                
                # Get title
                title = await page.title()
                business_name = title.split('|')[0].split('-')[0].strip()
                
                await browser.close()
                
                return ScrapedContact(
                    url=url,
                    business_name=business_name,
                    emails=emails,
                    phones=phones,
                )
                
            except Exception as e:
                await browser.close()
                return ScrapedContact(url=url, success=False, error=str(e))


# ============================================
# API SERVER
# ============================================

def run_api_server(host='0.0.0.0', port=8000):
    """Run the scraper as a REST API server."""
    try:
        from fastapi import FastAPI, HTTPException
        from fastapi.middleware.cors import CORSMiddleware
        import uvicorn
    except ImportError:
        print("FastAPI not installed. Run: pip install fastapi uvicorn")
        return
    
    app = FastAPI(title="ContactHarvest Scraper API")
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    scraper = ContactScraper()
    
    @app.get("/api/health")
    def health():
        return {"status": "ok"}
    
    @app.post("/api/scrape")
    def scrape_endpoint(url: str, deep: bool = False):
        if deep:
            result = scraper.scrape_deep(url)
        else:
            result = scraper.scrape(url)
        return asdict(result)
    
    @app.post("/api/scrape/batch")
    def scrape_batch(urls: List[str]):
        results = scraper.scrape_batch(urls)
        return {"results": [asdict(r) for r in results]}
    
    @app.post("/api/extract-emails")
    def extract_emails_endpoint(text: str):
        emails = extract_emails(text)
        return {"emails": emails}
    
    uvicorn.run(app, host=host, port=port)


# ============================================
# CLI
# ============================================

def main():
    parser = argparse.ArgumentParser(description='ContactHarvest Web Scraper')
    parser.add_argument('--url', type=str, help='Single URL to scrape')
    parser.add_argument('--batch', type=str, help='File with URLs (one per line)')
    parser.add_argument('--output', type=str, default='results.json', help='Output file')
    parser.add_argument('--deep', action='store_true', help='Deep scrape (follow contact links)')
    parser.add_argument('--serve', action='store_true', help='Run as API server')
    parser.add_argument('--port', type=int, default=8000, help='API server port')
    parser.add_argument('--dynamic', action='store_true', help='Use Playwright for JS-heavy sites')
    
    args = parser.parse_args()
    
    if args.serve:
        run_api_server(port=args.port)
        return
    
    scraper = ContactScraper()
    
    if args.url:
        if args.deep:
            result = scraper.scrape_deep(args.url)
        else:
            result = scraper.scrape(args.url)
        
        print(json.dumps(asdict(result), indent=2))
        
    elif args.batch:
        with open(args.batch, 'r') as f:
            urls = [line.strip() for line in f if line.strip()]
        
        results = scraper.scrape_batch(urls)
        
        with open(args.output, 'w') as f:
            json.dump([asdict(r) for r in results], f, indent=2)
        
        print(f"Scraped {len(results)} URLs. Results saved to {args.output}")
    
    else:
        parser.print_help()


if __name__ == '__main__':
    main()

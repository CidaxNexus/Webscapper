/**
 * ContactHarvest - Website Scraper Service
 * 
 * This service scrapes business websites to extract contact information.
 * It uses Puppeteer for JavaScript-heavy sites and Cheerio for static pages.
 * 
 * SETUP:
 * 1. npm install express cors puppeteer cheerio axios
 * 2. node scraper-service.js
 * 3. The service runs on http://localhost:3001
 */

const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  requestDelay: 2000,        // Delay between requests (ms)
  timeout: 30000,            // Page load timeout (ms)
  maxRetries: 3,             // Max retry attempts
  userAgent: 'ContactHarvest/1.0 (Business Contact Finder; +https://contactharvest.app)',
  maxConcurrent: 3,          // Max concurrent scrapes
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Extract emails from text using regex
 */
function extractEmails(text) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex) || [];
  
  // Filter out common false positives
  const blacklist = [
    'example.com', 'test.com', 'email.com', 'domain.com',
    'your@email.com', 'name@domain.com', 'user@example.com',
    'sentry.io', 'webpack', '.png', '.jpg', '.gif', '.svg', '.css', '.js'
  ];
  
  return [...new Set(matches.filter(email => {
    const domain = email.split('@')[1]?.toLowerCase();
    return !blacklist.some(b => domain?.includes(b));
  }))];
}

/**
 * Extract phone numbers from text
 */
function extractPhones(text) {
  const phonePatterns = [
    /\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,  // US format
    /\+\d{1,3}[\s.-]?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g, // International
  ];
  
  let phones = [];
  for (const pattern of phonePatterns) {
    const matches = text.match(pattern) || [];
    phones = phones.concat(matches);
  }
  
  return [...new Set(phones.map(p => p.trim()).filter(p => p.length >= 10))];
}

/**
 * Extract social media links
 */
function extractSocialLinks($) {
  const social = {
    facebook: [],
    instagram: [],
    twitter: [],
    linkedin: [],
    tiktok: [],
    youtube: []
  };
  
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    
    if (href.includes('facebook.com') || href.includes('fb.com')) social.facebook.push(href);
    if (href.includes('instagram.com')) social.instagram.push(href);
    if (href.includes('twitter.com') || href.includes('x.com')) social.twitter.push(href);
    if (href.includes('linkedin.com')) social.linkedin.push(href);
    if (href.includes('tiktok.com')) social.tiktok.push(href);
    if (href.includes('youtube.com')) social.youtube.push(href);
  });
  
  // Deduplicate
  Object.keys(social).forEach(key => {
    social[key] = [...new Set(social[key])];
  });
  
  return social;
}

/**
 * Check robots.txt
 */
async function checkRobotsTxt(url) {
  try {
    const urlObj = new URL(url);
    const robotsUrl = `${urlObj.protocol}//${urlObj.hostname}/robots.txt`;
    
    const response = await axios.get(robotsUrl, { 
      timeout: 5000,
      headers: { 'User-Agent': CONFIG.userAgent }
    });
    
    return response.data;
  } catch {
    return null; // If robots.txt doesn't exist, assume OK
  }
}

/**
 * Check if URL is allowed by robots.txt
 */
function isAllowedByRobots(robotsTxt, path) {
  if (!robotsTxt) return true;
  
  const lines = robotsTxt.split('\n');
  let isDisallowed = false;
  
  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    
    if (trimmed.startsWith('disallow:')) {
      const disallowedPath = trimmed.replace('disallow:', '').trim();
      if (disallowedPath === '/' || path.startsWith(disallowedPath)) {
        isDisallowed = true;
      }
    }
    
    if (trimmed.startsWith('allow:') && isDisallowed) {
      const allowedPath = trimmed.replace('allow:', '').trim();
      if (path.startsWith(allowedPath)) {
        isDisallowed = false;
      }
    }
  }
  
  return !isDisallowed;
}

// ============================================
// SCRAPER CLASS
// ============================================

class WebsiteScraper {
  constructor() {
    this.browser = null;
    this.activeRequests = 0;
  }
  
  async init() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ]
      });
    }
  }
  
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
  
  /**
   * Scrape a single website for contact information
   */
  async scrape(url) {
    // Validate URL
    try {
      new URL(url);
    } catch {
      return { success: false, error: 'Invalid URL' };
    }
    
    // Check robots.txt
    const robotsTxt = await checkRobotsTxt(url);
    const urlPath = new URL(url).pathname;
    
    if (!isAllowedByRobots(robotsTxt, urlPath)) {
      return { success: false, error: 'Blocked by robots.txt' };
    }
    
    // Rate limiting
    if (this.activeRequests >= CONFIG.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.requestDelay));
    }
    
    this.activeRequests++;
    
    try {
      await this.init();
      const page = await this.browser.newPage();
      
      // Set user agent
      await page.setUserAgent(CONFIG.userAgent);
      
      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Block unnecessary resources to speed up
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });
      
      // Navigate to page
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: CONFIG.timeout
      });
      
      // Extract data
      const result = await page.evaluate(() => {
        const getText = () => document.body.innerText || '';
        const getHTML = () => document.body.innerHTML || '';
        
        // Get title
        const title = document.title || '';
        
        // Get meta description
        const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
        
        // Get business name from various sources
        const ogTitle = document.querySelector('meta[property="og:title"]')?.content || '';
        const businessName = ogTitle || title.split('|')[0].split('-')[0].trim();
        
        // Get mailto links
        const mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]'))
          .map(a => a.href.replace('mailto:', '').split('?')[0]);
        
        // Get tel links
        const telLinks = Array.from(document.querySelectorAll('a[href^="tel:"]'))
          .map(a => a.href.replace('tel:', ''));
        
        // Get address from schema.org
        const addressEl = document.querySelector('[itemtype*="PostalAddress"]');
        let address = '';
        if (addressEl) {
          const streetAddress = addressEl.querySelector('[itemprop="streetAddress"]')?.textContent || '';
          const city = addressEl.querySelector('[itemprop="addressLocality"]')?.textContent || '';
          const state = addressEl.querySelector('[itemprop="addressRegion"]')?.textContent || '';
          const zip = addressEl.querySelector('[itemprop="postalCode"]')?.textContent || '';
          address = [streetAddress, city, state, zip].filter(Boolean).join(', ');
        }
        
        // Look for contact page links
        const contactLinks = [];
        document.querySelectorAll('a[href]').forEach(a => {
          const href = a.href.toLowerCase();
          const text = a.textContent.toLowerCase();
          if (href.includes('contact') || text.includes('contact') || 
              href.includes('about') || text.includes('about us')) {
            contactLinks.push(a.href);
          }
        });
        
        return {
          title: businessName,
          description: metaDesc,
          text: getText().substring(0, 50000), // Limit text size
          mailtoLinks,
          telLinks,
          address,
          contactLinks: [...new Set(contactLinks)].slice(0, 5)
        };
      });
      
      // Extract emails from page text + mailto links
      const emailsFromText = extractEmails(result.text);
      const emailsFromMailto = result.mailtoLinks;
      const allEmails = [...new Set([...emailsFromText, ...emailsFromMailto])];
      
      // Extract phones
      const phonesFromText = extractPhones(result.text);
      const phonesFromTel = result.telLinks;
      const allPhones = [...new Set([...phonesFromText, ...phonesFromTel])];
      
      // Get page HTML for social links
      const html = await page.content();
      const $ = cheerio.load(html);
      const socialLinks = extractSocialLinks($);
      
      await page.close();
      
      return {
        success: true,
        url,
        businessName: result.title,
        description: result.description,
        emails: allEmails,
        phones: allPhones,
        address: result.address,
        socialLinks,
        contactPages: result.contactLinks,
        scrapedAt: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        success: false,
        url,
        error: error.message
      };
    } finally {
      this.activeRequests--;
    }
  }
  
  /**
   * Scrape multiple pages of a website (follow contact links)
   */
  async scrapeDeep(url, maxPages = 3) {
    const firstResult = await this.scrape(url);
    
    if (!firstResult.success || !firstResult.contactPages.length) {
      return [firstResult];
    }
    
    const results = [firstResult];
    
    // Scrape additional contact pages
    for (const contactUrl of firstResult.contactPages.slice(0, maxPages - 1)) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.requestDelay));
      
      const contactResult = await this.scrape(contactUrl);
      if (contactResult.success) {
        results.push(contactResult);
      }
    }
    
    // Merge all results
    const merged = {
      success: true,
      url,
      businessName: firstResult.businessName,
      description: firstResult.description,
      emails: [...new Set(results.flatMap(r => r.emails))],
      phones: [...new Set(results.flatMap(r => r.phones))],
      address: results.find(r => r.address)?.address || '',
      socialLinks: results.reduce((acc, r) => {
        Object.keys(r.socialLinks).forEach(key => {
          acc[key] = [...new Set([...(acc[key] || []), ...r.socialLinks[key]])];
        });
        return acc;
      }, {}),
      pagesScraped: results.length,
      scrapedAt: new Date().toISOString()
    };
    
    return merged;
  }
  
  /**
   * Batch scrape multiple websites
   */
  async scrapeBatch(urls) {
    const results = [];
    
    for (const url of urls) {
      const result = await this.scrape(url);
      results.push(result);
      
      // Rate limiting between requests
      await new Promise(resolve => setTimeout(resolve, CONFIG.requestDelay));
    }
    
    return results;
  }
}

// ============================================
// API ENDPOINTS
// ============================================

const scraper = new WebsiteScraper();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeRequests: scraper.activeRequests });
});

// Scrape single URL
app.post('/api/scrape', async (req, res) => {
  const { url, deep = false } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  try {
    const result = deep 
      ? await scraper.scrapeDeep(url)
      : await scraper.scrape(url);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Scrape multiple URLs
app.post('/api/scrape/batch', async (req, res) => {
  const { urls } = req.body;
  
  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({ error: 'URLs array is required' });
  }
  
  try {
    const results = await scraper.scrapeBatch(urls);
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Extract emails from raw HTML/text
app.post('/api/extract-emails', (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }
  
  const emails = extractEmails(text);
  res.json({ emails });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await scraper.close();
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 ContactHarvest Scraper Service`);
  console.log(`   Running on http://localhost:${PORT}`);
  console.log(`\n📡 Endpoints:`);
  console.log(`   POST /api/scrape        - Scrape single URL`);
  console.log(`   POST /api/scrape/batch  - Scrape multiple URLs`);
  console.log(`   POST /api/extract-emails - Extract emails from text`);
  console.log(`   GET  /api/health        - Health check`);
  console.log(`\n⚙️  Config:`);
  console.log(`   Delay: ${CONFIG.requestDelay}ms`);
  console.log(`   Timeout: ${CONFIG.timeout}ms`);
  console.log(`   Max Concurrent: ${CONFIG.maxConcurrent}\n`);
});

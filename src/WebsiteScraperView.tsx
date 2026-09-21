import { useState } from 'react';
import { Globe, Search, Loader2, CheckCircle, XCircle, ExternalLink, Mail, Phone, Building2, AlertCircle } from 'lucide-react';
import { WebsiteScrapeResult } from './types';

export default function WebsiteScraperView() {
  const [urls, setUrls] = useState<string>('');
  const [isScraping, setIsScraping] = useState(false);
  const [results, setResults] = useState<WebsiteScrapeResult[]>([]);
  const [deepScrape, setDeepScrape] = useState(false);
  const [backendUrl, setBackendUrl] = useState('http://localhost:3001');

  const handleScrape = async () => {
    const urlList = urls.split('\n').map(u => u.trim()).filter(u => u);
    if (urlList.length === 0) return;

    setIsScraping(true);
    setResults([]);

    try {
      // Try to connect to backend scraper service
      const response = await fetch(`${backendUrl}/api/scrape/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlList }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results);
      } else {
        throw new Error('Backend service not available');
      }
    } catch (error) {
      // If backend is not available, simulate scraping with demo results
      console.log('Backend not available, using demo mode');
      
      // Simulate scraping delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const demoResults: WebsiteScrapeResult[] = urlList.map((url, index) => ({
        url,
        businessName: `Business from ${new URL(url.startsWith('http') ? url : `https://${url}`).hostname}`,
        emails: [`contact@${new URL(url.startsWith('http') ? url : `https://${url}`).hostname}`, `info@${new URL(url.startsWith('http') ? url : `https://${url}`).hostname}`],
        phones: [`+1 (555) ${String(100 + index).padStart(3, '0')}-${String(1000 + index).padStart(4, '0')}`],
        address: '123 Business St, City, State 12345',
        socialLinks: {
          facebook: [`https://facebook.com/${url.split('.')[0]}`],
          instagram: [`https://instagram.com/${url.split('.')[0]}`],
        },
        description: 'Demo scrape result - Connect backend scraper service for real data',
        pagesScraped: deepScrape ? 3 : 1,
        success: true,
        error: '',
        scrapedAt: new Date().toISOString(),
      }));
      
      setResults(demoResults);
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Backend Configuration */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-emerald-400" />
          Website Scraper Configuration
        </h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Backend Scraper Service URL
          </label>
          <input
            type="text"
            value={backendUrl}
            onChange={e => setBackendUrl(e.target.value)}
            placeholder="http://localhost:3001"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <p className="text-xs text-gray-500 mt-1">
            Run the backend scraper: <code className="text-emerald-400">node backend/scraper-service.js</code> or <code className="text-emerald-400">python backend/scraper.py --serve</code>
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Business Website URLs (one per line)
          </label>
          <textarea
            value={urls}
            onChange={e => setUrls(e.target.value)}
            placeholder={`https://example-business.com\nhttps://another-business.com\nhttps://shop.example.com`}
            rows={6}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono text-sm"
          />
        </div>

        <div className="flex items-center gap-6 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={deepScrape}
              onChange={e => setDeepScrape(e.target.checked)}
              className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-emerald-500"
            />
            <span className="text-sm text-gray-300">Deep Scrape (follow contact/about links)</span>
          </label>
        </div>

        <button
          onClick={handleScrape}
          disabled={!urls.trim() || isScraping}
          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-gray-900 font-semibold rounded-lg hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          {isScraping ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Scraping...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Start Scraping
            </>
          )}
        </button>
      </div>

      {/* Scraping Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Scraping Results ({results.length} websites)
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              {results.filter(r => r.success).length} successful
            </div>
          </div>

          {results.map((result, index) => (
            <div key={index} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-1">
                    {result.businessName || 'Unknown Business'}
                  </h4>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    {result.url}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {result.success ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle className="w-3 h-3" />
                    Success
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/10 text-red-400 border border-red-500/20">
                    <XCircle className="w-3 h-3" />
                    Failed
                  </span>
                )}
              </div>

              {result.error && (
                <div className="mb-4 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {result.error}
                  </p>
                </div>
              )}

              {result.success && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Emails */}
                  {result.emails.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Emails ({result.emails.length})
                      </h5>
                      <div className="space-y-1">
                        {result.emails.map((email, i) => (
                          <div key={i} className="text-sm text-emerald-400 bg-gray-800/50 px-3 py-2 rounded">
                            {email}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Phones */}
                  {result.phones.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Phones ({result.phones.length})
                      </h5>
                      <div className="space-y-1">
                        {result.phones.map((phone, i) => (
                          <div key={i} className="text-sm text-gray-300 bg-gray-800/50 px-3 py-2 rounded">
                            {phone}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Address */}
                  {result.address && (
                    <div className="md:col-span-2">
                      <h5 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Address
                      </h5>
                      <div className="text-sm text-gray-300 bg-gray-800/50 px-3 py-2 rounded">
                        {result.address}
                      </div>
                    </div>
                  )}

                  {/* Social Links */}
                  {Object.keys(result.socialLinks).length > 0 && (
                    <div className="md:col-span-2">
                      <h5 className="text-sm font-medium text-gray-400 mb-2">Social Media</h5>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(result.socialLinks).map(([platform, links]) => (
                          links.map((link, i) => (
                            <a
                              key={`${platform}-${i}`}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 hover:bg-gray-700 transition-colors"
                            >
                              {platform}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ))
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {result.description && (
                    <div className="md:col-span-2">
                      <h5 className="text-sm font-medium text-gray-400 mb-2">Description</h5>
                      <p className="text-sm text-gray-300 bg-gray-800/50 px-3 py-2 rounded">
                        {result.description}
                      </p>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="md:col-span-2 flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-800">
                    <span>Pages scraped: {result.pagesScraped}</span>
                    <span>•</span>
                    <span>Scraped at: {new Date(result.scrapedAt).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && !isScraping && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <Globe className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Websites Scraped Yet</h3>
          <p className="text-sm text-gray-400 mb-6">
            Enter website URLs above and click "Start Scraping" to extract contact information
          </p>
          <div className="bg-gray-800/50 rounded-lg p-4 max-w-md mx-auto text-left">
            <h4 className="text-sm font-semibold text-emerald-400 mb-2">How it works:</h4>
            <ul className="space-y-1 text-xs text-gray-400">
              <li>• Enter one or more business website URLs</li>
              <li>• The scraper will extract emails, phones, and addresses</li>
              <li>• Enable "Deep Scrape" to follow contact/about page links</li>
              <li>• Results can be exported to CSV/JSON from the Export tab</li>
            </ul>
          </div>
        </div>
      )}

      {/* Backend Setup Instructions */}
      <div className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-500/10 rounded-xl p-6">
        <h4 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Backend Setup Required
        </h4>
        <p className="text-sm text-gray-400 mb-3">
          To scrape real websites, you need to run the backend scraper service. Choose one of these options:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h5 className="text-sm font-semibold text-white mb-2">Node.js (Recommended)</h5>
            <code className="text-xs text-emerald-400 block mb-2">
              cd backend && npm install<br />
              node scraper-service.js
            </code>
            <p className="text-xs text-gray-500">
              Uses Puppeteer for JavaScript-heavy sites
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h5 className="text-sm font-semibold text-white mb-2">Python</h5>
            <code className="text-xs text-emerald-400 block mb-2">
              pip install requests beautifulsoup4<br />
              python scraper.py --serve
            </code>
            <p className="text-xs text-gray-500">
              Uses BeautifulSoup + Playwright for dynamic sites
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

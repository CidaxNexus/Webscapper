import { useState, useCallback } from 'react';
import {
  Search, Globe, MapPin, Facebook, Settings, Download, Shield,
  ChevronRight, Star, CheckCircle, XCircle, Filter, RefreshCw,
  Mail, Phone, Building2, ExternalLink, AlertTriangle, Database,
  TrendingUp, Users, Zap, Loader2
} from 'lucide-react';
import { ContactResult, SearchConfig, ViewType } from './types';
import { mockResults } from './mockData';
import Papa from 'papaparse';
import WebsiteScraperView from './WebsiteScraperView';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('search');
  const [results, setResults] = useState<ContactResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const [config, setConfig] = useState<SearchConfig>({
    query: '',
    location: '',
    sources: ['meta', 'google_maps', 'google_my_business', 'tiktok'],
    category: '',
    maxResults: 50,
    includePhone: true,
    includeWebsite: true,
    verifiedOnly: false,
  });

  const handleSearch = useCallback(() => {
    if (!config.query.trim()) return;
    setIsSearching(true);
    setSearchProgress(0);
    setResults([]);
    setCurrentView('results');

    // Simulate progressive search
    const interval = setInterval(() => {
      setSearchProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSearching(false);
          // Filter mock results based on config
          let filtered = [...mockResults];
          if (config.verifiedOnly) {
            filtered = filtered.filter(r => r.verified);
          }
          if (config.sources.length < 3) {
            filtered = filtered.filter(r => config.sources.includes(r.source));
          }
          setResults(filtered.slice(0, config.maxResults));
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 300);
  }, [config]);

  const toggleSource = (source: 'meta' | 'google_maps' | 'google_my_business' | 'tiktok') => {
    setConfig(prev => ({
      ...prev,
      sources: prev.sources.includes(source)
        ? prev.sources.filter(s => s !== source)
        : [...prev.sources, source],
    }));
  };

  const toggleSelectResult = (id: string) => {
    setSelectedResults(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedResults.size === results.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(results.map(r => r.id)));
    }
  };

  const exportToCSV = () => {
    const data = results
      .filter(r => selectedResults.size === 0 || selectedResults.has(r.id))
      .map(r => ({
        'Business Name': r.businessName,
        'Email': r.email,
        'Phone': r.phone,
        'Website': r.website,
        'Address': r.address,
        'Source': r.source.replace('_', ' '),
        'Category': r.category,
        'Rating': r.rating || '',
        'Reviews': r.reviews || '',
        'Verified': r.verified ? 'Yes' : 'No',
      }));

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToJSON = () => {
    const data = results
      .filter(r => selectedResults.size === 0 || selectedResults.has(r.id))
      .map(r => ({
        businessName: r.businessName,
        email: r.email,
        phone: r.phone,
        website: r.website,
        address: r.address,
        source: r.source,
        category: r.category,
        rating: r.rating,
        reviews: r.reviews,
        verified: r.verified,
      }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contacts_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const TikTokIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'meta': return <Facebook className="w-4 h-4 text-blue-500" />;
      case 'google_maps': return <MapPin className="w-4 h-4 text-green-500" />;
      case 'google_my_business': return <Building2 className="w-4 h-4 text-yellow-500" />;
      case 'tiktok': return <TikTokIcon className="w-4 h-4 text-pink-500" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'meta': return 'Meta Business';
      case 'google_maps': return 'Google Maps';
      case 'google_my_business': return 'Google My Business';
      case 'tiktok': return 'TikTok Business';
      default: return source;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'meta': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'google_maps': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'google_my_business': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'tiktok': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getSourceButtonClass = (source: string, isActive: boolean) => {
    if (!isActive) return 'bg-gray-800/50 border-gray-700 hover:border-gray-600';
    switch (source) {
      case 'meta': return 'bg-blue-500/10 border-blue-500/30 ring-1 ring-blue-500/20';
      case 'google_maps': return 'bg-green-500/10 border-green-500/30 ring-1 ring-green-500/20';
      case 'google_my_business': return 'bg-yellow-500/10 border-yellow-500/30 ring-1 ring-yellow-500/20';
      case 'tiktok': return 'bg-pink-500/10 border-pink-500/30 ring-1 ring-pink-500/20';
      default: return 'bg-gray-500/10 border-gray-500/30 ring-1 ring-gray-500/20';
    }
  };

  const getSourceIconColor = (source: string, isActive: boolean) => {
    if (!isActive) return 'text-gray-500';
    switch (source) {
      case 'meta': return 'text-blue-400';
      case 'google_maps': return 'text-green-400';
      case 'google_my_business': return 'text-yellow-400';
      case 'tiktok': return 'text-pink-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col fixed h-full">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
              <Mail className="w-5 h-5 text-gray-900" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">ContactHarvest</h1>
              <p className="text-xs text-gray-500">Business Email Finder</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'search' as ViewType, icon: Search, label: 'Search' },
            { id: 'scraper' as ViewType, icon: Globe, label: 'Web Scraper' },
            { id: 'results' as ViewType, icon: Database, label: 'Results', badge: results.length },
            { id: 'export' as ViewType, icon: Download, label: 'Export' },
            { id: 'settings' as ViewType, icon: Settings, label: 'Settings' },
            { id: 'compliance' as ViewType, icon: Shield, label: 'Compliance' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                currentView === item.id
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
              {item.badge ? (
                <span className="ml-auto bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-medium text-gray-300">API Credits</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-2 rounded-full" style={{ width: '72%' }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">7,200 / 10,000 remaining</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {currentView === 'search' && 'Search Contacts'}
                {currentView === 'scraper' && 'Website Scraper'}
                {currentView === 'results' && 'Search Results'}
                {currentView === 'export' && 'Export Data'}
                {currentView === 'settings' && 'Settings & Configuration'}
                {currentView === 'compliance' && 'Compliance & Legal'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {currentView === 'search' && 'Find business emails from Meta, Google Maps & GMB'}
                {currentView === 'scraper' && 'Extract contact info directly from business websites'}
                {currentView === 'results' && `${results.length} contacts found`}
                {currentView === 'export' && 'Download your contacts in various formats'}
                {currentView === 'settings' && 'Configure scraping parameters and API keys'}
                {currentView === 'compliance' && 'Legal notices and terms of use'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-xs text-gray-400">System Online</span>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Search View */}
          {currentView === 'search' && (
            <div className="space-y-8">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <span className="text-2xl font-bold text-white">12,847</span>
                  </div>
                  <p className="text-sm text-gray-500">Total Contacts</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <Database className="w-5 h-5 text-blue-400" />
                    <span className="text-2xl font-bold text-white">4</span>
                  </div>
                  <p className="text-sm text-gray-500">Sources Active</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                    <span className="text-2xl font-bold text-white">94.2%</span>
                  </div>
                  <p className="text-sm text-gray-500">Success Rate</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    <span className="text-2xl font-bold text-white">2.3s</span>
                  </div>
                  <p className="text-sm text-gray-500">Avg. Speed</p>
                </div>
              </div>

              {/* Search Form */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Search className="w-5 h-5 text-emerald-400" />
                  Search Configuration
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Business Name / Keyword
                    </label>
                    <input
                      type="text"
                      value={config.query}
                      onChange={e => setConfig(prev => ({ ...prev, query: e.target.value }))}
                      placeholder="e.g., Digital Marketing Agency"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={config.location}
                      onChange={e => setConfig(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g., San Francisco, CA"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Business Category
                    </label>
                    <select
                      value={config.category}
                      onChange={e => setConfig(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                    >
                      <option value="">All Categories</option>
                      <option value="restaurant">Restaurants</option>
                      <option value="retail">Retail</option>
                      <option value="services">Professional Services</option>
                      <option value="health">Health & Wellness</option>
                      <option value="tech">Technology</option>
                      <option value="finance">Finance</option>
                      <option value="education">Education</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Results
                    </label>
                    <input
                      type="number"
                      value={config.maxResults}
                      onChange={e => setConfig(prev => ({ ...prev, maxResults: parseInt(e.target.value) || 50 }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                </div>

                {/* Source Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Data Sources
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { id: 'meta' as const, name: 'Meta Business Pages', desc: 'Facebook & Instagram business profiles', icon: Facebook, color: 'blue' },
                      { id: 'google_maps' as const, name: 'Google Maps', desc: 'Business listings from Maps', icon: MapPin, color: 'green' },
                      { id: 'google_my_business' as const, name: 'Google My Business', desc: 'Verified business profiles', icon: Building2, color: 'yellow' },
                      { id: 'tiktok' as const, name: 'TikTok Business', desc: 'TikTok business accounts & creators', icon: TikTokIcon, color: 'pink' },
                    ].map(source => {
                      const isActive = config.sources.includes(source.id);
                      return (
                        <button
                          key={source.id}
                          onClick={() => toggleSource(source.id)}
                          className={`p-4 rounded-xl border text-left transition-all ${getSourceButtonClass(source.id, isActive)}`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <source.icon className={`w-5 h-5 ${getSourceIconColor(source.id, isActive)}`} />
                            <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>{source.name}</span>
                          </div>
                          <p className="text-xs text-gray-500">{source.desc}</p>
                          {isActive && (
                            <div className="mt-2 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-400" />
                              <span className="text-xs text-emerald-400">Active</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Options */}
                <div className="flex flex-wrap gap-6 mb-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.includePhone}
                      onChange={e => setConfig(prev => ({ ...prev, includePhone: e.target.checked }))}
                      className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-emerald-500 focus:ring-emerald-500/50"
                    />
                    <span className="text-sm text-gray-300">Include Phone Numbers</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.includeWebsite}
                      onChange={e => setConfig(prev => ({ ...prev, includeWebsite: e.target.checked }))}
                      className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-emerald-500 focus:ring-emerald-500/50"
                    />
                    <span className="text-sm text-gray-300">Include Websites</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.verifiedOnly}
                      onChange={e => setConfig(prev => ({ ...prev, verifiedOnly: e.target.checked }))}
                      className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-emerald-500 focus:ring-emerald-500/50"
                    />
                    <span className="text-sm text-gray-300">Verified Only</span>
                  </label>
                </div>

                {/* Search Button */}
                <button
                  onClick={handleSearch}
                  disabled={!config.query.trim() || config.sources.length === 0}
                  className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-gray-900 font-semibold rounded-lg hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  Start Search
                </button>
              </div>

              {/* Quick Tips */}
              <div className="bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 border border-emerald-500/10 rounded-xl p-6">
                <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Quick Tips
                </h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    Use specific business names for more accurate results
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    Include city/state in location for geographically targeted searches
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    Enable multiple sources simultaneously for broader coverage
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    Use "Verified Only" to filter for businesses with confirmed contact info
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Web Scraper View */}
          {currentView === 'scraper' && (
            <WebsiteScraperView />
          )}

          {/* Results View */}
          {currentView === 'results' && (
            <div className="space-y-6">
              {isSearching ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                  <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Searching for contacts...</h3>
                  <p className="text-sm text-gray-400 mb-6">
                    Scraping {config.sources.map(getSourceLabel).join(', ')}
                  </p>
                  <div className="max-w-md mx-auto">
                    <div className="w-full bg-gray-800 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(searchProgress, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{Math.round(Math.min(searchProgress, 100))}% complete</p>
                  </div>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {config.sources.map(source => (
                      <span key={source} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border ${getSourceColor(source)}`}>
                        {getSourceIcon(source)}
                        {getSourceLabel(source)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : results.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                  <Database className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Results Yet</h3>
                  <p className="text-sm text-gray-400 mb-6">
                    Run a search to find business contacts
                  </p>
                  <button
                    onClick={() => setCurrentView('search')}
                    className="px-6 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all"
                  >
                    Go to Search
                  </button>
                </div>
              ) : (
                <>
                  {/* Results Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={selectAll}
                        className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-all"
                      >
                        {selectedResults.size === results.length ? 'Deselect All' : 'Select All'}
                      </button>
                      <span className="text-sm text-gray-500">
                        {selectedResults.size} of {results.length} selected
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={exportToCSV}
                        className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm hover:bg-emerald-500/20 transition-all flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Export CSV
                      </button>
                      <button
                        onClick={exportToJSON}
                        className="px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-sm hover:bg-blue-500/20 transition-all flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Export JSON
                      </button>
                      <button
                        onClick={handleSearch}
                        className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-all flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                      </button>
                    </div>
                  </div>

                  {/* Results Table */}
                  <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-800">
                            <th className="px-4 py-3 text-left">
                              <input
                                type="checkbox"
                                checked={selectedResults.size === results.length && results.length > 0}
                                onChange={selectAll}
                                className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-emerald-500"
                              />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {results.map(result => (
                            <tr key={result.id} className="hover:bg-gray-800/50 transition-colors">
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedResults.has(result.id)}
                                  onChange={() => toggleSelectResult(result.id)}
                                  className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-emerald-500"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  <p className="text-sm font-medium text-white">{result.businessName}</p>
                                  <p className="text-xs text-gray-500">{result.category}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <Mail className="w-3 h-3 text-gray-500" />
                                    <span className="text-xs text-emerald-400">{result.email}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Phone className="w-3 h-3 text-gray-500" />
                                    <span className="text-xs text-gray-400">{result.phone}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border ${getSourceColor(result.source)}`}>
                                  {getSourceIcon(result.source)}
                                  {getSourceLabel(result.source)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {result.rating ? (
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                    <span className="text-sm text-white">{result.rating}</span>
                                    <span className="text-xs text-gray-500">({result.reviews})</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-500">N/A</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {result.verified ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Verified
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                    <XCircle className="w-3.5 h-3.5" />
                                    Unverified
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button className="p-1.5 hover:bg-gray-700 rounded transition-colors" title="View Details">
                                    <ExternalLink className="w-4 h-4 text-gray-400" />
                                  </button>
                                  <button className="p-1.5 hover:bg-gray-700 rounded transition-colors" title="Copy Email">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Export View */}
          {currentView === 'export' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <Download className="w-8 h-8 text-emerald-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">CSV Export</h3>
                  <p className="text-sm text-gray-400 mb-4">Comma-separated values, ideal for spreadsheet applications like Excel and Google Sheets.</p>
                  <button
                    onClick={exportToCSV}
                    disabled={results.length === 0}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <Database className="w-8 h-8 text-blue-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">JSON Export</h3>
                  <p className="text-sm text-gray-400 mb-4">Structured data format, perfect for API integrations and programmatic access.</p>
                  <button
                    onClick={exportToJSON}
                    disabled={results.length === 0}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <Users className="w-8 h-8 text-purple-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Bulk Export</h3>
                  <p className="text-sm text-gray-400 mb-4">Export all results with full metadata including timestamps and source attribution.</p>
                  <button
                    onClick={exportToCSV}
                    disabled={results.length === 0}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>

              {results.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Export Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <p className="text-2xl font-bold text-white">{results.length}</p>
                      <p className="text-xs text-gray-500">Total Contacts</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <p className="text-2xl font-bold text-white">{selectedResults.size || results.length}</p>
                      <p className="text-xs text-gray-500">Selected</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <p className="text-2xl font-bold text-white">
                        {results.filter(r => r.verified).length}
                      </p>
                      <p className="text-xs text-gray-500">Verified</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <p className="text-2xl font-bold text-white">
                        {new Set(results.map(r => r.source)).size}
                      </p>
                      <p className="text-xs text-gray-500">Sources</p>
                    </div>
                  </div>
                </div>
              )}

              {results.length === 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                  <Download className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Data to Export</h3>
                  <p className="text-sm text-gray-400 mb-6">Run a search first to collect contacts</p>
                  <button
                    onClick={() => setCurrentView('search')}
                    className="px-6 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all"
                  >
                    Go to Search
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Settings View */}
          {currentView === 'settings' && (
            <div className="space-y-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-emerald-400" />
                  API Configuration
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Meta Graph API Token</label>
                    <input
                      type="password"
                      placeholder="Enter your Meta API access token"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Google Maps API Key</label>
                    <input
                      type="password"
                      placeholder="Enter your Google Maps API key"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Google My Business API Key</label>
                    <input
                      type="password"
                      placeholder="Enter your GMB API key"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-emerald-400" />
                  Scraping Parameters
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Request Delay (ms)</label>
                    <input
                      type="number"
                      defaultValue={2000}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Delay between requests to avoid rate limiting</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Concurrent Requests</label>
                    <input
                      type="number"
                      defaultValue={3}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Number of parallel requests</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Retry Attempts</label>
                    <input
                      type="number"
                      defaultValue={3}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Max retries on failed requests</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">User Agent</label>
                    <input
                      type="text"
                      defaultValue="ContactHarvest/1.0"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Custom user agent string</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-emerald-400" />
                  Email Extraction Settings
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-emerald-500" />
                    <span className="text-sm text-gray-300">Extract emails from business profile pages</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-emerald-500" />
                    <span className="text-sm text-gray-300">Extract emails from linked websites</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-emerald-500" />
                    <span className="text-sm text-gray-300">Validate email format before saving</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-emerald-500" />
                    <span className="text-sm text-gray-300">Verify email deliverability (uses additional API credits)</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-emerald-500" />
                    <span className="text-sm text-gray-300">Deduplicate results across sources</span>
                  </label>
                </div>
              </div>

              <button className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-gray-900 font-semibold rounded-lg hover:from-emerald-400 hover:to-cyan-400 transition-all">
                Save Settings
              </button>
            </div>
          )}

          {/* Compliance View */}
          {currentView === 'compliance' && (
            <div className="space-y-6">
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-400 mb-2">Important Legal Notice</h3>
                    <p className="text-sm text-gray-300">
                      This tool is designed for educational and demonstration purposes. Before using any web scraping 
                      tool to collect business contact information, you must ensure compliance with all applicable 
                      laws, regulations, and platform Terms of Service.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  Platform Terms of Service
                </h3>
                <div className="space-y-4">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                      <Facebook className="w-4 h-4" />
                      Meta (Facebook/Instagram)
                    </h4>
                    <p className="text-xs text-gray-400">
                      Meta's Terms of Service prohibit automated data collection without explicit permission. 
                      Use the official Meta Graph API with proper authentication for legitimate business use cases. 
                      You must comply with Meta's Platform Policy and Data Use Terms.
                    </p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Google Maps
                    </h4>
                    <p className="text-xs text-gray-400">
                      Google's Terms of Service restrict automated access to Google Maps content. 
                      Use the official Google Places API and Google Maps Platform for legitimate business data access. 
                      Bulk downloading of content is prohibited.
                    </p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Google My Business
                    </h4>
                    <p className="text-xs text-gray-400">
                      Google My Business data should be accessed through the official Google My Business API. 
                      Automated scraping of GMB listings violates Google's Terms of Service. 
                      Ensure you have proper API credentials and follow rate limits.
                    </p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-pink-400 mb-2 flex items-center gap-2">
                      <TikTokIcon className="w-4 h-4" />
                      TikTok
                    </h4>
                    <p className="text-xs text-gray-400">
                      TikTok's Terms of Service prohibit unauthorized automated access to their platform. 
                      Use the official TikTok for Developers API and TikTok Business API for legitimate business data access. 
                      Scraping user profiles or business accounts without permission violates their Community Guidelines and Terms of Use.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  Data Protection & Privacy
                </h3>
                <div className="space-y-3 text-sm text-gray-400">
                  <p>
                    <strong className="text-gray-200">GDPR Compliance:</strong> If you're collecting personal data of EU residents, 
                    you must comply with the General Data Protection Regulation. This includes having a lawful basis for processing, 
                    providing privacy notices, and respecting data subject rights.
                  </p>
                  <p>
                    <strong className="text-gray-200">CAN-SPAM Act:</strong> When using collected email addresses for commercial 
                    messages, you must comply with the CAN-SPAM Act requirements including opt-out mechanisms and accurate header information.
                  </p>
                  <p>
                    <strong className="text-gray-200">CCPA Compliance:</strong> California residents have rights regarding their 
                    personal information. Ensure compliance with the California Consumer Privacy Act when collecting and using data.
                  </p>
                  <p>
                    <strong className="text-gray-200">Best Practices:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Only collect publicly available business contact information</li>
                    <li>Use official APIs whenever possible instead of web scraping</li>
                    <li>Respect robots.txt and rate limits</li>
                    <li>Provide clear opt-out mechanisms for contacted businesses</li>
                    <li>Maintain records of data processing activities</li>
                    <li>Regularly audit and clean your contact database</li>
                  </ul>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  Recommended Alternatives
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: 'Meta Graph API', desc: 'Official API for accessing Facebook business data', link: 'developers.facebook.com' },
                    { name: 'Google Places API', desc: 'Official API for business location data', link: 'developers.google.com/maps' },
                    { name: 'Google Business Profile API', desc: 'Official API for GMB data management', link: 'developers.google.com/my-business' },
                    { name: 'TikTok for Developers', desc: 'Official API for TikTok business data', link: 'developers.tiktok.com' },
                    { name: 'Hunter.io', desc: 'Email finder and verification service', link: 'hunter.io' },
                  ].map((alt, i) => (
                    <div key={i} className="bg-gray-800/50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-emerald-400 mb-1">{alt.name}</h4>
                      <p className="text-xs text-gray-400 mb-2">{alt.desc}</p>
                      <span className="text-xs text-gray-500">{alt.link}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

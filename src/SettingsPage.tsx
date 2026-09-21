import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, CheckCircle, XCircle, Loader2, AlertCircle, Save, ExternalLink } from 'lucide-react';
import { getAPIConfig, saveAPIConfig, testAPIKey } from './apiServices';

interface APIConfig {
  metaApiKey: string;
  googleMapsApiKey: string;
  googleMyBusinessApiKey: string;
  tiktokApiKey: string;
  backendScraperUrl: string;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<APIConfig>({
    metaApiKey: '',
    googleMapsApiKey: '',
    googleMyBusinessApiKey: '',
    tiktokApiKey: '',
    backendScraperUrl: 'http://localhost:3001',
  });

  const [testingStatus, setTestingStatus] = useState<Record<string, 'idle' | 'testing' | 'success' | 'error'>>({
    meta: 'idle',
    google_maps: 'idle',
    google_my_business: 'idle',
    tiktok: 'idle',
    backend: 'idle',
  });

  const [saved, setSaved] = useState(false);

  // Load saved config on mount
  useEffect(() => {
    const savedConfig = getAPIConfig();
    setConfig(savedConfig);
  }, []);

  const handleSave = () => {
    saveAPIConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTestKey = async (platform: string) => {
    let apiKey = '';
    
    switch (platform) {
      case 'meta':
        apiKey = config.metaApiKey;
        break;
      case 'google_maps':
        apiKey = config.googleMapsApiKey;
        break;
      case 'google_my_business':
        apiKey = config.googleMyBusinessApiKey;
        break;
      case 'tiktok':
        apiKey = config.tiktokApiKey;
        break;
    }

    if (!apiKey) {
      alert('Please enter an API key first');
      return;
    }

    setTestingStatus(prev => ({ ...prev, [platform]: 'testing' }));
    
    const isValid = await testAPIKey(platform, apiKey);
    
    setTestingStatus(prev => ({
      ...prev,
      [platform]: isValid ? 'success' : 'error'
    }));
  };

  const handleTestBackend = async () => {
    setTestingStatus(prev => ({ ...prev, backend: 'testing' }));
    
    try {
      const response = await fetch(`${config.backendScraperUrl}/api/health`);
      const isValid = response.ok;
      
      setTestingStatus(prev => ({
        ...prev,
        backend: isValid ? 'success' : 'error'
      }));
    } catch (error) {
      setTestingStatus(prev => ({ ...prev, backend: 'error' }));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'testing':
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <SettingsIcon className="w-6 h-6 text-emerald-400 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">API Configuration</h3>
            <p className="text-sm text-gray-300">
              Configure your API keys to connect to external platforms. API keys are stored locally in your browser.
            </p>
          </div>
        </div>
      </div>

      {/* Meta API */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Key className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Meta (Facebook/Instagram) API</h3>
              <p className="text-xs text-gray-500">Access business pages and profiles</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(testingStatus.meta)}
            <button
              onClick={() => handleTestKey('meta')}
              disabled={!config.metaApiKey || testingStatus.meta === 'testing'}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Test Key
            </button>
          </div>
        </div>
        <input
          type="password"
          value={config.metaApiKey}
          onChange={e => setConfig(prev => ({ ...prev, metaApiKey: e.target.value }))}
          placeholder="Enter your Meta Graph API access token"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-sm"
        />
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <ExternalLink className="w-3 h-3" />
          <a href="https://developers.facebook.com/docs/graph-api" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
            Get API Key →
          </a>
        </div>
      </div>

      {/* Google Maps API */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Key className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Google Maps API</h3>
              <p className="text-xs text-gray-500">Access business locations and details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(testingStatus.google_maps)}
            <button
              onClick={() => handleTestKey('google_maps')}
              disabled={!config.googleMapsApiKey || testingStatus.google_maps === 'testing'}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Test Key
            </button>
          </div>
        </div>
        <input
          type="password"
          value={config.googleMapsApiKey}
          onChange={e => setConfig(prev => ({ ...prev, googleMapsApiKey: e.target.value }))}
          placeholder="Enter your Google Maps API key"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 font-mono text-sm"
        />
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <ExternalLink className="w-3 h-3" />
          <a href="https://developers.google.com/maps/documentation/places/web-service/get-api-key" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">
            Get API Key →
          </a>
        </div>
      </div>

      {/* Google My Business API */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Key className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Google My Business API</h3>
              <p className="text-xs text-gray-500">Access verified business profiles</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(testingStatus.google_my_business)}
            <button
              onClick={() => handleTestKey('google_my_business')}
              disabled={!config.googleMyBusinessApiKey || testingStatus.google_my_business === 'testing'}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Test Key
            </button>
          </div>
        </div>
        <input
          type="password"
          value={config.googleMyBusinessApiKey}
          onChange={e => setConfig(prev => ({ ...prev, googleMyBusinessApiKey: e.target.value }))}
          placeholder="Enter your Google My Business API key"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 font-mono text-sm"
        />
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <ExternalLink className="w-3 h-3" />
          <a href="https://developers.google.com/my-business/content/basic-info" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300">
            Get API Key →
          </a>
        </div>
      </div>

      {/* TikTok API */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
              <Key className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">TikTok Business API</h3>
              <p className="text-xs text-gray-500">Access TikTok business accounts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(testingStatus.tiktok)}
            <button
              onClick={() => handleTestKey('tiktok')}
              disabled={!config.tiktokApiKey || testingStatus.tiktok === 'testing'}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Test Key
            </button>
          </div>
        </div>
        <input
          type="password"
          value={config.tiktokApiKey}
          onChange={e => setConfig(prev => ({ ...prev, tiktokApiKey: e.target.value }))}
          placeholder="Enter your TikTok API access token"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 font-mono text-sm"
        />
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <ExternalLink className="w-3 h-3" />
          <a href="https://developers.tiktok.com/" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300">
            Get API Key →
          </a>
        </div>
      </div>

      {/* Backend Scraper Service */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Key className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Backend Scraper Service</h3>
              <p className="text-xs text-gray-500">URL for the website scraping backend</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(testingStatus.backend)}
            <button
              onClick={handleTestBackend}
              disabled={!config.backendScraperUrl || testingStatus.backend === 'testing'}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Test Connection
            </button>
          </div>
        </div>
        <input
          type="text"
          value={config.backendScraperUrl}
          onChange={e => setConfig(prev => ({ ...prev, backendScraperUrl: e.target.value }))}
          placeholder="http://localhost:3001"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono text-sm"
        />
        <div className="mt-3 text-xs text-gray-500">
          <p>Run the backend scraper:</p>
          <code className="block mt-1 bg-gray-800 px-3 py-2 rounded text-emerald-400">
            cd backend && npm install && npm start
          </code>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-gray-900 font-semibold rounded-lg hover:from-emerald-400 hover:to-cyan-400 transition-all flex items-center gap-2"
        >
          <Save className="w-5 h-5" />
          Save Configuration
        </button>
        {saved && (
          <span className="text-sm text-emerald-400 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Configuration saved successfully!
          </span>
        )}
      </div>

      {/* Important Notes */}
      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-yellow-400 shrink-0 mt-0.5" />
          <div className="text-sm text-gray-300 space-y-2">
            <p className="font-semibold text-yellow-400">Important Security Notes:</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-gray-400">
              <li>API keys are stored in your browser's localStorage</li>
              <li>Never share your API keys or commit them to version control</li>
              <li>Use environment variables in production deployments</li>
              <li>Regularly rotate your API keys for security</li>
              <li>Monitor API usage to avoid unexpected charges</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

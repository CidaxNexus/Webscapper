import { useState } from 'react';
import { Mail, CheckCircle, XCircle, AlertCircle, Loader2, Upload, Download, Trash2 } from 'lucide-react';
import { 
  validateEmail, 
  validateEmailsBulk, 
  quickValidateEmail, 
  EmailValidationResult, 
  BulkValidationResult,
  exportValidationResultsToCSV 
} from './emailValidation';

export default function EmailValidationView() {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [singleEmail, setSingleEmail] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [singleResult, setSingleResult] = useState<EmailValidationResult | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [backendUrl, setBackendUrl] = useState('http://localhost:3002');

  const handleSingleValidate = async () => {
    if (!singleEmail.trim()) return;
    
    setIsValidating(true);
    setSingleResult(null);
    
    try {
      // Try backend first
      const response = await fetch(`${backendUrl}/api/email/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: singleEmail }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSingleResult(data);
      } else {
        throw new Error('Backend not available');
      }
    } catch (error) {
      // Fallback to client-side validation
      console.log('Backend not available, using client-side validation');
      const result = quickValidateEmail(singleEmail);
      setSingleResult(result);
    } finally {
      setIsValidating(false);
    }
  };

  const handleBulkValidate = async () => {
    const emails = bulkEmails
      .split('\n')
      .map(e => e.trim())
      .filter(e => e);
    
    if (emails.length === 0) return;
    
    setIsValidating(true);
    setBulkResult(null);
    
    try {
      // Try backend first
      const response = await fetch(`${backendUrl}/api/email/validate-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setBulkResult(data);
      } else {
        throw new Error('Backend not available');
      }
    } catch (error) {
      // Fallback to client-side validation
      console.log('Backend not available, using client-side validation');
      const results = emails.map(email => quickValidateEmail(email));
      
      const valid = results.filter(r => r.score >= 70).length;
      const invalid = results.filter(r => r.score < 40).length;
      const risky = results.filter(r => r.score >= 40 && r.score < 70).length;
      
      setBulkResult({
        total: results.length,
        valid,
        invalid,
        risky,
        results,
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setBulkEmails(content);
    };
    reader.readAsText(file);
  };

  const handleExportResults = () => {
    if (!bulkResult) return;
    
    const csv = exportValidationResultsToCSV(bulkResult.results);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `email_validation_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-emerald-500/10 border-emerald-500/20';
    if (score >= 40) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return 'Valid';
    if (score >= 40) return 'Risky';
    return 'Invalid';
  };

  return (
    <div className="space-y-6">
      {/* Backend Configuration */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-emerald-400" />
          Email Deliverability Testing
        </h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Email Verification Service URL
          </label>
          <input
            type="text"
            value={backendUrl}
            onChange={e => setBackendUrl(e.target.value)}
            placeholder="http://localhost:3002"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <p className="text-xs text-gray-500 mt-1">
            Run the email verification service: <code className="text-emerald-400">node backend/email-verification-service.js</code>
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('single')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'single'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
            }`}
          >
            Single Email
          </button>
          <button
            onClick={() => setMode('bulk')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'bulk'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
            }`}
          >
            Bulk Validation
          </button>
        </div>
      </div>

      {/* Single Email Validation */}
      {mode === 'single' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h4 className="text-md font-semibold text-white mb-4">Validate Single Email</h4>
          
          <div className="flex gap-3 mb-4">
            <input
              type="email"
              value={singleEmail}
              onChange={e => setSingleEmail(e.target.value)}
              placeholder="Enter email address to validate"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              onKeyDown={e => e.key === 'Enter' && handleSingleValidate()}
            />
            <button
              onClick={handleSingleValidate}
              disabled={!singleEmail.trim() || isValidating}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-gray-900 font-semibold rounded-lg hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Validate
                </>
              )}
            </button>
          </div>

          {/* Single Result */}
          {singleResult && (
            <div className={`p-6 rounded-xl border ${getScoreBg(singleResult.score)}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-lg font-semibold text-white mb-1">{singleResult.email}</p>
                  <p className={`text-sm ${getScoreColor(singleResult.score)}`}>
                    Score: {singleResult.score}/100 - {getScoreLabel(singleResult.score)}
                  </p>
                </div>
                <div className={`text-4xl font-bold ${getScoreColor(singleResult.score)}`}>
                  {singleResult.score}
                </div>
              </div>

              {/* Validation Checks */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <div className="flex items-center gap-2">
                  {singleResult.format ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-sm text-gray-300">Valid Format</span>
                </div>
                <div className="flex items-center gap-2">
                  {singleResult.domain ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-sm text-gray-300">Valid Domain</span>
                </div>
                <div className="flex items-center gap-2">
                  {singleResult.mxRecords ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-sm text-gray-300">MX Records</span>
                </div>
                <div className="flex items-center gap-2">
                  {singleResult.smtp ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-sm text-gray-300">SMTP Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  {!singleResult.disposable ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                  )}
                  <span className="text-sm text-gray-300">
                    {singleResult.disposable ? 'Disposable' : 'Not Disposable'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!singleResult.roleBased ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                  )}
                  <span className="text-sm text-gray-300">
                    {singleResult.roleBased ? 'Role-Based' : 'Not Role-Based'}
                  </span>
                </div>
              </div>

              {/* Suggestions */}
              {singleResult.suggestions.length > 0 && (
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-300 mb-2">Suggestions:</p>
                  <ul className="space-y-1">
                    {singleResult.suggestions.map((suggestion, i) => (
                      <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bulk Validation */}
      {mode === 'bulk' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h4 className="text-md font-semibold text-white mb-4">Validate Multiple Emails</h4>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Enter emails (one per line)
            </label>
            <textarea
              value={bulkEmails}
              onChange={e => setBulkEmails(e.target.value)}
              placeholder={`contact@example.com\ninfo@business.com\nsupport@company.org`}
              rows={8}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono text-sm"
            />
          </div>

          <div className="flex gap-3 mb-4">
            <button
              onClick={handleBulkValidate}
              disabled={!bulkEmails.trim() || isValidating}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-gray-900 font-semibold rounded-lg hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Validate All
                </>
              )}
            </button>
            
            <label className="px-6 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700 transition-all flex items-center gap-2 cursor-pointer">
              <Upload className="w-5 h-5" />
              Upload File
              <input
                type="file"
                accept=".txt,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {bulkResult && (
              <button
                onClick={handleExportResults}
                className="px-6 py-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-all flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Export CSV
              </button>
            )}
          </div>

          {/* Bulk Results Summary */}
          {bulkResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-white">{bulkResult.total}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                  <p className="text-2xl font-bold text-emerald-400">{bulkResult.valid}</p>
                  <p className="text-xs text-gray-500">Valid</p>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <p className="text-2xl font-bold text-yellow-400">{bulkResult.risky}</p>
                  <p className="text-xs text-gray-500">Risky</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-2xl font-bold text-red-400">{bulkResult.invalid}</p>
                  <p className="text-xs text-gray-500">Invalid</p>
                </div>
              </div>

              {/* Results List */}
              <div className="bg-gray-800/50 rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-gray-800">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">MX</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SMTP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {bulkResult.results.map((result, i) => (
                        <tr key={i} className="hover:bg-gray-700/50">
                          <td className="px-4 py-2 text-sm text-white">{result.email}</td>
                          <td className={`px-4 py-2 text-sm font-semibold ${getScoreColor(result.score)}`}>
                            {result.score}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${getScoreBg(result.score)} ${getScoreColor(result.score)}`}>
                              {getScoreLabel(result.score)}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {result.mxRecords ? (
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-400" />
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {result.smtp ? (
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-400" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-6">
        <h4 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          How Email Validation Works
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
          <div>
            <p className="font-medium text-gray-300 mb-2">Client-Side Checks:</p>
            <ul className="space-y-1 text-xs">
              <li>✓ Format validation (RFC 5322)</li>
              <li>✓ Domain format check</li>
              <li>✓ Disposable email detection</li>
              <li>✓ Role-based email detection</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-gray-300 mb-2">Backend Checks (Requires Service):</p>
            <ul className="space-y-1 text-xs">
              <li>✓ MX record lookup (DNS)</li>
              <li>✓ SMTP mailbox verification</li>
              <li>✓ Real-time deliverability test</li>
              <li>✓ Bulk validation with rate limiting</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

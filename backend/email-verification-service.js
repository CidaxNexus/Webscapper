/**
 * Email Verification Backend Service
 * 
 * Provides:
 * - MX record checking
 * - SMTP email verification
 * - Bulk email validation
 * 
 * SETUP:
 *   npm install express cors dns2 nodemailer
 *   node email-verification-service.js
 */

const express = require('express');
const cors = require('cors');
const dns = require('dns2');
const net = require('net');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  smtpTimeout: 10000,        // 10 seconds
  verifyFromEmail: 'verify@contactharvest.app',
  maxConcurrent: 5,
  rateLimitDelay: 1000,      // 1 second between checks
};

// ============================================
// DNS / MX RECORD CHECK
// ============================================

/**
 * Check MX records for a domain
 */
async function checkMXRecords(domain) {
  try {
    const dnsClient = dns({ nameServers: ['8.8.8.8', '8.8.4.4'] });
    const response = await dnsClient.resolve(domain, 'MX');
    
    if (!response || !response.answer || response.answer.length === 0) {
      return { hasMXRecords: false, records: [] };
    }
    
    const records = response.answer
      .filter(r => r.type === 'MX')
      .map(r => ({
        priority: r.priority || r.exchange?.priority || 0,
        exchange: r.exchange || r.name,
      }))
      .sort((a, b) => a.priority - b.priority);
    
    return {
      hasMXRecords: records.length > 0,
      records,
    };
  } catch (error) {
    console.error(`MX check failed for ${domain}:`, error.message);
    return { hasMXRecords: false, records: [], error: error.message };
  }
}

// ============================================
// SMTP VERIFICATION
// ============================================

/**
 * Verify email via SMTP conversation
 */
async function verifyEmailSMTP(email, mxHost) {
  return new Promise((resolve) => {
    const socket = net.createConnection(25, mxHost);
    let response = '';
    let step = 0;
    let verified = false;
    
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve({ verified: false, error: 'Timeout' });
    }, CONFIG.smtpTimeout);
    
    socket.on('connect', () => {
      // Connection established, wait for server greeting
    });
    
    socket.on('data', (data) => {
      response += data.toString();
      
      // Process based on current step
      const lines = response.split('\n');
      const lastLine = lines[lines.length - 2] || lines[0];
      const code = parseInt(lastLine.substring(0, 3));
      
      if (step === 0 && code === 220) {
        // Server ready, send EHLO
        step = 1;
        response = '';
        socket.write(`EHLO contactharvest.app\r\n`);
      } else if (step === 1 && (code === 250 || code === 220)) {
        // EHLO accepted, send MAIL FROM
        step = 2;
        response = '';
        socket.write(`MAIL FROM:<${CONFIG.verifyFromEmail}>\r\n`);
      } else if (step === 2 && code === 250) {
        // MAIL FROM accepted, send RCPT TO
        step = 3;
        response = '';
        socket.write(`RCPT TO:<${email}>\r\n`);
      } else if (step === 3) {
        // RCPT TO response
        if (code === 250 || code === 251) {
          verified = true;
        }
        step = 4;
        response = '';
        socket.write('QUIT\r\n');
      } else if (step === 4) {
        // QUIT response, done
        clearTimeout(timeout);
        socket.end();
        resolve({ verified, code });
      }
      
      // Handle errors
      if (code >= 500) {
        clearTimeout(timeout);
        socket.write('QUIT\r\n');
        socket.end();
        resolve({ verified: false, code, error: lastLine });
      }
    });
    
    socket.on('error', (error) => {
      clearTimeout(timeout);
      resolve({ verified: false, error: error.message });
    });
    
    socket.on('close', () => {
      clearTimeout(timeout);
      if (step < 4) {
        resolve({ verified: false, error: 'Connection closed prematurely' });
      }
    });
  });
}

/**
 * Full email verification with MX lookup + SMTP
 */
async function fullEmailVerification(email) {
  try {
    // Extract domain
    const domain = email.split('@')[1];
    if (!domain) {
      return { verified: false, error: 'Invalid email format' };
    }
    
    // Check MX records
    const mxResult = await checkMXRecords(domain);
    if (!mxResult.hasMXRecords) {
      return {
        verified: false,
        mxRecords: false,
        error: 'No MX records found',
      };
    }
    
    // Try SMTP verification with each MX host
    for (const mx of mxResult.records) {
      try {
        const result = await verifyEmailSMTP(email, mx.exchange);
        
        if (result.verified) {
          return {
            verified: true,
            mxRecords: true,
            mxHost: mx.exchange,
          };
        }
        
        // If we got a definitive "no" (550), stop trying
        if (result.code === 550 || result.code === 551 || result.code === 553) {
          return {
            verified: false,
            mxRecords: true,
            mxHost: mx.exchange,
            error: 'Mailbox does not exist',
          };
        }
      } catch (error) {
        continue; // Try next MX host
      }
    }
    
    return {
      verified: false,
      mxRecords: true,
      error: 'Could not verify with any MX host',
    };
  } catch (error) {
    return { verified: false, error: error.message };
  }
}

// ============================================
// DISPOSABLE EMAIL DETECTION
// ============================================

const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
  'yopmail.com', 'trashmail.com', 'fakeinbox.com', 'sharklasers.com',
  'temp-mail.org', 'tempail.com', 'tempr.email', 'discard.email',
  'mohmal.com', 'burnermail.io', 'maildrop.cc', 'getnada.com',
  'emailondeck.com', '33mail.com', 'mailnesia.com', 'spam4.me',
]);

function isDisposableEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

// ============================================
// API ENDPOINTS
// ============================================

// Health check
app.get('/api/email/health', (req, res) => {
  res.json({ status: 'ok', service: 'email-verification' });
});

// Check MX records
app.get('/api/email/check-mx', async (req, res) => {
  const { domain } = req.query;
  
  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }
  
  try {
    const result = await checkMXRecords(domain);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify single email via SMTP
app.post('/api/email/verify-smtp', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  try {
    const result = await fullEmailVerification(email);
    res.json({
      email,
      isValid: result.verified,
      ...result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Full email validation (format + MX + SMTP)
app.post('/api/email/validate', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  try {
    // Format check
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    const formatValid = emailRegex.test(email);
    
    if (!formatValid) {
      return res.json({
        email,
        isValid: false,
        format: false,
        score: 0,
        suggestions: ['Invalid email format'],
      });
    }
    
    const domain = email.split('@')[1];
    const disposable = isDisposableEmail(email);
    
    // MX + SMTP check
    const verification = await fullEmailVerification(email);
    
    // Calculate score
    let score = 20; // Format valid
    score += 20; // Domain valid
    if (verification.mxRecords) score += 25;
    if (verification.verified) score += 25;
    if (disposable) score -= 30;
    score = Math.max(0, Math.min(100, score));
    
    res.json({
      email,
      isValid: formatValid && verification.mxRecords && verification.verified && !disposable,
      format: true,
      domain: true,
      mxRecords: verification.mxRecords,
      smtp: verification.verified,
      disposable,
      score,
      mxHost: verification.mxHost,
      suggestions: [],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk validation
app.post('/api/email/validate-bulk', async (req, res) => {
  const { emails } = req.body;
  
  if (!emails || !Array.isArray(emails)) {
    return res.status(400).json({ error: 'Emails array is required' });
  }
  
  try {
    const results = [];
    
    for (const email of emails) {
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, CONFIG.rateLimitDelay));
      
      // Quick format check first
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      const formatValid = emailRegex.test(email);
      
      if (!formatValid) {
        results.push({
          email,
          isValid: false,
          score: 0,
          suggestions: ['Invalid format'],
        });
        continue;
      }
      
      const disposable = isDisposableEmail(email);
      const verification = await fullEmailVerification(email);
      
      let score = 40; // Format + domain
      if (verification.mxRecords) score += 25;
      if (verification.verified) score += 25;
      if (disposable) score -= 30;
      score = Math.max(0, Math.min(100, score));
      
      results.push({
        email,
        isValid: verification.verified && !disposable,
        mxRecords: verification.mxRecords,
        smtp: verification.verified,
        disposable,
        score,
      });
    }
    
    const valid = results.filter(r => r.score >= 70).length;
    const invalid = results.filter(r => r.score < 40).length;
    const risky = results.filter(r => r.score >= 40 && r.score < 70).length;
    
    res.json({
      total: results.length,
      valid,
      invalid,
      risky,
      results,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.EMAIL_PORT || 3002;

app.listen(PORT, () => {
  console.log(`\n📧 Email Verification Service`);
  console.log(`   Running on http://localhost:${PORT}`);
  console.log(`\n📡 Endpoints:`);
  console.log(`   GET  /api/email/check-mx?domain=<domain>`);
  console.log(`   POST /api/email/verify-smtp`);
  console.log(`   POST /api/email/validate`);
  console.log(`   POST /api/email/validate-bulk`);
  console.log(`   GET  /api/email/health`);
  console.log(`\n⚙️  Config:`);
  console.log(`   SMTP Timeout: ${CONFIG.smtpTimeout}ms`);
  console.log(`   Rate Limit: ${CONFIG.rateLimitDelay}ms\n`);
});

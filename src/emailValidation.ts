/**
 * Email Deliverability Testing Service
 * 
 * Tests email addresses for:
 * 1. Format validation (regex)
 * 2. Domain validation (DNS MX records)
 * 3. SMTP verification (mailbox exists)
 * 4. Disposable email detection
 * 5. Role-based email detection
 */

// ============================================
// EMAIL VALIDATION TYPES
// ============================================

export interface EmailValidationResult {
  email: string;
  isValid: boolean;
  format: boolean;
  domain: boolean;
  mxRecords: boolean;
  smtp: boolean;
  disposable: boolean;
  roleBased: boolean;
  score: number; // 0-100
  suggestions: string[];
  error?: string;
}

export interface BulkValidationResult {
  total: number;
  valid: number;
  invalid: number;
  risky: number;
  results: EmailValidationResult[];
}

// ============================================
// DISPOSABLE EMAIL DOMAINS
// ============================================

const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
  'yopmail.com', 'trashmail.com', 'fakeinbox.com', 'sharklasers.com',
  'guerrillamailblock.com', 'grrr.la', 'temp-mail.org', 'tempail.com',
  'tempr.email', 'discard.email', 'discardmail.com', 'mohmal.com',
  'burnermail.io', 'maildrop.cc', 'harakirimail.com', 'jetable.org',
  'getnada.com', 'emailondeck.com', '33mail.com', 'mailnesia.com',
  'guerrillamail.info', 'spam4.me', 'trashmail.me', 'wegwerfmail.de',
]);

// ============================================
// ROLE-BASED EMAIL PREFIXES
// ============================================

const ROLE_BASED_PREFIXES = new Set([
  'admin', 'administrator', 'webmaster', 'postmaster', 'hostmaster',
  'info', 'support', 'sales', 'marketing', 'billing', 'contact',
  'help', 'service', 'customer', 'orders', 'shipping', 'returns',
  'abuse', 'noreply', 'no-reply', 'mailer-daemon', 'lists', 'manage',
  'newsletter', 'subscribe', 'unsubscribe', 'feedback', 'enquiries',
]);

// ============================================
// FORMAT VALIDATION
// ============================================

/**
 * Validate email format using RFC 5322 compliant regex
 */
export function validateEmailFormat(email: string): boolean {
  // RFC 5322 compliant regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) {
    return false;
  }
  
  // Additional checks
  const [localPart, domain] = email.split('@');
  
  // Local part length check (max 64 chars)
  if (localPart.length > 64) {
    return false;
  }
  
  // Domain length check (max 255 chars)
  if (domain.length > 255) {
    return false;
  }
  
  // No consecutive dots
  if (email.includes('..')) {
    return false;
  }
  
  return true;
}

// ============================================
// DOMAIN VALIDATION
// ============================================

/**
 * Validate domain format
 */
export function validateDomain(domain: string): boolean {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$/;
  return domainRegex.test(domain);
}

/**
 * Check if domain is a disposable email provider
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

/**
 * Check if email is role-based
 */
export function isRoleBasedEmail(email: string): boolean {
  const localPart = email.split('@')[0]?.toLowerCase();
  return localPart ? ROLE_BASED_PREFIXES.has(localPart) : false;
}

// ============================================
// MX RECORD CHECK (Backend Required)
// ============================================

/**
 * Check MX records for a domain
 * Note: This requires backend support as browsers can't do DNS lookups
 */
export async function checkMXRecords(domain: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/email/check-mx?domain=${encodeURIComponent(domain)}`);
    
    if (!response.ok) {
      throw new Error('MX check failed');
    }
    
    const data = await response.json();
    return data.hasMXRecords;
  } catch (error) {
    console.error('MX record check error:', error);
    return false;
  }
}

// ============================================
// SMTP VERIFICATION (Backend Required)
// ============================================

/**
 * Verify email via SMTP
 * Note: This requires backend support
 */
export async function verifyEmailSMTP(email: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/email/verify-smtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    
    if (!response.ok) {
      throw new Error('SMTP verification failed');
    }
    
    const data = await response.json();
    return data.isValid;
  } catch (error) {
    console.error('SMTP verification error:', error);
    return false;
  }
}

// ============================================
// COMPREHENSIVE EMAIL VALIDATION
// ============================================

/**
 * Perform comprehensive email validation
 */
export async function validateEmail(email: string): Promise<EmailValidationResult> {
  const result: EmailValidationResult = {
    email,
    isValid: false,
    format: false,
    domain: false,
    mxRecords: false,
    smtp: false,
    disposable: false,
    roleBased: false,
    score: 0,
    suggestions: [],
  };
  
  try {
    // Step 1: Format validation
    result.format = validateEmailFormat(email);
    if (!result.format) {
      result.suggestions.push('Invalid email format');
      return result;
    }
    
    // Step 2: Extract domain
    const domain = email.split('@')[1];
    result.domain = validateDomain(domain);
    if (!result.domain) {
      result.suggestions.push('Invalid domain format');
      return result;
    }
    
    // Step 3: Check if disposable
    result.disposable = isDisposableEmail(email);
    if (result.disposable) {
      result.suggestions.push('Disposable email address detected');
    }
    
    // Step 4: Check if role-based
    result.roleBased = isRoleBasedEmail(email);
    if (result.roleBased) {
      result.suggestions.push('Role-based email address (may not reach a specific person)');
    }
    
    // Step 5: Check MX records (requires backend)
    try {
      result.mxRecords = await checkMXRecords(domain);
      if (!result.mxRecords) {
        result.suggestions.push('No MX records found for domain');
      }
    } catch (error) {
      result.suggestions.push('Could not verify MX records');
    }
    
    // Step 6: SMTP verification (requires backend)
    try {
      result.smtp = await verifyEmailSMTP(email);
      if (!result.smtp) {
        result.suggestions.push('Email mailbox does not exist or cannot receive mail');
      }
    } catch (error) {
      result.suggestions.push('Could not verify email via SMTP');
    }
    
    // Calculate score
    result.score = calculateEmailScore(result);
    
    // Determine overall validity
    result.isValid = result.format && result.domain && result.mxRecords && !result.disposable;
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Validation failed';
  }
  
  return result;
}

/**
 * Calculate email quality score (0-100)
 */
function calculateEmailScore(result: EmailValidationResult): number {
  let score = 0;
  
  // Format valid (+20)
  if (result.format) score += 20;
  
  // Domain valid (+20)
  if (result.domain) score += 20;
  
  // MX records exist (+25)
  if (result.mxRecords) score += 25;
  
  // SMTP verified (+25)
  if (result.smtp) score += 25;
  
  // Penalties
  if (result.disposable) score -= 30;
  if (result.roleBased) score -= 10;
  
  return Math.max(0, Math.min(100, score));
}

// ============================================
// BULK VALIDATION
// ============================================

/**
 * Validate multiple emails at once
 */
export async function validateEmailsBulk(emails: string[]): Promise<BulkValidationResult> {
  const results: EmailValidationResult[] = [];
  
  // Validate in batches to avoid overwhelming the backend
  const batchSize = 10;
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(validateEmail));
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  const valid = results.filter(r => r.score >= 70).length;
  const invalid = results.filter(r => r.score < 40).length;
  const risky = results.filter(r => r.score >= 40 && r.score < 70).length;
  
  return {
    total: results.length,
    valid,
    invalid,
    risky,
    results,
  };
}

// ============================================
// QUICK VALIDATION (No Backend Required)
// ============================================

/**
 * Quick validation without backend checks
 * Good for instant feedback
 */
export function quickValidateEmail(email: string): EmailValidationResult {
  const result: EmailValidationResult = {
    email,
    isValid: false,
    format: false,
    domain: false,
    mxRecords: false,
    smtp: false,
    disposable: false,
    roleBased: false,
    score: 0,
    suggestions: [],
  };
  
  // Format validation
  result.format = validateEmailFormat(email);
  if (!result.format) {
    result.suggestions.push('Invalid email format');
    return result;
  }
  
  // Domain validation
  const domain = email.split('@')[1];
  result.domain = validateDomain(domain);
  if (!result.domain) {
    result.suggestions.push('Invalid domain format');
    return result;
  }
  
  // Check disposable
  result.disposable = isDisposableEmail(email);
  if (result.disposable) {
    result.suggestions.push('Disposable email address');
  }
  
  // Check role-based
  result.roleBased = isRoleBasedEmail(email);
  if (result.roleBased) {
    result.suggestions.push('Role-based email address');
  }
  
  // Calculate basic score
  result.score = calculateEmailScore(result);
  result.isValid = result.format && result.domain && !result.disposable;
  
  return result;
}

// ============================================
// EMAIL NORMALIZATION
// ============================================

/**
 * Normalize email address
 * - Convert to lowercase
 * - Remove dots from Gmail addresses
 * - Remove subaddresses (plus addressing)
 */
export function normalizeEmail(email: string): string {
  let normalized = email.toLowerCase().trim();
  
  const [localPart, domain] = normalized.split('@');
  
  // Gmail-specific normalization
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    // Remove dots
    let normalizedLocal = localPart.replace(/\./g, '');
    
    // Remove plus addressing
    normalizedLocal = normalizedLocal.split('+')[0];
    
    normalized = `${normalizedLocal}@${domain}`;
  } else {
    // Generic normalization - just remove plus addressing
    const normalizedLocal = localPart.split('+')[0];
    normalized = `${normalizedLocal}@${domain}`;
  }
  
  return normalized;
}

/**
 * Check if two emails are the same after normalization
 */
export function areEmailsSame(email1: string, email2: string): boolean {
  return normalizeEmail(email1) === normalizeEmail(email2);
}

// ============================================
// EXPORT UTILITIES
// ============================================

/**
 * Export validation results to CSV
 */
export function exportValidationResultsToCSV(results: EmailValidationResult[]): string {
  const headers = [
    'Email',
    'Valid',
    'Score',
    'Format',
    'Domain',
    'MX Records',
    'SMTP',
    'Disposable',
    'Role-Based',
    'Suggestions',
  ];
  
  const rows = results.map(r => [
    r.email,
    r.isValid ? 'Yes' : 'No',
    r.score.toString(),
    r.format ? 'Yes' : 'No',
    r.domain ? 'Yes' : 'No',
    r.mxRecords ? 'Yes' : 'No',
    r.smtp ? 'Yes' : 'No',
    r.disposable ? 'Yes' : 'No',
    r.roleBased ? 'Yes' : 'No',
    r.suggestions.join('; '),
  ]);
  
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  return csv;
}

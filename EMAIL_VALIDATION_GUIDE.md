# Email Deliverability Testing Guide

## 📧 Overview

Email deliverability testing verifies that email addresses are valid and can actually receive emails. This is crucial for:
- Avoiding bounced emails
- Improving sender reputation
- Reducing spam complaints
- Ensuring marketing campaigns reach recipients
- Validating scraped contact data

---

## 🎯 What We Test

### 1. **Format Validation** (Client-Side)
- RFC 5322 compliant email format
- Proper local part and domain structure
- No invalid characters
- Length limits (64 chars local, 255 chars domain)

### 2. **Domain Validation** (Client-Side)
- Valid domain format
- No consecutive dots
- Proper TLD structure

### 3. **Disposable Email Detection** (Client-Side)
- Detects temporary/throwaway email services
- Blocks 50+ known disposable domains
- Examples: tempmail.com, mailinator.com, yopmail.com

### 4. **Role-Based Email Detection** (Client-Side)
- Identifies generic role emails (admin@, info@, support@)
- These may not reach a specific person
- Useful for filtering B2B contacts

### 5. **MX Record Check** (Backend Required)
- Verifies domain has mail exchange records
- Confirms domain can receive emails
- DNS lookup for MX records

### 6. **SMTP Verification** (Backend Required)
- Connects to mail server via SMTP
- Verifies mailbox exists
- Checks if email can receive mail
- Most accurate validation method

---

## 🚀 How to Use

### Method 1: Single Email Validation

1. Go to **"Email Validator"** tab
2. Select **"Single Email"** mode
3. Enter email address
4. Click **"Validate"**
5. View detailed results with score (0-100)

**What you'll see:**
- ✅ Valid Format
- ✅ Valid Domain
- ✅ MX Records (if backend running)
- ✅ SMTP Verified (if backend running)
- ⚠️ Disposable email warning
- ⚠️ Role-based email warning
- 📊 Overall score (0-100)

### Method 2: Bulk Email Validation

1. Go to **"Email Validator"** tab
2. Select **"Bulk Validation"** mode
3. Enter multiple emails (one per line) OR upload a file
4. Click **"Validate All"**
5. View summary and detailed results
6. Export results to CSV

**What you'll see:**
- 📊 Total emails validated
- ✅ Valid count (score ≥ 70)
- ⚠️ Risky count (score 40-69)
- ❌ Invalid count (score < 40)
- 📋 Detailed table with all checks
- 📥 Export to CSV option

---

## 🔧 Setup Backend Service

For full validation (MX records + SMTP), run the backend service:

### Installation

```bash
cd backend
npm install express cors dns2
```

### Run the Service

```bash
node email-verification-service.js
```

The service runs on `http://localhost:3002` by default.

### API Endpoints

```
GET  /api/email/health              - Health check
GET  /api/email/check-mx?domain=<domain>  - Check MX records
POST /api/email/verify-smtp         - Verify email via SMTP
POST /api/email/validate            - Full validation (single)
POST /api/email/validate-bulk       - Bulk validation
```

### Example Usage

**Check MX Records:**
```bash
curl http://localhost:3002/api/email/check-mx?domain=gmail.com
```

**Validate Single Email:**
```bash
curl -X POST http://localhost:3002/api/email/validate \
  -H "Content-Type: application/json" \
  -d '{"email": "test@gmail.com"}'
```

**Bulk Validation:**
```bash
curl -X POST http://localhost:3002/api/email/validate-bulk \
  -H "Content-Type: application/json" \
  -d '{"emails": ["test1@gmail.com", "test2@yahoo.com"]}'
```

---

## 📊 Understanding Scores

### Score Breakdown

| Check | Points | Description |
|-------|--------|-------------|
| Valid Format | +20 | Email format is correct |
| Valid Domain | +20 | Domain format is valid |
| MX Records | +25 | Domain has mail servers |
| SMTP Verified | +25 | Mailbox exists and can receive mail |
| Disposable Email | -30 | Penalty for temporary email |
| Role-Based Email | -10 | Penalty for generic role email |

### Score Ranges

- **70-100**: ✅ **Valid** - Email is deliverable
- **40-69**: ⚠️ **Risky** - May have issues, use with caution
- **0-39**: ❌ **Invalid** - Do not use, will likely bounce

---

## 🎨 Frontend Integration

### Location: `src/EmailValidationView.tsx`

This component provides:
- Single email validation UI
- Bulk validation UI
- File upload support
- Real-time validation feedback
- Score visualization
- Export to CSV

### Key Functions

```typescript
// Validate single email
const result = await validateEmail('test@example.com');

// Validate multiple emails
const results = await validateEmailsBulk(['test1@example.com', 'test2@example.com']);

// Quick validation (no backend)
const quickResult = quickValidateEmail('test@example.com');

// Normalize email (remove dots, plus addressing)
const normalized = normalizeEmail('test.name+tag@gmail.com');
// Result: testname@gmail.com

// Check if two emails are the same
const same = areEmailsSame('test@gmail.com', 'test.name@gmail.com');
// Result: true (Gmail ignores dots)
```

---

## 🔍 Validation Methods Explained

### 1. Format Validation

**What it does:**
- Checks if email matches RFC 5322 standard
- Validates local part (before @)
- Validates domain part (after @)

**Example:**
```typescript
validateEmailFormat('user@example.com');     // true
validateEmailFormat('user@.com');            // false
validateEmailFormat('user@example');         // false
validateEmailFormat('@example.com');         // false
```

### 2. MX Record Check

**What it does:**
- Queries DNS for MX (Mail Exchange) records
- Confirms domain has mail servers configured
- Returns list of mail servers with priorities

**Example:**
```javascript
// Backend service
const result = await checkMXRecords('gmail.com');
// Returns:
// {
//   hasMXRecords: true,
//   records: [
//     { priority: 5, exchange: 'gmail-smtp-in.l.google.com' },
//     { priority: 10, exchange: 'alt1.gmail-smtp-in.l.google.com' }
//   ]
// }
```

### 3. SMTP Verification

**What it does:**
- Connects to mail server on port 25
- Performs SMTP handshake
- Sends MAIL FROM and RCPT TO commands
- Checks if mailbox exists

**SMTP Conversation:**
```
S: 220 gmail-smtp-in.l.google.com ESMTP
C: EHLO contactharvest.app
S: 250-gmail-smtp-in.l.google.com
C: MAIL FROM:<verify@contactharvest.app>
S: 250 OK
C: RCPT TO:<test@gmail.com>
S: 250 OK  ← Email exists!
C: QUIT
S: 221 Bye
```

**Response Codes:**
- `250`: Mailbox exists ✅
- `550`: Mailbox does not exist ❌
- `452`: Mailbox full ⚠️
- `553`: Invalid mailbox ❌

---

## ⚠️ Important Considerations

### 1. Rate Limiting

**Problem:** SMTP verification can be slow and may trigger rate limits

**Solution:**
- Backend service includes 1-second delay between checks
- Batch processing with configurable delays
- Respect mail server policies

### 2. Catch-All Domains

**Problem:** Some domains accept all emails (catch-all)

**Impact:**
- SMTP verification returns "valid" for any address
- Can't distinguish real vs fake emails
- Common with business domains

**Mitigation:**
- Score catch-all domains as "risky"
- Use additional validation methods
- Monitor bounce rates

### 3. Greylisting

**Problem:** Some servers temporarily reject emails to prevent spam

**Impact:**
- First SMTP check fails (451 response)
- Retry after delay succeeds
- Can cause false negatives

**Solution:**
- Implement retry logic
- Wait 5-10 minutes between attempts
- Track temporary failures

### 4. Privacy & Legal

**Important:**
- Only validate emails you have permission to contact
- Comply with GDPR, CCPA, and other privacy laws
- Don't use validation for spam purposes
- Respect opt-out requests

---

## 📈 Best Practices

### 1. Validate Before Sending

```typescript
// Always validate before adding to your contact list
const result = await validateEmail(email);

if (result.score >= 70) {
  // Safe to use
  addToContactList(email);
} else if (result.score >= 40) {
  // Use with caution
  addToRiskyList(email);
} else {
  // Don't use
  logInvalidEmail(email, result);
}
```

### 2. Batch Validation

```typescript
// Validate in batches to avoid overwhelming servers
const emails = getScrapedEmails();
const batchSize = 50;

for (let i = 0; i < emails.length; i += batchSize) {
  const batch = emails.slice(i, i + batchSize);
  const results = await validateEmailsBulk(batch);
  
  // Process results
  processValidationResults(results);
  
  // Wait before next batch
  await delay(5000); // 5 seconds
}
```

### 3. Monitor Bounce Rates

```typescript
// Track which emails bounce
function handleBounce(email: string) {
  // Mark as invalid
  markEmailInvalid(email);
  
  // Remove from contact list
  removeFromContactList(email);
  
  // Log for analysis
  logBounce(email, new Date());
}
```

### 4. Regular Re-validation

```typescript
// Re-validate emails periodically
async function revalidateContacts() {
  const contacts = getAllContacts();
  const emails = contacts.map(c => c.email);
  
  const results = await validateEmailsBulk(emails);
  
  // Update contact statuses
  results.results.forEach(result => {
    updateContactStatus(result.email, result.score);
  });
}

// Run weekly
setInterval(revalidateContacts, 7 * 24 * 60 * 60 * 1000);
```

---

## 🛠️ Advanced Features

### Email Normalization

Different email providers handle addresses differently:

**Gmail:**
- Ignores dots: `john.doe@gmail.com` = `johndoe@gmail.com`
- Ignores plus addressing: `john+tag@gmail.com` = `john@gmail.com`

**Other providers:**
- May or may not ignore dots
- Usually support plus addressing

**Our normalization:**
```typescript
normalizeEmail('john.doe+newsletter@gmail.com');
// Result: johndoe@gmail.com

areEmailsSame('john.doe@gmail.com', 'johndoe@gmail.com');
// Result: true
```

### Disposable Email Detection

We maintain a list of 50+ disposable email domains:

```typescript
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com',
  'throwaway.email',
  'guerrillamail.com',
  'mailinator.com',
  'yopmail.com',
  // ... 45+ more
]);

isDisposableEmail('test@tempmail.com'); // true
isDisposableEmail('test@gmail.com');    // false
```

### Role-Based Email Detection

Identifies generic emails that may not reach a specific person:

```typescript
const ROLE_BASED_PREFIXES = new Set([
  'admin', 'administrator', 'webmaster',
  'info', 'support', 'sales', 'marketing',
  'billing', 'contact', 'help', 'service',
  // ... 20+ more
]);

isRoleBasedEmail('admin@company.com');  // true
isRoleBasedEmail('john@company.com');   // false
```

---

## 📊 Integration with ContactHarvest

### Automatic Validation on Import

When you scrape or import contacts, automatically validate emails:

```typescript
// In your scraping workflow
async function importContacts(scrapedData) {
  const contacts = [];
  
  for (const item of scrapedData) {
    // Validate email
    const validation = await validateEmail(item.email);
    
    if (validation.score >= 70) {
      contacts.push({
        ...item,
        emailValid: true,
        emailScore: validation.score,
      });
    } else {
      // Log invalid emails
      logInvalidEmail(item.email, validation);
    }
  }
  
  return contacts;
}
```

### Export Validated Contacts

Export only validated emails:

```typescript
function exportValidContacts(contacts) {
  const valid = contacts.filter(c => c.emailScore >= 70);
  
  const csv = Papa.unparse(valid.map(c => ({
    'Business Name': c.businessName,
    'Email': c.email,
    'Email Score': c.emailScore,
    'Phone': c.phone,
    'Website': c.website,
  })));
  
  downloadCSV(csv, 'validated_contacts.csv');
}
```

---

## 🐛 Troubleshooting

### Backend Service Not Connecting

**Problem:** Frontend shows "Backend not available"

**Solutions:**
1. Make sure backend is running: `node backend/email-verification-service.js`
2. Check URL in Email Validator settings matches backend port
3. Verify CORS is enabled (should be by default)
4. Check firewall isn't blocking port 3002

### SMTP Verification Fails

**Problem:** All emails show "SMTP: Failed"

**Possible causes:**
1. Mail server blocking your IP
2. Port 25 blocked by ISP
3. Mail server requires authentication
4. Rate limiting

**Solutions:**
1. Use a different IP or proxy
2. Try port 587 instead of 25
3. Increase delay between checks
4. Use a third-party email validation service

### High False Positives

**Problem:** Valid emails marked as invalid

**Possible causes:**
1. Catch-all domains
2. Greylisting
3. Temporary server issues

**Solutions:**
1. Retry failed validations after delay
2. Lower score threshold (use 60+ instead of 70+)
3. Manually review borderline cases

---

## 📚 Additional Resources

### Third-Party Email Validation Services

If you need enterprise-grade validation:

1. **Hunter.io** - https://hunter.io/email-verifier
2. **ZeroBounce** - https://www.zerobounce.net
3. **NeverBounce** - https://neverbounce.com
4. **Mailgun** - https://www.mailgun.com/email-validation
5. **SendGrid** - https://sendgrid.com/products/email-validation

### Email Validation APIs

```javascript
// Example: Hunter.io API
const response = await fetch(
  `https://api.hunter.io/v2/email-verifier?email=test@example.com&api_key=YOUR_KEY`
);
const data = await response.json();
```

### SMTP Libraries

**Node.js:**
- `nodemailer` - SMTP client
- `smtp-server` - SMTP server for testing

**Python:**
- `smtplib` - Built-in SMTP client
- `dnspython` - DNS queries

---

## ✅ Summary

Email deliverability testing is essential for:
- ✅ Reducing bounce rates
- ✅ Improving sender reputation
- ✅ Saving money on email campaigns
- ✅ Ensuring contacts are reachable
- ✅ Maintaining data quality

**Our solution provides:**
- ✅ Client-side validation (instant)
- ✅ Backend MX record checking
- ✅ SMTP mailbox verification
- ✅ Bulk validation support
- ✅ Score-based filtering
- ✅ Export capabilities

**Next steps:**
1. Run the backend email verification service
2. Test single email validation
3. Try bulk validation with your contact list
4. Export validated contacts
5. Integrate into your workflow

---

## 🎯 Quick Start

```bash
# 1. Start email verification service
cd backend
node email-verification-service.js

# 2. Open ContactHarvest
# 3. Go to "Email Validator" tab
# 4. Enter an email and click "Validate"
# 5. View results!
```

That's it! You're now testing email deliverability like a pro. 🎉

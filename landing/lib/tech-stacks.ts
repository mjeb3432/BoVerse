// lib/tech-stacks.ts
//
// Known-tech-stack registry for DISCOVER-PHASE probing. When Discovery sees a
// signal for a common small-business system (QuickBooks, Salesforce, Excel, …)
// but the evidence leaves a build-relevant detail unresolved, we ask one
// targeted question during the gaps step — instead of silently assuming a
// connection shape the downstream Build swarm can't honor.
//
// This is deliberately a small, curated catalogue of the systems a $5M–$30M
// business without an IT department actually runs. It is NOT exhaustive and is
// not a substitute for what the evidence says — it only fires when a signal is
// present and a specific, switchable detail is missing.
//
// Each clarifier maps to a decision the downstream swarm has to make: which
// edition (changes the connector), API vs export (changes batch-vs-live), and
// auth shape (changes credentials). Keep questions in business language.

export interface TechStackClarifier {
  /** Stable id, unique within the stack. */
  id: string;
  /** The business-language question shown to the user. */
  question: string;
  /** Why we ask — one line, used in the gap's why_it_matters. */
  why: string;
  /**
   * Skip this clarifier when the signal text already resolves it (e.g. the
   * edition is named, or "API"/"export" is explicit). Returns true to SKIP.
   */
  resolvedBy?: (signalText: string) => boolean;
}

export interface TechStack {
  id: string;
  label: string;
  /**
   * Lowercased substrings / tokens that indicate this stack. Matched against
   * system names, input source-systems, and any free-text signal. Keep these
   * specific enough not to collide (e.g. 'qbo' not 'qb').
   */
  aliases: string[];
  clarifiers: TechStackClarifier[];
}

// Helper: does the signal text contain any of these tokens?
const has = (text: string, ...tokens: string[]) => tokens.some((t) => text.includes(t));

export const TECH_STACKS: TechStack[] = [
  {
    id: 'quickbooks',
    label: 'QuickBooks',
    aliases: ['quickbooks', 'qbo', 'quick books', 'intuit', 'qb desktop', 'qb online'],
    clarifiers: [
      {
        id: 'edition',
        question:
          'Is your QuickBooks the Online version (you log in through a browser) or the Desktop version (installed on a computer)? They connect very differently.',
        why: 'QuickBooks Online and Desktop use different integration paths — the wrong assumption means building the wrong connector.',
        resolvedBy: (s) => has(s, 'quickbooks online', 'qbo', 'qb online') || has(s, 'quickbooks desktop', 'qb desktop', 'enterprise', 'iif'),
      },
      {
        id: 'connection',
        question:
          'Should we connect to QuickBooks live (through its API), or will you hand us exports (CSV / IIF files) instead?',
        why: 'Live API vs file export is the difference between a real-time connector and a batch job.',
        resolvedBy: (s) => has(s, 'api', 'oauth', 'export', 'csv', 'iif', 'batch', 'upload'),
      },
    ],
  },
  {
    id: 'xero',
    label: 'Xero',
    aliases: ['xero'],
    clarifiers: [
      {
        id: 'connection',
        question:
          'Do you want us to connect to Xero live (through its API), or will you provide exports?',
        why: 'Determines whether the workflow is a live connector or a batch import.',
        resolvedBy: (s) => has(s, 'api', 'oauth', 'export', 'csv', 'batch', 'upload'),
      },
    ],
  },
  {
    id: 'sage',
    label: 'Sage',
    aliases: ['sage 50', 'sage 100', 'sage intacct', 'sage accounting', 'sage'],
    clarifiers: [
      {
        id: 'product',
        question:
          'Which Sage product is it — Sage 50, Sage 100, or Sage Intacct? Each connects differently.',
        why: 'The Sage family spans desktop and cloud products with different integration paths.',
        resolvedBy: (s) => has(s, 'sage 50', 'sage 100', 'intacct'),
      },
    ],
  },
  {
    id: 'salesforce',
    label: 'Salesforce',
    aliases: ['salesforce', 'sfdc', 'sales force'],
    clarifiers: [
      {
        id: 'connection',
        question:
          'For Salesforce, should we connect live through its API, or work from reports/exports you pull?',
        why: 'Live API vs exported reports changes whether this is a connector or a batch step.',
        resolvedBy: (s) => has(s, 'api', 'rest', 'soap', 'export', 'report', 'csv', 'batch'),
      },
      {
        id: 'env',
        question:
          'Which Salesforce environment should this point at — your live (production) org, or a sandbox for testing first?',
        why: 'Production vs sandbox changes the credentials and the blast radius of writes.',
        resolvedBy: (s) => has(s, 'sandbox', 'production', 'prod org'),
      },
    ],
  },
  {
    id: 'hubspot',
    label: 'HubSpot',
    aliases: ['hubspot', 'hub spot'],
    clarifiers: [
      {
        id: 'connection',
        question:
          'For HubSpot, do you want a live API connection, or will you give us exported lists?',
        why: 'Determines connector vs batch import.',
        resolvedBy: (s) => has(s, 'api', 'export', 'list', 'csv', 'batch'),
      },
    ],
  },
  {
    id: 'netsuite',
    label: 'NetSuite',
    aliases: ['netsuite', 'net suite', 'oracle netsuite'],
    clarifiers: [
      {
        id: 'connection',
        question:
          'For NetSuite, should we connect through its API (SuiteTalk), or work from saved-search exports?',
        why: 'Live API vs saved-search export changes the integration shape.',
        resolvedBy: (s) => has(s, 'api', 'suitetalk', 'saved search', 'export', 'csv'),
      },
    ],
  },
  {
    id: 'excel',
    label: 'Excel / spreadsheets',
    aliases: ['excel', 'xlsx', '.xls', 'spreadsheet', 'google sheets', 'google sheet', 'sheets'],
    clarifiers: [
      {
        id: 'location',
        question:
          'Where do these spreadsheets live — files you’ll upload each time, or a shared place we can read automatically (Google Sheets, SharePoint, OneDrive, Dropbox)?',
        why: 'Manual upload vs a shared, readable location is the difference between a batch step and a live read.',
        resolvedBy: (s) => has(s, 'upload', 'sharepoint', 'onedrive', 'google drive', 'gdrive', 'dropbox', 'shared drive', 'api'),
      },
      {
        id: 'stability',
        question:
          'Do these spreadsheets always have the same columns in the same order, or does the layout change from time to time?',
        why: 'A stable layout can be parsed deterministically; a shifting one needs tolerant column mapping.',
        resolvedBy: (s) => has(s, 'same columns', 'fixed layout', 'template', 'changes', 'varies'),
      },
    ],
  },
  {
    id: 'shopify',
    label: 'Shopify',
    aliases: ['shopify'],
    clarifiers: [
      {
        id: 'connection',
        question:
          'For Shopify, should we connect through its API, or work from CSV exports of orders/products?',
        why: 'Determines connector vs batch import.',
        resolvedBy: (s) => has(s, 'api', 'export', 'csv', 'batch'),
      },
    ],
  },
  {
    id: 'stripe',
    label: 'Stripe',
    aliases: ['stripe'],
    clarifiers: [
      {
        id: 'mode',
        question:
          'Should this run against your live Stripe account or test mode while we build?',
        why: 'Live vs test mode changes the keys and whether real money/records are touched.',
        resolvedBy: (s) => has(s, 'test mode', 'live mode', 'live key', 'test key', 'sandbox'),
      },
    ],
  },
  {
    id: 'email',
    label: 'Email inbox',
    aliases: ['outlook', 'gmail', 'office 365', 'o365', 'microsoft 365', 'exchange', 'imap', 'shared mailbox'],
    clarifiers: [
      {
        id: 'provider',
        question:
          'Which email system is the inbox on — Microsoft 365 / Outlook, or Google Workspace / Gmail? They authorize differently.',
        why: 'Microsoft vs Google mailboxes use different authorization and APIs.',
        resolvedBy: (s) => has(s, 'gmail', 'google workspace', 'outlook', 'office 365', 'o365', 'microsoft 365', 'exchange'),
      },
    ],
  },
];

export interface TechStackHit {
  stack: TechStack;
  /** The signal text that matched (for resolvedBy checks + provenance). */
  matchedSignal: string;
}

/**
 * Find every tech stack referenced anywhere in the provided signal strings.
 * Signals are concatenated system names, input source-systems, Setup answers,
 * and any other free text the caller chooses to pass. Returns one hit per
 * matched stack (deduped), carrying the lowercased combined signal for the
 * clarifiers' resolvedBy checks.
 */
export function detectTechStacks(signals: (string | null | undefined)[]): TechStackHit[] {
  const combined = signals.filter(Boolean).join(' \n ').toLowerCase();
  if (!combined.trim()) return [];
  const hits: TechStackHit[] = [];
  for (const stack of TECH_STACKS) {
    if (stack.aliases.some((a) => combined.includes(a))) {
      hits.push({ stack, matchedSignal: combined });
    }
  }
  return hits;
}

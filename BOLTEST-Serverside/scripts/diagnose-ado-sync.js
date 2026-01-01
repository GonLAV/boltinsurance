#!/usr/bin/env node
/**
 * TFS/Azure DevOps Sync Diagnostic Script
 * 
 * Run this to quickly identify why data sync is failing.
 * 
 * Usage:
 *   node scripts/diagnose-ado-sync.js
 *   
 * Or with arguments:
 *   node scripts/diagnose-ado-sync.js --orgUrl https://dev.azure.com/myorg --project MyProject --pat <token>
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  pass: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  fail: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}\n`)
};

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
};

// Get config
let orgUrl = getArg('--orgUrl') || process.env.AZDO_ORG_URL || '';
let project = getArg('--project') || process.env.AZDO_PROJECT || '';
let pat = getArg('--pat') || process.env.AZDO_PAT || '';

// If not provided via CLI or env, try to read from local.settings.json
if (!pat && fs.existsSync('local.settings.json')) {
  try {
    const settings = JSON.parse(fs.readFileSync('local.settings.json', 'utf8'));
    pat = pat || settings.Values?.AZDO_PAT;
    project = project || settings.Values?.AZDO_PROJECT;
    orgUrl = orgUrl || settings.Values?.AZDO_ORG_URL;
    log.info('Loaded credentials from local.settings.json');
  } catch (err) {
    // Ignore
  }
}

// Validate inputs
if (!orgUrl || !project || !pat) {
  log.section('Azure DevOps / TFS Sync Diagnostic Tool');
  console.log('Missing required credentials.\n');
  console.log('Provide one of:');
  console.log('  1. CLI arguments:');
  console.log('     node diagnose-ado-sync.js --orgUrl <url> --project <name> --pat <token>');
  console.log('  2. Environment variables:');
  console.log('     AZDO_ORG_URL=... AZDO_PROJECT=... AZDO_PAT=... node diagnose-ado-sync.js');
  console.log('  3. local.settings.json:');
  console.log('     { "Values": { "AZDO_ORG_URL": "...", "AZDO_PROJECT": "...", "AZDO_PAT": "..." } }');
  process.exit(1);
}

// Main diagnostic routine
(async () => {
  log.section('🔍 Azure DevOps / TFS Sync Diagnostic Tool');
  
  console.log(`Org URL: ${orgUrl}`);
  console.log(`Project: ${project}`);
  console.log(`PAT:     ${pat.slice(0, 4)}...${pat.slice(-4)}\n`);

  const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
  const httpsAgent = new (require('https').Agent)({ rejectUnauthorized: false });

  let passed = 0;
  let failed = 0;
  let warnings = 0;

  // TEST 1: URL Format
  log.section('1️⃣  URL Format Validation');
  try {
    new URL(orgUrl);
    log.pass('Organization URL format is valid');
    passed++;
  } catch (err) {
    log.fail(`URL format is invalid: ${err.message}`);
    log.warn('Expected formats:');
    console.log('  • https://dev.azure.com/<org>');
    console.log('  • https://<server>/tfs/<collection>');
    failed++;
  }

  // TEST 2: Network Connectivity
  log.section('2️⃣  Network Connectivity');
  try {
    const response = await axios.get(`${orgUrl}/_apis/projects?api-version=7.0`, {
      headers: { 'Authorization': authHeader },
      timeout: 8000,
      httpsAgent
    });
    log.pass('Can reach TFS/Azure DevOps server');
    log.info(`Found ${response.data.value?.length || 0} projects`);
    passed++;
  } catch (err) {
    if (err.code === 'ENOTFOUND') {
      log.fail('Cannot resolve hostname (ENOTFOUND)');
      log.warn('Check: Is the org URL correct? Is DNS working?');
    } else if (err.code === 'ECONNREFUSED') {
      log.fail('Connection refused (ECONNREFUSED)');
      log.warn('Check: Is the TFS server running? Is it accessible from this location?');
    } else if (err.response?.status === 401) {
      log.fail('Unauthorized (401) - PAT validation failed');
      log.warn('Check: Is the PAT valid and not expired?');
    } else if (err.response?.status === 403) {
      log.fail('Forbidden (403) - PAT lacks permissions');
      log.warn('Check: Does the PAT have "Whole organization (Read)" permission?');
    } else {
      log.fail(`Request failed: ${err.message}`);
    }
    failed++;
  }

  // TEST 3: Project Existence
  log.section('3️⃣  Project Validation');
  try {
    const response = await axios.get(`${orgUrl}/_apis/projects/${encodeURIComponent(project)}?api-version=7.0`, {
      headers: { 'Authorization': authHeader },
      timeout: 8000,
      httpsAgent
    });
    log.pass(`Project "${project}" exists`);
    log.info(`Project ID: ${response.data.id}`);
    passed++;
  } catch (err) {
    if (err.response?.status === 404) {
      log.fail(`Project "${project}" not found (404)`);
      log.warn(`Check: Is the project name spelled correctly?`);
      log.info(`Available projects at: ${orgUrl}/_apis/projects?api-version=7.0`);
    } else if (err.response?.status === 403) {
      log.fail(`No access to project "${project}" (403)`);
      log.warn('Check: Does the PAT have project access?');
    } else {
      log.fail(`Request failed: ${err.message}`);
    }
    failed++;
  }

  // TEST 4: Work Item API
  log.section('4️⃣  Work Item API (WIQL)');
  try {
    const response = await axios.post(
      `${orgUrl}/${project}/_apis/wit/wiql?api-version=7.0`,
      { query: `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '${project}'` },
      {
        headers: { 
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        timeout: 8000,
        httpsAgent
      }
    );
    const count = response.data.workItems?.length || 0;
    log.pass(`Work Item API is accessible (found ${count} items)`);
    passed++;
  } catch (err) {
    if (err.response?.status === 403) {
      log.fail('Forbidden (403) - PAT lacks Work Item permissions');
      log.warn('Check: PAT needs "Work Items: Read & Execute" scope');
    } else if (err.response?.status === 404) {
      log.fail('Not found (404) - API endpoint not available');
      log.warn('Check: Is API version 7.0 correct for your TFS/Azure DevOps version?');
      log.info('Try: 5.0 for TFS 2019, 5.1 for older TFS, 7.0+ for Azure DevOps Cloud');
    } else if (err.response?.status === 400) {
      log.fail('Bad request (400) - WIQL syntax error or version issue');
      log.warn('Check: WIQL syntax is correct, API version matches your TFS/Azure DevOps version');
    } else {
      log.fail(`Request failed: ${err.message}`);
    }
    failed++;
  }

  // TEST 5: Work Item Details with Relations
  log.section('5️⃣  Work Item Details (with Relations)');
  try {
    // First get a sample ID
    const wiqlResp = await axios.post(
      `${orgUrl}/${project}/_apis/wit/wiql?api-version=7.0`,
      { query: `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '${project}' ORDER BY [System.Id] DESC` },
      {
        headers: { 
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        timeout: 8000,
        httpsAgent
      }
    );

    const ids = (wiqlResp.data.workItems || []).slice(0, 2).map(w => w.id);
    
    if (ids.length === 0) {
      log.warn('No work items to test, but API is accessible');
      warnings++;
    } else {
      const detailsResp = await axios.get(
        `${orgUrl}/${project}/_apis/wit/workitems?ids=${ids.join(',')}&$expand=Relations&api-version=7.0`,
        {
          headers: { 'Authorization': authHeader },
          timeout: 8000,
          httpsAgent
        }
      );

      const items = detailsResp.data.value || [];
      const itemsWithRelations = items.filter(i => (i.relations || []).length > 0).length;
      
      log.pass(`Work Item details accessible (${ids.length} items tested)`);
      log.info(`Items with relations: ${itemsWithRelations}/${items.length}`);
      passed++;
    }
  } catch (err) {
    if (err.response?.status === 403) {
      log.fail('Forbidden (403) - Cannot fetch work item details');
      log.warn('Check: PAT needs "Work Items: Read & Execute" permission');
    } else if (err.response?.status === 404) {
      log.fail('Not found (404)');
      log.warn('Check: Work item IDs are valid, or API version is correct');
    } else {
      log.fail(`Request failed: ${err.message}`);
    }
    failed++;
  }

  // TEST 6: Test Plan API (optional)
  log.section('6️⃣  Test Plan API (Optional)');
  try {
    const response = await axios.get(
      `${orgUrl}/${project}/_apis/testplan/plans?api-version=7.1`,
      {
        headers: { 'Authorization': authHeader },
        timeout: 8000,
        httpsAgent
      }
    );
    const count = response.data.value?.length || 0;
    log.pass(`Test Plan API is accessible (found ${count} plans)`);
    passed++;
  } catch (err) {
    if (err.response?.status === 404) {
      log.warn('Test Plan API not available (expected for older TFS versions)');
      log.info('Test Plans are available in: Azure DevOps Cloud, TFS 2019+');
      warnings++;
    } else if (err.response?.status === 403) {
      log.fail('Forbidden (403) - PAT lacks Test Plan permissions');
      log.warn('Check: PAT needs "Test Plan & Results: Read" scope');
      warnings++;
    } else {
      log.warn(`Test Plan API unavailable: ${err.message}`);
      warnings++;
    }
  }

  // SUMMARY
  log.section('📋 Summary');
  console.log(`Passed:  ${colors.green}${passed}${colors.reset}`);
  console.log(`Failed:  ${colors.red}${failed}${colors.reset}`);
  console.log(`Warnings: ${colors.yellow}${warnings}${colors.reset}`);

  if (failed === 0) {
    log.section('✅ All critical checks passed!');
    console.log('Your backend can sync data from TFS/Azure DevOps.\n');
    
    if (warnings > 0) {
      log.warn('Some optional features may be unavailable.');
    }
    
    process.exit(0);
  } else {
    log.section('❌ Some checks failed!');
    console.log('Fix the issues above and try again.\n');
    process.exit(1);
  }
})().catch(err => {
  log.fail(`Unexpected error: ${err.message}`);
  process.exit(1);
});

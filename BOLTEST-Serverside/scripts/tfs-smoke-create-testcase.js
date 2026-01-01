#!/usr/bin/env node

require('dotenv').config();
const AzureDevOpsService = require('../services/azureDevOpsService');

async function main() {
  const orgUrl = process.env.TFS_ORG_URL || process.env.ORG_URL;
  const project = process.env.TFS_PROJECT || process.env.PROJECT;
  const pat = process.env.TFS_PAT || process.env.PAT;
  const title = process.env.TITLE || `BOLTEST Smoke ${new Date().toISOString()}`;
  const description = process.env.DESCRIPTION || 'Created by BOLTEST smoke script';
  const userStoryId = process.env.USER_STORY_ID ? String(process.env.USER_STORY_ID) : undefined;

  if (!orgUrl || !project || !pat) {
    console.error('Missing env vars. Provide: TFS_ORG_URL, TFS_PROJECT, TFS_PAT');
    console.error('Example:');
    console.error('  TFS_ORG_URL="https://server/tfs/Collection" TFS_PROJECT="Epos" TFS_PAT="..." node scripts/tfs-smoke-create-testcase.js');
    process.exit(2);
  }

  const svc = new AzureDevOpsService(orgUrl, project, pat);

  console.log('Testing connection...', { orgUrl, project });
  const conn = await svc.testConnection();
  if (!conn.success) {
    console.error('Connection failed:', conn);
    process.exit(1);
  }
  console.log('Connection OK. Using apiVersion =', conn.data?.apiVersion);

  const result = await svc.createTestCase({
    title,
    description,
    steps: [
      { action: 'Open the application', expectedResult: 'Application loads' },
      { action: 'Verify smoke test case', expectedResult: 'Test case is created in TFS' }
    ],
    userStoryId
  });

  if (!result.success) {
    console.error('Create failed:', result);
    process.exit(1);
  }

  console.log('Created Test Case:', result.data);
  if (result.data?.url) console.log('Open in browser:', result.data.url);
}

main().catch((e) => {
  console.error('Unexpected error:', e?.message || e);
  process.exit(1);
});

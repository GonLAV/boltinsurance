#!/usr/bin/env node

/**
 * Test Script: Auto-Assign Test Case to Creator
 * 
 * This script tests the new auto-assignment feature that assigns newly created 
 * test cases to the user whose PAT was used to create them.
 * 
 * Usage:
 *   node test-auto-assign.js <orgUrl> <project> <pat> <testCaseTitle>
 * 
 * Example:
 *   node test-auto-assign.js "https://dev.azure.com/yourorg" "YourProject" "your-pat-here" "Test Auto Assign"
 */

const http = require('http');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('Usage: node test-auto-assign.js <orgUrl> <project> <pat> [testCaseTitle]');
  console.error('');
  console.error('Example:');
  console.error('  node test-auto-assign.js "https://dev.azure.com/myorg" "MyProject" "pXxxxxxzzzzzz" "Test Auto Assign"');
  process.exit(1);
}

const orgUrl = args[0];
const project = args[1];
const pat = args[2];
const testCaseTitle = args[3] || `Auto-Assign Test ${Date.now()}`;

const payload = JSON.stringify({
  org: orgUrl,
  project: project,
  testCase: {
    title: testCaseTitle,
    description: 'This test case was automatically assigned to the creator (based on PAT)',
    testSteps: [
      {
        action: 'Step 1',
        expectedResult: 'Expected Result 1'
      }
    ]
  }
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/ado/testcase',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': payload.length,
    'X-Pat': pat,
    'X-OrgUrl': orgUrl
  }
};

console.log('📝 Testing Auto-Assign Test Case Feature');
console.log('═'.repeat(50));
console.log(`  Org URL: ${orgUrl}`);
console.log(`  Project: ${project}`);
console.log(`  Title: ${testCaseTitle}`);
console.log(`  PAT: ${pat.substring(0, 10)}...`);
console.log('═'.repeat(50));
console.log('');
console.log('Sending POST request to /api/ado/testcase...');
console.log('');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      console.log(`✅ Response Status: ${res.statusCode}`);
      console.log('');
      
      if (result.success) {
        console.log('🎉 SUCCESS: Test case created and auto-assigned!');
        console.log('');
        console.log(`  Test Case ID: ${result.id}`);
        console.log(`  Created: ${result.created}`);
        if (result.created) {
          console.log(`  URL: ${result.url || 'N/A'}`);
        }
        console.log('');
        console.log('✓ The new test case is assigned to the user from the PAT.');
        console.log('  Check your Azure DevOps project to verify the assignment!');
      } else {
        console.log('❌ FAILED: Test case creation failed');
        console.log('');
        console.log(`  Error: ${result.error || 'Unknown error'}`);
        console.log(`  Message: ${result.message || 'No message provided'}`);
      }
      
      console.log('');
      console.log('Full Response:');
      console.log(JSON.stringify(result, null, 2));
      
    } catch (e) {
      console.error('❌ Failed to parse response:', e.message);
      console.error('');
      console.error('Raw Response:');
      console.error(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request Error:', error.message);
  console.error('');
  console.error('Make sure:');
  console.error('  1. Backend server is running on port 5000');
  console.error('  2. PAT is valid and has permissions to create test cases');
  console.error('  3. Org URL is correct');
  process.exit(1);
});

// Write the request body
req.write(payload);
req.end();

/**
 * End-to-End Examples for Azure DevOps Test Client
 * Demonstrates all major operations: runs, results, plans, suites, points, and queries
 */

import {
  AdoTestClient,
  createAdoTestClient,
  TestCaseResult,
  TestIterationDetailsModel,
  RunCreateModel,
} from './adoTestClient';

/**
 * Example 1: Create a test run and add results
 */
async function exampleCreateRunAndAddResults() {
  const client = new AdoTestClient({
    organizationUrl: 'https://dev.azure.com/fabrikam',
    pat: process.env.AZURE_DEVOPS_PAT,
  });

  const projectId = 'Fabrikam-Fiber-TFVC';

  // Create a test run
  const runPayload: RunCreateModel = {
    name: 'Unit Tests - Build 20231215.1',
    automated: true,
    buildId: 123,
    description: 'Automated unit tests from CI/CD pipeline',
  };

  const createdRun = await client.createRun(projectId, runPayload);
  console.log(`✓ Created test run: ${createdRun.name} (ID: ${createdRun.id})`);

  // Add test results to the run
  const testResults: TestCaseResult[] = [
    {
      testCaseTitle: 'VerifyWebsiteTheme',
      automatedTestName: 'FabrikamFiber.WebSite.TestClass.VerifyWebsiteTheme',
      outcome: 'Passed',
      priority: 1,
      startedDate: new Date(Date.now() - 5000),
      completedDate: new Date(),
      durationInMs: 5000,
      comment: 'Theme verification passed',
    },
    {
      testCaseTitle: 'VerifyWebsiteLinks',
      automatedTestName: 'FabrikamFiber.WebSite.TestClass.VerifyWebsiteLinks',
      outcome: 'Failed',
      priority: 2,
      startedDate: new Date(Date.now() - 3000),
      completedDate: new Date(),
      durationInMs: 3000,
      errorMessage: 'Navigation links not accessible',
      stackTrace: 'at WebTests.LinkValidator.CheckLinks() line 42',
      failureType: 'New Issue',
    },
  ];

  const addedResults = await client.addResults(projectId, createdRun.id, testResults);
  console.log(`✓ Added ${addedResults.length} test results to run`);

  return { run: createdRun, results: addedResults };
}

/**
 * Example 2: Update test results with step-level outcomes (manual test iterations)
 */
async function exampleUpdateResultsWithIterations() {
  const client = new AdoTestClient({
    organizationUrl: 'https://dev.azure.com/fabrikam',
    pat: process.env.AZURE_DEVOPS_PAT,
  });

  const projectId = 'Fabrikam-Fiber-TFVC';
  const runId = 31; // Manual test run ID
  const resultId = 100000; // Existing result ID

  // Prepare iteration details with step-level outcomes
  const iterationDetails: TestIterationDetailsModel = {
    id: 1,
    outcome: 'Failed',
    comment: 'Step 1 validation failed',
    errorMessage: 'Expected username field was not displayed',
    startedDate: new Date().toISOString(),
    completedDate: new Date().toISOString(),
    durationInMs: 2439,
    actionResults: [
      {
        actionPath: '00000002', // Step 1 in hex
        iterationId: 1,
        outcome: 'Failed',
        comment: 'Login page not loaded',
        errorMessage: 'Timeout waiting for element',
        startedDate: new Date().toISOString(),
        completedDate: new Date().toISOString(),
        durationInMs: 500,
        stepIdentifier: '1',
      },
      {
        actionPath: '00000003', // Step 2 in hex
        iterationId: 1,
        outcome: 'Blocked',
        comment: 'Could not proceed due to step 1 failure',
        startedDate: new Date().toISOString(),
        completedDate: new Date().toISOString(),
        stepIdentifier: '2',
      },
    ],
    parameters: [
      {
        parameterName: 'Username',
        value: 'testuser@example.com',
        actionPath: '00000002',
        stepIdentifier: '1',
      },
      {
        parameterName: 'Password',
        value: 'xxxxx',
        actionPath: '00000003',
        stepIdentifier: '2',
      },
    ],
  };

  // Update result with iteration details
  const updatePayload: Partial<TestCaseResult> = {
    id: resultId,
    outcome: 'Failed',
    state: 'Completed',
    comment: 'Manual test execution - step 1 failed',
    iterationDetails: [iterationDetails],
  };

  const updatedResults = await client.updateResults(projectId, runId, [updatePayload]);
  console.log(`✓ Updated result ${resultId} with iteration details`);
  console.log(
    `  - Iteration outcome: ${iterationDetails.outcome}`,
    `\n  - Steps executed: ${iterationDetails.actionResults?.length || 0}`
  );

  return updatedResults;
}

/**
 * Example 3: List and filter test results
 */
async function exampleListResultsWithFilters() {
  const client = new AdoTestClient({
    organizationUrl: 'https://dev.azure.com/fabrikam',
    pat: process.env.AZURE_DEVOPS_PAT,
  });

  const projectId = 'Fabrikam-Fiber-TFVC';
  const runId = 16;

  // List only failed results with full details
  const failedResults = await client.listResults(projectId, runId, {
    outcomes: ['Failed', 'Blocked'],
    detailsToInclude: 'iterations',
    top: 50,
  });

  console.log(`✓ Found ${failedResults.length} failed/blocked results`);

  if (failedResults.length > 0) {
    const firstResult = failedResults[0];
    console.log(`\n  Result ID: ${firstResult.id}`);
    console.log(`  Title: ${firstResult.testCaseTitle}`);
    console.log(`  Outcome: ${firstResult.outcome}`);
    console.log(`  Error: ${firstResult.errorMessage}`);

    if (firstResult.iterationDetails?.length) {
      console.log(`  Iterations: ${firstResult.iterationDetails.length}`);
    }
  }

  return failedResults;
}

/**
 * Example 4: Create test plan and add test cases to suite
 */
async function exampleCreatePlanAndAddCases() {
  const client = new AdoTestClient({
    organizationUrl: 'https://dev.azure.com/fabrikam',
    pat: process.env.AZURE_DEVOPS_PAT,
  });

  const projectId = 'Fabrikam-Fiber-TFVC';

  // Create test plan
  const planPayload = {
    name: 'Website Testing - Release 2024.1',
    description: 'Comprehensive testing for website features',
    areaPath: '\\Fabrikam-Fiber-TFVC\\Product',
    iterationPath: '\\Fabrikam-Fiber-TFVC\\Release 2024.1',
  };

  const createdPlan = await client.createTestPlan(projectId, planPayload);
  console.log(`✓ Created test plan: ${createdPlan.name} (ID: ${createdPlan.id})`);

  // Get suites in the plan
  const suites = await client.listSuites(projectId, createdPlan.id, {
    asTreeView: true,
  });

  console.log(`✓ Found ${suites.length} suites in plan`);

  if (suites.length > 0) {
    const staticSuite = suites[0];

    // Add test cases to the suite using Test API
    const testCaseIds = [33, 34, 35];
    const addedCases = await client.addTestCasesToSuite(
      projectId,
      createdPlan.id,
      staticSuite.id,
      testCaseIds
    );

    console.log(`✓ Added ${addedCases.length} test cases to suite ${staticSuite.name}`);

    // Also demonstrate TestPlan API variant with configurations
    const casesWithConfigs = await client.addCasesWithConfigurations(
      projectId,
      createdPlan.id,
      staticSuite.id,
      [
        { testCaseId: 36, configurationIds: [1, 2] },
        { testCaseId: 37, configurationIds: [1] },
      ]
    );

    console.log(`✓ Added ${casesWithConfigs.length} test cases with configurations`);
  }

  return createdPlan;
}

/**
 * Example 5: List and update test points
 */
async function exampleListAndUpdatePoints() {
  const client = new AdoTestClient({
    organizationUrl: 'https://dev.azure.com/fabrikam',
    pat: process.env.AZURE_DEVOPS_PAT,
  });

  const projectId = 'Fabrikam-Fiber-TFVC';
  const planId = 1;
  const suiteId = 10;

  // List test points
  const points = await client.listPoints(projectId, planId, suiteId, {
    includePointDetails: true,
    top: 100,
  });

  console.log(`✓ Found ${points.length} test points in suite`);

  if (points.length > 0) {
    // Get first few point IDs
    const pointIds = points.slice(0, 3).map((p) => p.id);

    // Update points with new outcome and tester
    const updatePayload = {
      outcome: 'Passed' as const,
      tester: {
        id: 'user@fabrikam.com',
        displayName: 'Test User',
      },
    };

    const updatedPoints = await client.updatePoints(
      projectId,
      planId,
      suiteId,
      pointIds,
      updatePayload
    );

    console.log(`✓ Updated ${updatedPoints.length} test points`);
    console.log(`  - New outcome: ${updatePayload.outcome}`);
    console.log(`  - Assigned to: ${updatePayload.tester.displayName}`);
  }

  return points;
}

/**
 * Example 6: Execute WIQL queries
 */
async function exampleWiqlQueries() {
  const client = new AdoTestClient({
    organizationUrl: 'https://dev.azure.com/fabrikam',
    pat: process.env.AZURE_DEVOPS_PAT,
  });

  const projectId = 'Fabrikam-Fiber-TFVC';

  // Query 1: Find all user stories
  const storiesQuery = `
    SELECT [System.Id], [System.Title], [System.State]
    FROM WorkItems
    WHERE [System.WorkItemType] = 'User Story'
    AND [System.AreaPath] = '${projectId}'
    AND [System.State] <> 'Removed'
    ORDER BY [System.CreatedDate] DESC
  `;

  const storiesResult = await client.queryByWiql(projectId, storiesQuery, { top: 100 });
  console.log(`✓ Found ${storiesResult.workItems?.length || 0} user stories`);

  // Query 2: Find stories with test cases using TestedBy link
  const storiesWithTests = await client.findStoriesWithTests(projectId, {
    areaPath: `${projectId}`,
    top: 50,
  });

  console.log(`✓ Found ${storiesWithTests.workItemRelations?.length || 0} story-test relationships`);

  if (storiesWithTests.workItemRelations?.length) {
    const relation = storiesWithTests.workItemRelations[0];
    console.log(`\n  Story ID: ${relation.source?.id}`);
    console.log(`  Tested by: ${relation.target?.id}`);
    console.log(`  Link type: ${relation.rel}`);
  }

  // Query 3: Find test cases in a specific area
  const testCasesQuery = `
    SELECT [System.Id], [System.Title]
    FROM WorkItems
    WHERE [System.WorkItemType] = 'Test Case'
    AND [System.AreaPath] UNDER '${projectId}\\Product'
    AND [System.State] <> 'Removed'
  `;

  const testCasesResult = await client.queryByWiql(projectId, testCasesQuery, { top: 100 });
  console.log(`✓ Found ${testCasesResult.workItems?.length || 0} test cases in Product area`);

  return {
    stories: storiesResult,
    storiesWithTests,
    testCases: testCasesResult,
  };
}

/**
 * Example 7: Complete end-to-end workflow
 */
async function exampleCompleteWorkflow() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║        Azure DevOps Test Client - Complete Workflow           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Initialize client
    const client = createAdoTestClient({
      organizationUrl: 'https://dev.azure.com/fabrikam',
      pat: process.env.AZURE_DEVOPS_PAT,
    });

    const projectId = 'Fabrikam-Fiber-TFVC';

    // Step 1: Query test cases
    console.log('\n📋 STEP 1: Discover test cases');
    console.log('─────────────────────────────');
    const testCasesQuery = `
      SELECT [System.Id], [System.Title]
      FROM WorkItems
      WHERE [System.WorkItemType] = 'Test Case'
      AND [System.AreaPath] = '${projectId}'
      ORDERBY [System.CreatedDate] DESC
    `;

    const testCasesResult = await client.queryByWiql(projectId, testCasesQuery, { top: 10 });
    const testCaseIds =
      testCasesResult.workItems
        ?.slice(0, 5)
        .map((w) => parseInt(w.id as any)) || [];

    console.log(`Found ${testCaseIds.length} test cases: [${testCaseIds.join(', ')}]`);

    // Step 2: Create test run
    console.log('\n🚀 STEP 2: Create test run');
    console.log('──────────────────────────');
    const run = await client.createRun(projectId, {
      name: `End-to-End Test Run ${new Date().toISOString().split('T')[0]}`,
      automated: true,
      description: 'Complete workflow demonstration',
    });

    console.log(`Created test run: ${run.name} (ID: ${run.id})`);

    // Step 3: Add test results
    console.log('\n📊 STEP 3: Add test results');
    console.log('───────────────────────────');
    const results: TestCaseResult[] = testCaseIds.map((id, index) => ({
      testCaseTitle: `Test Case ${id}`,
      automatedTestName: `MyTests.TestCase${id}`,
      outcome: index % 3 === 0 ? 'Failed' : 'Passed',
      priority: (index % 5) + 1,
      startedDate: new Date(),
      completedDate: new Date(Date.now() + (index + 1) * 1000),
      durationInMs: (index + 1) * 100,
    }));

    const addedResults = await client.addResults(projectId, run.id, results);
    console.log(`Added ${addedResults.length} test results`);

    // Step 4: List results with filters
    console.log('\n🔍 STEP 4: List and filter results');
    console.log('──────────────────────────────────');
    const allResults = await client.listResults(projectId, run.id);
    const passedCount = allResults.filter((r) => r.outcome === 'Passed').length;
    const failedCount = allResults.filter((r) => r.outcome === 'Failed').length;

    console.log(`Total results: ${allResults.length}`);
    console.log(`  ✓ Passed: ${passedCount}`);
    console.log(`  ✗ Failed: ${failedCount}`);

    // Step 5: Update results with bugs
    if (failedCount > 0) {
      console.log('\n🐛 STEP 5: Link bugs to failed results');
      console.log('────────────────────────────────────');
      const failedResults = allResults
        .filter((r) => r.outcome === 'Failed')
        .slice(0, 2)
        .map((r) => ({
          id: r.id,
          outcome: 'Failed' as const,
          failureType: 'New Issue' as const,
          comment: 'Defect created - awaiting fix',
        }));

      const updated = await client.updateResults(projectId, run.id, failedResults);
      console.log(`Updated ${updated.length} results with bug references`);
    }

    // Step 6: Get final stats
    console.log('\n📈 STEP 6: Final statistics');
    console.log('───────────────────────────');
    const finalRun = await client.getRun(projectId, run.id);
    console.log(`Run status: ${finalRun.state}`);
    console.log(`Total results: ${finalRun.testResultsCount}`);
    console.log(`Duration: ${finalRun.completedDate ? 'Completed' : 'In Progress'}`);

    console.log(
      '\n✨ Workflow completed successfully!\n'
    );
  } catch (error: any) {
    console.error('❌ Error during workflow:', error.message);
    if (error.statusCode) {
      console.error(`   Status code: ${error.statusCode}`);
      console.error(`   Error code: ${error.errorCode}`);
    }
  }
}

// ============================================================================
// EXPORT EXAMPLES
// ============================================================================

export {
  exampleCreateRunAndAddResults,
  exampleUpdateResultsWithIterations,
  exampleListResultsWithFilters,
  exampleCreatePlanAndAddCases,
  exampleListAndUpdatePoints,
  exampleWiqlQueries,
  exampleCompleteWorkflow,
};

// Run examples if executed directly
if (require.main === module) {
  (async () => {
    try {
      // Run the complete workflow
      await exampleCompleteWorkflow();

      // Or uncomment to run individual examples:
      // await exampleCreateRunAndAddResults();
      // await exampleUpdateResultsWithIterations();
      // await exampleListResultsWithFilters();
      // await exampleCreatePlanAndAddCases();
      // await exampleListAndUpdatePoints();
      // await exampleWiqlQueries();
    } catch (error) {
      console.error('Example execution failed:', error);
      process.exit(1);
    }
  })();
}

/**
 * Azure DevOps Test REST API v7.1 Type Definitions
 * Complete typing for all Test Management REST API payloads
 */

// ============================================================================
// CLIENT CONFIGURATION
// ============================================================================

/**
 * Configuration for AdoTestClient initialization
 */
export interface AdoClientConfig {
  /** Base organization URL (e.g., https://dev.azure.com/myorg or http://tfs.local/tfs/myorg) */
  organizationUrl: string;

  /** Default project name or ID */
  project?: string;

  /** Personal Access Token (mutually exclusive with bearerToken) */
  pat?: string;

  /** OAuth2 Bearer token (mutually exclusive with pat) */
  bearerToken?: string;

  /** API version (default: 7.1) */
  apiVersion?: string;
}

// ============================================================================
// TEST RUNS
// ============================================================================

/**
 * Parameters for creating a test run
 * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/test/runs/create
 */
export interface RunCreateModel {
  /** Name of the test run (required) */
  name: string;

  /** Build ID to associate with this run */
  buildId?: number;

  /** Release ID to associate with this run */
  releaseId?: number;

  /** Build URI */
  buildUri?: string;

  /** Release URI */
  releaseUri?: string;

  /** Release environment URI */
  releaseEnvironmentUri?: string;

  /** Test settings */
  testSettings?: ShallowReference;

  /** Automated settings */
  automated?: boolean;

  /** Comment about the run */
  comment?: string;

  /** Configuration for the run */
  configurationIds?: number[];

  /** Controller for the run */
  controller?: string;

  /** Custom settings */
  customProperties?: { [key: string]: string };

  /** Description */
  description?: string;

  /** Due date */
  dueDate?: string;

  /** Environment URI */
  environmentUri?: string;

  /** Owner of the run */
  owner?: IdentityRef;

  /** Run timeout in minutes */
  runTimeout?: number;

  /** State of the run */
  state?: string;

  /** Test run type (1 = NormalTestRun, 2 = WebBasedTestRun) */
  type?: 'NormalTestRun' | 'WebBasedTestRun';
}

/**
 * Test run object
 * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/test/runs
 */
export interface TestRun {
  /** Run ID */
  id: number;

  /** Run name */
  name: string;

  /** Associated build ID */
  buildId?: number;

  /** Associated release ID */
  releaseId?: number;

  /** Build URI */
  buildUri?: string;

  /** Release URI */
  releaseUri?: string;

  /** Release environment URI */
  releaseEnvironmentUri?: string;

  /** Run state (NotStarted, InProgress, Completed, Aborted) */
  state: string;

  /** Automated run flag */
  automated: boolean;

  /** Run comment */
  comment?: string;

  /** Controller name */
  controller?: string;

  /** Configuration IDs */
  configurationIds?: number[];

  /** Created date (UTC) */
  createdDate: string;

  /** Created by user */
  createdBy?: IdentityRef;

  /** Custom test properties */
  customProperties?: { [key: string]: string };

  /** Description */
  description?: string;

  /** Due date */
  dueDate?: string;

  /** Environment URI */
  environmentUri?: string;

  /** Error message if applicable */
  errorMessage?: string;

  /** Completed date (UTC) */
  completedDate?: string;

  /** Owner of the run */
  owner?: IdentityRef;

  /** Project reference */
  project?: ShallowReference;

  /** Release reference */
  releaseReference?: ReleaseReference;

  /** Number of test results */
  testResultsCount?: number;

  /** Timeout in minutes */
  runTimeout?: number;

  /** Run type */
  type?: string;

  /** URL to this run */
  url?: string;

  /** Links */
  _links?: ReferenceLinks;
}

/**
 * Query result for test runs
 */
export interface TestRunQueryResult {
  /** Total count of results */
  count: number;

  /** Array of matching test runs */
  value: TestRun[];

  /** Continuation token for pagination */
  continuationToken?: number;
}

// ============================================================================
// TEST RESULTS
// ============================================================================

/**
 * Test case result object
 * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/test/results
 */
export interface TestCaseResult {
  /** Result ID */
  id?: number;

  /** Test case title */
  testCaseTitle: string;

  /** Fully qualified automated test name */
  automatedTestName: string;

  /** Test container (DLL name) */
  automatedTestStorage?: string;

  /** Type of automated test (UnitTest, WebTest, etc) */
  automatedTestType?: string;

  /** TypeId of automated test */
  automatedTestTypeId?: string;

  /** Test outcome (Passed, Failed, Blocked, etc) */
  outcome: TestOutcome;

  /** Result state (Completed, InProgress) */
  state?: TestResultState;

  /** Test priority (0-4) */
  priority?: number;

  /** Execution start time (UTC) */
  startedDate?: string | Date;

  /** Execution completion time (UTC) */
  completedDate?: string | Date;

  /** Duration in milliseconds */
  durationInMs?: number;

  /** Result comment (max 1000 chars) */
  comment?: string;

  /** Error message */
  errorMessage?: string;

  /** Stack trace (max 1000 chars) */
  stackTrace?: string;

  /** Failure type classification */
  failureType?: FailureType;

  /** Resolution state */
  resolutionState?: string;

  /** Resolution state ID */
  resolutionStateId?: number;

  /** Computer name where test executed */
  computerName?: string;

  /** Associated build reference */
  build?: ShallowReference;

  /** Detailed build reference */
  buildReference?: BuildReference;

  /** Associated release reference */
  release?: ShallowReference;

  /** Detailed release reference */
  releaseReference?: ReleaseReference;

  /** Configuration reference */
  configuration?: ShallowReference;

  /** Area reference */
  area?: ShallowReference;

  /** Test case reference */
  testCase?: ShallowReference;

  /** Test case reference ID */
  testCaseReferenceId?: number;

  /** Test case revision */
  testCaseRevision?: number;

  /** Test plan reference */
  testPlan?: ShallowReference;

  /** Test suite reference */
  testSuite?: ShallowReference;

  /** Test point reference */
  testPoint?: ShallowReference;

  /** Test run reference */
  testRun?: ShallowReference;

  /** Project reference */
  project?: ShallowReference;

  /** Run by user */
  runBy?: IdentityRef;

  /** Test owner */
  owner?: IdentityRef;

  /** Last updated by */
  lastUpdatedBy?: IdentityRef;

  /** Last updated date */
  lastUpdatedDate?: string;

  /** Created date */
  createdDate?: string;

  /** Result revision */
  revision?: number;

  /** Reset count */
  resetCount?: number;

  /** Associated work items/bugs */
  associatedBugs?: ShallowReference[];

  /** Action recording attachment ID */
  afnStripId?: number;

  /** Result group type (none, rerun, dataDriven, orderedTest, generic) */
  resultGroupType?: ResultGroupType;

  /** Sub-results for hierarchical tests */
  subResults?: TestSubResult[];

  /** Iteration details for manual tests */
  iterationDetails?: TestIterationDetailsModel[];

  /** Failing since information */
  failingSince?: FailingSince;

  /** Custom fields */
  customFields?: CustomTestField[];

  /** URL to this result */
  url?: string;
}

/** Test outcome enumeration */
export type TestOutcome =
  | 'Unspecified'
  | 'None'
  | 'Passed'
  | 'Failed'
  | 'Inconclusive'
  | 'Timeout'
  | 'Aborted'
  | 'Blocked'
  | 'NotExecuted'
  | 'Warning'
  | 'Error'
  | 'NotApplicable'
  | 'Paused'
  | 'InProgress'
  | 'NotImpacted';

/** Test result state enumeration */
export type TestResultState = 'Pending' | 'Queued' | 'InProgress' | 'Completed';

/** Failure type enumeration */
export type FailureType = 'None' | 'Known Issue' | 'New Issue' | 'Regression' | 'Unknown';

/** Result group type enumeration */
export type ResultGroupType = 'none' | 'rerun' | 'dataDriven' | 'orderedTest' | 'generic';

/**
 * Test iteration details for manual tests
 */
export interface TestIterationDetailsModel {
  /** Iteration ID */
  id: number;

  /** Iteration outcome */
  outcome: TestOutcome;

  /** Iteration comment */
  comment?: string;

  /** Error message */
  errorMessage?: string;

  /** Started date (UTC) */
  startedDate?: string;

  /** Completed date (UTC) */
  completedDate?: string;

  /** Duration in milliseconds */
  durationInMs?: number;

  /** Action results for each step */
  actionResults?: TestActionResultModel[];

  /** Parameters used in iteration */
  parameters?: TestResultParameterModel[];

  /** Attachments for iteration */
  attachments?: TestCaseResultAttachmentModel[];

  /** URL to iteration */
  url?: string;
}

/**
 * Test action result (step result)
 */
export interface TestActionResultModel {
  /** Action path in hexadecimal format (8 digits per level) */
  actionPath: string;

  /** Iteration ID */
  iterationId: number;

  /** Step outcome */
  outcome: TestOutcome;

  /** Step comment */
  comment?: string;

  /** Error message */
  errorMessage?: string;

  /** Started date (UTC) */
  startedDate?: string;

  /** Completed date (UTC) */
  completedDate?: string;

  /** Duration in milliseconds */
  durationInMs?: number;

  /** Step identifier (hierarchical: "1", "2;1", "2;3;1") */
  stepIdentifier?: string;

  /** Reference to shared step */
  sharedStepModel?: SharedStepModel;

  /** URL to action result */
  url?: string;
}

/**
 * Test parameter in iteration
 */
export interface TestResultParameterModel {
  /** Parameter name */
  parameterName: string;

  /** Parameter value */
  value: string;

  /** Action path where parameter is used */
  actionPath?: string;

  /** Step identifier */
  stepIdentifier?: string;

  /** Iteration ID */
  iterationId?: number;

  /** URL to parameter */
  url?: string;
}

/**
 * Test attachment in iteration
 */
export interface TestCaseResultAttachmentModel {
  /** Attachment ID */
  id: number;

  /** Attachment name */
  name: string;

  /** Attachment size in bytes */
  size: number;

  /** Action path where attached */
  actionPath?: string;

  /** Iteration ID */
  iterationId: number;

  /** URL to attachment */
  url: string;
}

/**
 * Test sub-result (data-driven variation, etc)
 */
export interface TestSubResult {
  /** Sub-result ID */
  id: number;

  /** Parent result ID */
  parentId: number;

  /** Display name */
  displayName?: string;

  /** Outcome */
  outcome?: TestOutcome;

  /** Sequence in parent */
  sequenceId?: number;

  /** Result group type */
  resultGroupType?: ResultGroupType;

  /** Started date (UTC) */
  startedDate?: string;

  /** Completed date (UTC) */
  completedDate?: string;

  /** Duration in milliseconds */
  durationInMs?: number;

  /** Comment */
  comment?: string;

  /** Error message */
  errorMessage?: string;

  /** Stack trace */
  stackTrace?: string;

  /** Configuration */
  configuration?: ShallowReference;

  /** Computer name */
  computerName?: string;

  /** Last updated date */
  lastUpdatedDate?: string;

  /** Custom fields */
  customFields?: CustomTestField[];

  /** Nested sub-results */
  subResults?: TestSubResult[];

  /** URL to sub-result */
  url?: string;
}

/**
 * Failing since information
 */
export interface FailingSince {
  /** Date failing started (UTC) */
  date: string;

  /** Build reference */
  build?: BuildReference;

  /** Release reference */
  release?: ReleaseReference;
}

/**
 * Custom test field
 */
export interface CustomTestField {
  /** Field name */
  fieldName: string;

  /** Field value */
  value: any;
}

// ============================================================================
// TEST PLANS & SUITES
// ============================================================================

/**
 * Test plan payload for creation
 */
export interface TestPlanPayload {
  /** Plan name (required) */
  name: string;

  /** Plan description */
  description?: string;

  /** Area path */
  areaPath?: string;

  /** Iteration path */
  iterationPath?: string;

  /** Owner of the plan */
  owner?: IdentityRef;

  /** Start date */
  startDate?: string;

  /** End date */
  endDate?: string;
}

/**
 * Test suite object
 * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/test/test-suites
 */
export interface TestSuite {
  /** Suite ID */
  id: number;

  /** Suite name */
  name: string;

  /** Suite type (StaticTestSuite, DynamicTestSuite, RequirementTestSuite) */
  suiteType?: string;

  /** Parent suite ID */
  parentSuite?: ShallowReference;

  /** Plan that contains this suite */
  plan?: ShallowReference;

  /** Test cases count */
  testCaseCount?: number;

  /** Child suites */
  childSuites?: TestSuite[];

  /** Default configurations */
  defaultConfigurations?: ShallowReference[];

  /** Query for dynamic suites */
  queryString?: string;

  /** URL to suite */
  url?: string;

  /** Project reference */
  project?: ShallowReference;

  /** Last updated by */
  lastUpdatedBy?: IdentityRef;

  /** Last updated date */
  lastUpdatedDate?: string;

  /** Created by */
  createdBy?: IdentityRef;

  /** Created date */
  createdDate?: string;

  /** Revision */
  revision?: number;

  /** Links */
  _links?: ReferenceLinks;
}

/**
 * Parameters for adding test cases to suite
 */
export interface SuiteTestCaseCreateUpdateParameters {
  /** Test case ID to add */
  testCaseId: number;

  /** Configuration IDs to associate with this test case */
  configurationIds?: number[];

  /** Test point attributes */
  pointAttributes?: { [key: string]: any };
}

// ============================================================================
// TEST POINTS
// ============================================================================

/**
 * Test point object
 * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/test/points
 */
export interface TestPoint {
  /** Point ID */
  id: number;

  /** Test case reference */
  testCase?: ShallowReference;

  /** Test case reference ID */
  testCaseId?: number;

  /** Configuration reference */
  configuration?: ShallowReference;

  /** Configuration ID */
  configurationId?: number;

  /** Test plan reference */
  testPlan?: ShallowReference;

  /** Test suite reference */
  testSuite?: ShallowReference;

  /** Point state (Ready, Completed, InProgress, NotReady, Blocked) */
  state?: TestPointState;

  /** Point outcome (Passed, Failed, Blocked, NotApplicable, Unspecified) */
  outcome?: TestPointOutcome;

  /** Last result details */
  lastResultDetails?: LastResultDetails;

  /** Tester assigned to point */
  tester?: IdentityRef;

  /** Last test run reference */
  lastTestRun?: ShallowReference;

  /** Last updated by */
  lastUpdatedBy?: IdentityRef;

  /** Last updated date */
  lastUpdatedDate?: string;

  /** Created by */
  createdBy?: IdentityRef;

  /** Created date */
  createdDate?: string;

  /** Revision */
  revision?: number;

  /** Comment */
  comment?: string;

  /** Automated flag */
  automated?: boolean;

  /** Work item properties */
  workItemProperties?: { [key: string]: string };

  /** Links */
  _links?: ReferenceLinks;

  /** URL to point */
  url?: string;
}

/** Test point state enumeration */
export type TestPointState = 'Ready' | 'Completed' | 'InProgress' | 'NotReady' | 'Blocked';

/** Test point outcome enumeration */
export type TestPointOutcome = 'Passed' | 'Failed' | 'Blocked' | 'NotApplicable' | 'Unspecified';

/**
 * Last result details for test point
 */
export interface LastResultDetails {
  /** When result was completed (UTC) */
  dateCompleted?: string;

  /** Duration in milliseconds */
  duration?: number;

  /** User who ran the test */
  runBy?: IdentityRef;
}

/**
 * Test point update model
 */
export interface TestPointUpdateModel {
  /** New outcome for the point */
  outcome?: TestPointOutcome;

  /** User to assign as tester */
  tester?: IdentityRef | { id: string; displayName?: string };

  /** Set to true to reset point to active state */
  resetToActive?: boolean;

  /** Comment */
  comment?: string;
}

// ============================================================================
// SHARED TYPES
// ============================================================================

/**
 * Shallow reference to a resource
 */
export interface ShallowReference {
  /** Resource ID */
  id?: string;

  /** Resource name */
  name?: string;

  /** Resource URL */
  url?: string;
}

/**
 * Identity reference
 */
export interface IdentityRef extends ShallowReference {
  /** Display name */
  displayName?: string;

  /** Unique name (email/UPN) */
  uniqueName?: string;

  /** Image URL */
  imageUrl?: string;

  /** Descriptor */
  descriptor?: string;

  /** Is AAD identity */
  isAadIdentity?: boolean;

  /** Is container (group) */
  isContainer?: boolean;

  /** Links */
  _links?: ReferenceLinks;
}

/**
 * Build reference
 */
export interface BuildReference {
  /** Build ID */
  id: number;

  /** Build number */
  number: string;

  /** Build URI */
  uri: string;

  /** Build system */
  buildSystem?: string;

  /** Branch name */
  branchName?: string;

  /** Repository ID */
  repositoryId?: string;

  /** Definition ID */
  definitionId?: number;
}

/**
 * Release reference
 */
export interface ReleaseReference {
  /** Release ID */
  id: number;

  /** Release name */
  name: string;

  /** Environment ID */
  environmentId?: number;

  /** Environment name */
  environmentName?: string;

  /** Definition ID */
  definitionId?: number;

  /** Attempt number */
  attempt?: number;

  /** Creation date (UTC) */
  creationDate?: string;

  /** Environment creation date (UTC) */
  environmentCreationDate?: string;

  /** Environment definition ID */
  environmentDefinitionId?: number;

  /** Environment definition name */
  environmentDefinitionName?: string;
}

/**
 * Shared step reference
 */
export interface SharedStepModel {
  /** Shared step work item ID */
  id: number;

  /** Shared step revision */
  revision: number;
}

/**
 * Reference links
 */
export interface ReferenceLinks {
  /** Links map */
  [key: string]: any;
}

// ============================================================================
// WIQL & QUERIES
// ============================================================================

/**
 * WIQL query result
 * @link https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/wiql
 */
export interface WiqlQueryResult {
  /** Array of work item relations */
  workItemRelations?: WorkItemRelation[];

  /** Array of work item IDs */
  workItems?: WorkItemReference[];

  /** Page size */
  pageSize?: number;

  /** Sort order */
  sortOrder?: string;

  /** ASOF date */
  asOf?: string;

  /** Columns */
  columns?: ColumnOption[];
}

/**
 * Work item relation from WIQL
 */
export interface WorkItemRelation {
  /** Target item */
  target?: WorkItemReference;

  /** Relation type (link type name) */
  rel?: string;

  /** Source item */
  source?: WorkItemReference;
}

/**
 * Work item reference
 */
export interface WorkItemReference {
  /** Work item ID */
  id: number;

  /** Work item URL */
  url: string;
}

/**
 * Column option for WIQL
 */
export interface ColumnOption {
  /** Field reference name */
  referenceName?: string;

  /** Field name */
  name?: string;

  /** URL */
  url?: string;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Azure DevOps error response
 */
export interface AdoErrorResponse {
  /** Error ID */
  $id?: string;
  id?: string;

  /** Inner exception ID */
  innerException?: string;

  /** Exception message */
  message?: string;

  /** Exception type name */
  typeName?: string;

  /** Type key */
  typeKey?: string;

  /** Error code */
  errorCode?: number;

  /** Event ID */
  eventId?: number;

  /** Custom properties */
  customProperties?: { [key: string]: any };
}

/**
 * Typed error wrapper
 */
export interface AdoError extends Error {
  statusCode: number;
  errorCode: string;
  response?: any;
  originalError?: Error;
}

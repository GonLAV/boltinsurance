/**
 * GETit Type Definitions
 * Comprehensive types for API testing tool
 */

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'WS';
export type BodyType = 'json' | 'xml' | 'html' | 'text' | 'binary' | 'form-data' | 'form-urlencoded';
export type AuthType = 'none' | 'basic' | 'bearer' | 'apikey' | 'oauth2' | 'digest';
export type TestVerdict = 'PASS' | 'WARN' | 'FAIL' | 'SKIP';

/**
 * HTTP Request Configuration
 */
export interface GETitRequest {
  id: string;
  name: string;
  description?: string;
  method: HTTPMethod;
  url: string;
  
  // Request components
  headers: HeaderParam[];
  params: QueryParam[];
  body?: RequestBody;
  
  // Authentication
  auth?: AuthConfig;
  
  // Scripting & Testing
  preRequestScript?: string;
  testScript?: string;
  
  // Organization
  collectionId?: string;
  folderId?: string;
  tags?: string[];
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  lastExecutedAt?: number;
  executionCount: number;
}

/**
 * Header Configuration
 */
export interface HeaderParam {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

/**
 * Query Parameter
 */
export interface QueryParam {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

/**
 * Request Body
 */
export interface RequestBody {
  type: BodyType;
  content: string | object | FormData;
  encoding?: 'utf-8' | 'base64';
  description?: string;
}

/**
 * Authentication Configurations
 */
export interface AuthConfig {
  type: AuthType;
  basic?: BasicAuth;
  bearer?: BearerAuth;
  apikey?: ApiKeyAuth;
  oauth2?: OAuth2Auth;
  digest?: DigestAuth;
}

export interface BasicAuth {
  username: string;
  password: string;
}

export interface BearerAuth {
  token: string;
}

export interface ApiKeyAuth {
  key: string;
  value: string;
  addTo: 'header' | 'query';
}

export interface OAuth2Auth {
  clientId: string;
  clientSecret: string;
  accessTokenUrl: string;
  authorizationUrl?: string;
  scope?: string;
  grantType: 'authorization_code' | 'client_credentials' | 'password';
  username?: string;
  password?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface DigestAuth {
  username: string;
  password: string;
  realm?: string;
  nonce?: string;
}

/**
 * HTTP Response
 */
export interface GETitResponse {
  id: string;
  requestId: string;
  status: number;
  statusText: string;
  httpVersion: string;
  duration: number; // ms
  size: number; // bytes
  headers: Record<string, string>;
  body: any;
  bodyType: BodyType;
  cookies: CookieData[];
  timestamp: number;
}

export interface CookieData {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Request Collections
 */
export interface GETitCollection {
  id: string;
  name: string;
  description?: string;
  requests: GETitRequest[];
  folders?: GETitFolder[];
  variables?: GETitVariable[];
  auth?: CollectionAuth;
  createdAt: number;
  updatedAt: number;
}

export interface GETitFolder {
  id: string;
  name: string;
  requests: GETitRequest[];
  subfolders?: GETitFolder[];
  description?: string;
}

export interface CollectionAuth extends AuthConfig {
  // Auth inherited by all requests in collection unless overridden
}

/**
 * Environment Variables
 */
export interface GETitEnvironment {
  id: string;
  name: string;
  description?: string;
  variables: GETitVariable[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface GETitVariable {
  id: string;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'secret';
  description?: string;
  enabled: boolean;
}

/**
 * Test Assertions & DSL
 */
export interface TestAssertion {
  id: string;
  type: AssertionType;
  target: string; // e.g. "status", "headers.Content-Type", "json.user.id"
  operator: AssertionOperator;
  expected: any;
  actual?: any;
  passed?: boolean;
  message?: string;
}

export type AssertionType = 'status' | 'time' | 'header' | 'json' | 'xml' | 'cookie' | 'size';
export type AssertionOperator = 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'exists' | 'notExists' | 'matches' | 'in' | 'notIn';

export interface TestScript {
  id: string;
  name: string;
  requestId: string;
  dslContent: string;
  isEnabled: boolean;
  createdAt: number;
}

/**
 * Test Execution Results
 */
export interface TestResult {
  id: string;
  requestId: string;
  requestName: string;
  passed: boolean;
  verdict: TestVerdict;
  assertions: AssertionResult[];
  duration: number; // ms
  response?: GETitResponse;
  executedAt: number;
  errorMessage?: string;
}

export interface AssertionResult {
  assertion: TestAssertion;
  passed: boolean;
  expected?: any;
  actual?: any;
  message?: string;
  executionTime: number;
}

/**
 * Request Execution & History
 */
export interface RequestExecution {
  id: string;
  requestId: string;
  requestName: string;
  method: HTTPMethod;
  url: string;
  status?: number;
  duration?: number;
  verdict?: TestVerdict;
  response?: GETitResponse;
  testResults?: TestResult[];
  executedAt: number;
  environmentUsed?: string;
}

/**
 * Import/Export Formats
 */
export interface PostmanCollection {
  info: { name: string; description?: string };
  item: PostmanItem[];
  variable?: Array<{ key: string; value: any }>;
  auth?: any;
}

export interface PostmanItem {
  name: string;
  request: {
    method: string;
    header: Array<{ key: string; value: string }>;
    url: { raw: string; protocol: string; host: string[]; path: string[]; query?: Array<{ key: string; value: string }> };
    body?: { mode: string; raw: string };
  };
  item?: PostmanItem[];
}

export interface InsomniaExport {
  _type: string;
  __export_format: string;
  resources: InsomniaResource[];
}

export interface InsomniaResource {
  _id: string;
  _type: string;
  name?: string;
  method?: string;
  url?: string;
  [key: string]: any;
}

/**
 * UI State
 */
export interface GETitUIState {
  activeRequestId?: string;
  activeCollectionId?: string;
  activeEnvironmentId?: string;
  responseTab: 'pretty' | 'raw' | 'headers' | 'timeline' | 'cookies';
  bodyViewMode: 'formatted' | 'raw';
  sidebarCollapsed: boolean;
  showEnvironmentPanel: boolean;
  showTestPanel: boolean;
}

/**
 * Store State
 */
export interface GETitStore {
  requests: GETitRequest[];
  collections: GETitCollection[];
  environments: GETitEnvironment[];
  executions: RequestExecution[];
  testResults: TestResult[];
  uiState: GETitUIState;
}

/**
 * API Response Wrapper
 */
export interface ApiExecutionResponse {
  success: boolean;
  response?: GETitResponse;
  testResults?: TestResult[];
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

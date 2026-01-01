
import azdev from 'azure-devops-node-api';

let connection;

export function getConnection() {
  const orgUrl = process.env.AZDO_ORG_URL;
  const mode = (process.env.AUTH_MODE || 'PAT').toUpperCase();

  let authHandler;
  if (mode === 'NTLM') {
    authHandler = azdev.getNtlmHandler(
      process.env.NTLM_USERNAME,
      process.env.NTLM_PASSWORD,
      process.env.NTLM_WORKSTATION || undefined,
      process.env.NTLM_DOMAIN || undefined
    );
  } else {
    authHandler = azdev.getPersonalAccessTokenHandler(process.env.AZDO_PAT);
  }

  connection = new azdev.WebApi(orgUrl, authHandler);
  return connection;
}

export async function listProjects() {
  const conn = connection || getConnection();
  const coreApi = await conn.getCoreApi();
  return coreApi.getProjects(); // ב־TFS יחזיר את הפרויקטים בתוך ה־collection
}

// יצירת Test Case כ־Work Item מסוג "Test Case"
// והזרקת שלבים ל־Microsoft.VSTS.TCM.Steps (XML)
export async function createTestCase({ title, description, areaPath, iterationPath, priority, state, stepsXml }) {
  const conn = connection || getConnection();
  const wit = await conn.getWorkItemTrackingApi();

  const patchOps = [
    { op: 'add', path: '/fields/System.Title', value: title },
    { op: 'add', path: '/fields/System.Description', value: description || '' },
    { op: 'add', path: '/fields/Microsoft.VSTS.Common.Priority', value: priority ?? 2 },
    ...(state ? [{ op: 'add', path: '/fields/System.State', value: state }] : []),
    ...(areaPath ? [{ op: 'add', path: '/fields/System.AreaPath', value: areaPath }] : []),
    ...(iterationPath ? [{ op: 'add', path: '/fields/System.IterationPath', value: iterationPath }] : []),
    ...(stepsXml ? [{ op: 'add', path: '/fields/Microsoft.VSTS.TCM.Steps', value: stepsXml }] : [])
  ];

  const wi = await wit.createWorkItem(
    null,
    patchOps,
    process.env.AZDO_PROJECT, // כאן שמך: Epos
    'Test Case'
  );
  return wi;
}

// הוספת Test Case ל־Suite בתוך Test Plan (ייצר נקודות לפי תצורה)
export async function addTestCaseToSuite({ planId, suiteId, testCaseId }) {
  const conn = connection || getConnection();
  const testPlanApi = await conn.getTestPlanApi();

  const result = await testPlanApi.addTestCasesToSuite(
    process.env.AZDO_PROJECT,
    Number(planId),
    Number(suiteId),
    [{ testCase: { id: Number(testCaseId) } }]
  );
  return result;
}

// בניית XML לשדות Steps לפי מבנה Azure DevOps/TFS
export function buildStepsXml(steps) {
  let id = 2;
  const parts = (steps || []).map(s => `
    <step id="${id++}" type="ValidateStep">
      <parameterizedString isformatted="true">${escapeXml(s.action || '')}</parameterizedString>
      <parameterizedString isformatted="true">${escapeXml(s.expected || '')}</parameterizedString>
      <description/>
    </step>`).join('');
  return `<steps id="0" last="${id - 1}">${parts}\n</steps>`;
}

function escapeXml(str) {
  return String(str)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

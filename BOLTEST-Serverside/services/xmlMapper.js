// XML builder for Azure DevOps test steps
// Accepts an array of steps: { action, expectedResult, testData, stepType }
// Returns the XML string expected by the Microsoft.VSTS.TCM.Steps field.

function escapeXml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildTestStepsXml(steps = []) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return '<steps id="0" last="1"><step id="2" type="ActionStep"><parameterizedString isformatted="true">&lt;DIV&gt;&lt;P&gt;Step 1&lt;/P&gt;&lt;/DIV&gt;</parameterizedString><parameterizedString isformatted="true">&lt;DIV&gt;&lt;P&gt;Expected Result&lt;/P&gt;&lt;/DIV&gt;</parameterizedString><description/></step></steps>';
  }

  const last = steps.length + 1;
  const xmlParts = [`<steps id="0" last="${last}">`];

  steps.forEach((step, index) => {
    const stepId = index + 2;
    const type = step.stepType || 'ActionStep';
    const action = escapeXml(step.action || '');
    const expected = escapeXml(step.expectedResult || '');
    const testData = step.testData ? escapeXml(step.testData) : '';

    xmlParts.push(`<step id="${stepId}" type="${type}">`);
    xmlParts.push(`<parameterizedString isformatted="true">&lt;DIV&gt;&lt;P&gt;${action}&lt;/P&gt;&lt;/DIV&gt;</parameterizedString>`);
    xmlParts.push(`<parameterizedString isformatted="true">&lt;DIV&gt;&lt;P&gt;${expected}&lt;/P&gt;&lt;/DIV&gt;</parameterizedString>`);
    xmlParts.push(testData ? `<description>&lt;P&gt;${testData}&lt;/P&gt;</description>` : '<description/>' );
    xmlParts.push('</step>');
  });

  xmlParts.push('</steps>');
  return xmlParts.join('');
}

/**
 * Build Shared Parameters XML for Microsoft.VSTS.TCM.Parameters field
 * @param {string[]} columns 
 * @param {any[][]} data 
 */
function buildSharedParametersXml(columns = [], data = []) {
  const xmlParts = ['<parameters>'];
  
  // Add column definitions
  columns.forEach(col => {
    xmlParts.push(`<param name="${escapeXml(col)}" />`);
  });

  // Add data rows
  if (data && data.length > 0) {
    xmlParts.push('<data>');
    data.forEach(row => {
      xmlParts.push('<row>');
      columns.forEach((col, idx) => {
        // Handle both array of arrays and array of objects
        let val = '';
        if (Array.isArray(row)) {
          val = row[idx] || '';
        } else if (typeof row === 'object') {
          val = row[col] || '';
        }
        xmlParts.push(`<value>${escapeXml(val)}</value>`);
      });
      xmlParts.push('</row>');
    });
    xmlParts.push('</data>');
  }

  xmlParts.push('</parameters>');
  return xmlParts.join('');
}

module.exports = {
  buildTestStepsXml,
  buildSharedParametersXml,
  escapeXml
};

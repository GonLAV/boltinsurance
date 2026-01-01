/**
 * BOLTEST - Main Application Logic
 * Test Case Management Tool for Azure DevOps/TFS
 * Made by Gon Shaul Lavan
 */

// Global state
let allTestCases = [];
let currentSteps = [];
let draggedStepId = null;
let isBulkEditMode = false;

// Utility functions
/**
 * Debounce function for performance optimization
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Initialize app on load
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is already logged in
  if (window.azureAPI.loadFromSession()) {
    showMainApp();
    loadTestCases();
  }
  
  // Add initial step when creating test case
  addStep();
});

// ===================================
// LOGIN & CONNECTION FUNCTIONS
// ===================================

/**
 * Toggle PAT visibility
 */
window.togglePAT = function() {
  const input = document.getElementById('patToken');
  input.type = input.type === 'password' ? 'text' : 'password';
};

/**
 * Copy PAT to clipboard
 */
window.copyPAT = function() {
  const input = document.getElementById('patToken');
  navigator.clipboard.writeText(input.value).then(() => {
    showToast("PAT copied to clipboard", "success");
  });
};

/**
 * Test Azure DevOps connection
 */
window.testConnection = async function() {
  const orgUrl = document.getElementById('orgUrl').value;
  const projectName = document.getElementById('projectName').value;
  const patToken = document.getElementById('patToken').value;

  if (!orgUrl || !projectName || !patToken) {
    showToast("Please fill in all fields", "error");
    return;
  }

  showToast("Testing connection...", "success");
  
  // Initialize API
  window.azureAPI.init(orgUrl, projectName, patToken);
  
  // Test connection
  const result = await window.azureAPI.testConnection();
  
  if (result.success) {
    showToast("✓ Connection successful!", "success");
  } else {
    showToast(`Connection failed: ${result.error}`, "error");
  }
};

/**
 * Handle login form submission
 */
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const orgUrl = document.getElementById('orgUrl').value;
  const projectName = document.getElementById('projectName').value;
  const patToken = document.getElementById('patToken').value;

  if (!orgUrl || !projectName || !patToken) {
    showToast("Please fill in all required fields", "error");
    return;
  }

  // Initialize API
  // Initialize API
  window.azureAPI.init(orgUrl, projectName, patToken);
  
  // Test connection before proceeding
  const result = await window.azureAPI.testConnection();
  
  if (result.success) {
    showMainApp();
    showToast(`Connected to ${projectName}`, "success");
    loadTestCases();
  } else {
    showToast(`Connection failed: ${result.error}`, "error");
  }
});

/**
 * Show main application
 */
function showMainApp() {
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
}

// ===================================
// DASHBOARD FUNCTIONS
// ===================================

/**
 * Update dashboard statistics
 */
function updateDashboard() {
  const total = allTestCases.length;
  const active = allTestCases.filter(tc => tc.fields && tc.fields['System.State'] === 'Active').length;
  const design = allTestCases.filter(tc => tc.fields && tc.fields['System.State'] === 'Design').length;
  
  document.getElementById('totalTestCases').textContent = total;
  document.getElementById('activeTestCases').textContent = active;
  document.getElementById('designTestCases').textContent = design;

  // Update recent activity
  if (allTestCases.length > 0) {
    const recent = allTestCases.slice(0, 3);
    const activityHtml = recent.map(tc => {
      const state = tc.fields['System.State'];
      const icon = state === 'Active' ? '✅' : state === 'Design' ? '✏️' : '📦';
      const title = tc.fields['System.Title'];
      const priority = tc.fields['Microsoft.VSTS.Common.Priority'];
      
      return `
        <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <span class="text-2xl">${icon}</span>
          <div class="flex-1">
            <p class="font-semibold text-gray-900">${title}</p>
            <p class="text-sm text-gray-600">Priority ${priority} • ${state}</p>
          </div>
        </div>
      `;
    }).join('');
    
    document.getElementById('recentActivity').innerHTML = activityHtml;
  }
}

/**
 * Load test cases from Azure DevOps
 */
async function loadTestCases() {
  try {
    // Show loading indicator in dashboard
    const totalEl = document.getElementById('totalTestCases');
    const activeEl = document.getElementById('activeTestCases');
    const designEl = document.getElementById('designTestCases');
    
    if (totalEl) totalEl.innerHTML = '<span style="opacity: 0.5">...</span>';
    if (activeEl) activeEl.innerHTML = '<span style="opacity: 0.5">...</span>';
    if (designEl) designEl.innerHTML = '<span style="opacity: 0.5">...</span>';
    
    const result = await window.azureAPI.getTestCases();
    
    if (result.success) {
      allTestCases = result.data;
      updateDashboard();
      renderTestCasesList();
      updateEmptyStates();
    } else {
      // More user-friendly error messages
      let errorMsg = result.error || 'Unknown error';
      if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
        errorMsg = 'Authentication failed. Please log in again.';
      } else if (errorMsg.includes('404')) {
        errorMsg = 'Project not found. Please verify your settings.';
      }
      showToast(`❌ Failed to load test cases: ${errorMsg}`, "error");
      
      // Reset counters to 0 on error
      if (totalEl) totalEl.textContent = '0';
      if (activeEl) activeEl.textContent = '0';
      if (designEl) designEl.textContent = '0';
    }
  } catch (error) {
    showToast(`❌ Unexpected error loading test cases: ${error.message}`, "error");
  }
}

/**
 * Render test cases list
 */
function renderTestCasesList() {
  const container = document.getElementById('testCasesList');
  
  if (allTestCases.length === 0) {
    container.innerHTML = '';
    return;
  }

  const html = allTestCases.map(tc => {
    const fields = tc.fields;
    const title = fields['System.Title'];
    const description = fields['System.Description'] || 'No description';
    const state = fields['System.State'];
    const priority = fields['Microsoft.VSTS.Common.Priority'];
    const tags = fields['System.Tags'] || '';
    const stepsXml = fields['Microsoft.VSTS.TCM.Steps'] || '';
    
    // Parse steps count (simplified)
    const stepsCount = (stepsXml.match(/<step/g) || []).length;

    return `
      <div class="card">
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <h4 class="text-lg font-bold text-gray-900 mb-2">${title}</h4>
            <p class="text-sm text-gray-600 mb-3">${description.substring(0, 150)}...</p>
            <div class="flex flex-wrap gap-2">
              <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold" style="background: var(--gradient-subtle); color: var(--color-gray-900);">
                ${state}
              </span>
              <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                Priority ${priority}
              </span>
              <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                ${stepsCount} steps
              </span>
              ${tags ? `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">${tags}</span>` : ''}
            </div>
          </div>
          <button onclick="deleteTestCase(${tc.id})" class="text-red-500 hover:text-red-700 text-xl ml-4">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = html;
}

/**
 * Update empty states
 */
function updateEmptyStates() {
  const hasCases = allTestCases.length > 0;
  document.getElementById('emptyList').classList.toggle('hidden', hasCases);
  document.getElementById('testCasesList').classList.toggle('hidden', !hasCases);
}

// ===================================
// TEST STEP MANAGEMENT
// ===================================

/**
 * Add a new test step
 */
window.addStep = function() {
  const stepId = Date.now();
  currentSteps.push({
    id: stepId,
    action: '',
    expected: '',
    attachment: null
  });
  renderSteps();
};

/**
 * Remove a test step
 */
window.removeStep = function(stepId) {
  currentSteps = currentSteps.filter(s => s.id !== stepId);
  renderSteps();
};

/**
 * Duplicate a test step
 */
window.duplicateStep = function(stepId) {
  const step = currentSteps.find(s => s.id === stepId);
  if (step) {
    const newStep = {
      id: Date.now(),
      action: step.action,
      expected: step.expected,
      attachment: step.attachment
    };
    const index = currentSteps.findIndex(s => s.id === stepId);
    currentSteps.splice(index + 1, 0, newStep);
    renderSteps();
  }
};

/**
 * Move step up
 */
window.moveStepUp = function(stepId) {
  const index = currentSteps.findIndex(s => s.id === stepId);
  if (index > 0) {
    [currentSteps[index - 1], currentSteps[index]] = [currentSteps[index], currentSteps[index - 1]];
    renderSteps();
  }
};

/**
 * Move step down
 */
window.moveStepDown = function(stepId) {
  const index = currentSteps.findIndex(s => s.id === stepId);
  if (index < currentSteps.length - 1) {
    [currentSteps[index], currentSteps[index + 1]] = [currentSteps[index + 1], currentSteps[index]];
    renderSteps();
  }
};

/**
 * Handle attachment upload
 */
window.handleAttachmentUpload = function(stepId, event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const step = currentSteps.find(s => s.id === stepId);
      if (step) {
        step.attachment = {
          name: file.name,
          data: e.target.result,
          type: file.type
        };
        renderSteps();
        showToast(`Attachment "${file.name}" added`, "success");
      }
    };
    reader.readAsDataURL(file);
  }
};

/**
 * Preview attachment
 */
window.previewAttachment = function(stepId) {
  const step = currentSteps.find(s => s.id === stepId);
  if (step && step.attachment) {
    const preview = document.createElement('div');
    preview.className = 'fullscreen-preview';
    preview.innerHTML = `
      <button class="fullscreen-close" onclick="this.parentElement.remove()">✕</button>
      <img src="${step.attachment.data}" alt="${step.attachment.name}">
    `;
    document.body.appendChild(preview);
  }
};

/**
 * Auto-resize textarea
 */
function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.max(40, textarea.scrollHeight) + 'px';
}

/**
 * Drag and drop handlers
 */
function handleDragStart(e, stepId) {
  draggedStepId = stepId;
  e.currentTarget.classList.add('dragging');
}

function handleDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  draggedStepId = null;
}

function handleDragOver(e) {
  e.preventDefault();
}

function handleDrop(e, targetStepId) {
  e.preventDefault();
  if (draggedStepId && draggedStepId !== targetStepId) {
    const draggedIndex = currentSteps.findIndex(s => s.id === draggedStepId);
    const targetIndex = currentSteps.findIndex(s => s.id === targetStepId);
    const [draggedStep] = currentSteps.splice(draggedIndex, 1);
    currentSteps.splice(targetIndex, 0, draggedStep);
    renderSteps();
  }
}

/**
 * Render test steps
 */
function renderSteps() {
  const container = document.getElementById('stepsContainer');
  container.innerHTML = '';
  
  currentSteps.forEach((step, index) => {
    const stepDiv = document.createElement('div');
    stepDiv.className = 'steps-grid';
    stepDiv.dataset.stepId = step.id;
    stepDiv.draggable = true;
    
    stepDiv.addEventListener('dragstart', (e) => handleDragStart(e, step.id));
    stepDiv.addEventListener('dragend', handleDragEnd);
    stepDiv.addEventListener('dragover', handleDragOver);
    stepDiv.addEventListener('drop', (e) => handleDrop(e, step.id));
    
    stepDiv.innerHTML = `
      <!-- Step Number & Controls -->
      <div class="step-number-container">
        <div class="step-number">${index + 1}</div>
        <div class="step-move-buttons">
          <button type="button" class="step-move-btn" onclick="moveStepUp(${step.id})" ${index === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" class="step-move-btn" onclick="moveStepDown(${step.id})" ${index === currentSteps.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
      </div>
      
      <!-- Step Content -->
      <div class="step-content">
        <div class="step-row">
          <!-- Action Field -->
          <div class="step-field">
            <label>Action</label>
            <textarea class="step-textarea step-action" placeholder="e.g., Click the login button" data-step-id="${step.id}" oninput="autoResizeTextarea(this); updateStepData(${step.id}, 'action', this.value)" required>${step.action}</textarea>
          </div>
          
          <!-- Expected Result Field -->
          <div class="step-field">
            <label>Expected Result</label>
            <textarea class="step-textarea step-expected" placeholder="e.g., User is redirected to dashboard" data-step-id="${step.id}" oninput="autoResizeTextarea(this); updateStepData(${step.id}, 'expected', this.value)" required>${step.expected}</textarea>
          </div>
          
          <!-- Attachment Field -->
          <div class="step-field">
            <label>Attachment</label>
            ${step.attachment ? `
              <button type="button" class="attachment-preview-btn" onclick="previewAttachment(${step.id})">
                👁️ Preview
              </button>
            ` : `
              <label class="attachment-upload-btn">
                📎 Upload
                <input type="file" accept="image/*" style="display: none;" onchange="handleAttachmentUpload(${step.id}, event)">
              </label>
            `}
          </div>
        </div>
      </div>
      
      <!-- Step Actions -->
      <div class="step-actions">
        <button type="button" class="step-action-btn" onclick="duplicateStep(${step.id})" title="Duplicate">📄</button>
        <button type="button" class="step-action-btn delete-btn" onclick="removeStep(${step.id})" title="Delete">🗑️</button>
      </div>
    `;
    
    container.appendChild(stepDiv);
    
    // Auto-resize existing content
    stepDiv.querySelectorAll('.step-textarea').forEach(textarea => {
      autoResizeTextarea(textarea);
    });
  });
}

/**
 * Update step data
 */
window.updateStepData = function(stepId, field, value) {
  const step = currentSteps.find(s => s.id === stepId);
  if (step) {
    step[field] = value;
  }
};

// ===================================
// BULK EDIT MODE
// ===================================

/**
 * Toggle bulk edit mode
 */
window.toggleBulkEdit = function() {
  isBulkEditMode = !isBulkEditMode;
  
  if (isBulkEditMode) {
    syncToBulkEdit();
    document.getElementById('normalMode').classList.add('hidden');
    document.getElementById('bulkEditMode').classList.remove('hidden');
  } else {
    syncFromBulkEdit();
    document.getElementById('bulkEditMode').classList.add('hidden');
    document.getElementById('normalMode').classList.remove('hidden');
  }
};

/**
 * Sync to bulk edit
 */
function syncToBulkEdit() {
  const grid = document.getElementById('bulkEditGrid');
  grid.innerHTML = '';
  
  currentSteps.forEach((step, index) => {
    addBulkEditRow(step, index);
  });
}

/**
 * Sync from bulk edit
 */
function syncFromBulkEdit() {
  const rows = document.querySelectorAll('.bulk-edit-row');
  currentSteps = [];
  
  rows.forEach((row, index) => {
    const action = row.querySelector('.bulk-action').value;
    const expected = row.querySelector('.bulk-expected').value;
    
    if (action || expected) {
      currentSteps.push({
        id: Date.now() + index,
        action: action,
        expected: expected,
        attachment: null
      });
    }
  });
  
  renderSteps();
}

/**
 * Add bulk edit row
 */
function addBulkEditRow(step = null, index = null) {
  const grid = document.getElementById('bulkEditGrid');
  const row = document.createElement('div');
  row.className = 'bulk-edit-row';
  
  const stepNum = index !== null ? index + 1 : grid.children.length + 1;
  
  row.innerHTML = `
    <div class="bulk-edit-label">#${stepNum}</div>
    <input type="text" class="bulk-edit-input bulk-action" placeholder="Action" value="${step ? step.action : ''}">
    <input type="text" class="bulk-edit-input bulk-expected" placeholder="Expected Result" value="${step ? step.expected : ''}">
    <button type="button" class="step-action-btn delete-btn" onclick="this.parentElement.remove()" title="Delete Row">🗑️</button>
  `;
  
  grid.appendChild(row);
}

window.addBulkStep = function() {
  addBulkEditRow();
};

/**
 * Parse template text
 */
window.parseTemplate = function() {
  const pasteText = document.getElementById('pasteArea').value.trim();
  
  if (!pasteText) {
    showToast("Please paste some text first", "error");
    return;
  }

  try {
    // Parse metadata
    const titleMatch = pasteText.match(/Title:\s*(.+?)(?:\n|$)/i);
    const descMatch = pasteText.match(/Description:\s*(.+?)(?:\n|$)/i);
    const tagsMatch = pasteText.match(/Tags:\s*(.+?)(?:\n|$)/i);
    const priorityMatch = pasteText.match(/Priority:\s*(\d+)/i);

    if (titleMatch) document.getElementById('title').value = titleMatch[1].trim();
    if (descMatch) document.getElementById('description').value = descMatch[1].trim();
    if (tagsMatch) document.getElementById('tags').value = tagsMatch[1].trim();
    if (priorityMatch) document.getElementById('priority').value = priorityMatch[1].trim();

    // Parse steps - multiple pattern support
    currentSteps = [];
    
    // Pattern 1: "Step X:" format with indented Action/Expected
    const stepPattern1 = /Step\s+\d+:\s*\n\s*Action:\s*(.+?)\s*\n\s*Expected:\s*(.+?)(?=\n\s*(?:Data:|Step\s+\d+:|$))/gis;
    let matches = [...pasteText.matchAll(stepPattern1)];
    
    if (matches.length === 0) {
      // Pattern 2: "X. Action | Expected" or "X) Action -> Expected"
      const stepPattern2 = /(?:^|\n)\s*(\d+)[.)]\s*(.+?)\s*(?:\||-&gt;|→)\s*(.+?)(?=\n\s*\d+[.)]|\n\n|$)/gs;
      matches = [...pasteText.matchAll(stepPattern2)].map(m => [m[0], m[2], m[3]]);
    }
    
    if (matches.length === 0) {
      // Pattern 3: Simple numbered list
      const stepPattern3 = /(?:^|\n)\s*(\d+)[.)]\s*(.+?)\s*\n\s*(?:Expected:|Result:|→)\s*(.+?)(?=\n\s*\d+[.)]|\n\n|$)/gs;
      matches = [...pasteText.matchAll(stepPattern3)].map(m => [m[0], m[2], m[3]]);
    }

    if (matches.length === 0) {
      showToast("Could not detect steps. Try the example format shown in the placeholder.", "error");
      return;
    }

    matches.forEach((match, index) => {
      const action = match[1].trim();
      const expected = match[2].trim();
      
      currentSteps.push({
        id: Date.now() + index,
        action: action,
        expected: expected,
        attachment: null
      });
    });

    if (currentSteps.length === 0) {
      showToast("No steps found. Check your format.", "error");
      return;
    }

    // Sync to bulk edit grid
    syncToBulkEdit();
    showToast(`✅ Parsed ${currentSteps.length} steps successfully!`, "success");
    
    // Clear paste area
    document.getElementById('pasteArea').value = '';
  } catch (error) {
    console.error('Parse error:', error);
    showToast("Failed to parse. Please check format.", "error");
  }
};

window.clearPasteArea = function() {
  document.getElementById('pasteArea').value = '';
};

// ===================================
// FORM SUBMISSION
// ===================================

/**
 * Handle test case form submission
 */
document.getElementById('testCaseForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Sync bulk edit if active
  if (isBulkEditMode) {
    syncFromBulkEdit();
  }

  // Validate steps
  if (currentSteps.length === 0) {
    showToast("Please add at least one test step", "error");
    return;
  }

  // Validate that all steps have action and expected result
  const invalidSteps = currentSteps.filter(step => !step.action.trim() || !step.expected.trim());
  if (invalidSteps.length > 0) {
    showToast("Please fill in all test step actions and expected results", "error");
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '⏳ Saving...';
  submitBtn.classList.add('btn-loading');
  submitBtn.disabled = true;

  try {
    // Collect steps
    const steps = currentSteps.map(step => ({
      action: step.action,
      expected: step.expected,
      attachment: step.attachment
    }));

    const testCaseData = {
      title: document.getElementById('title').value,
      description: document.getElementById('description').value,
      state: document.getElementById('state').value,
      areaPath: document.getElementById('areaPath').value,
      iterationPath: document.getElementById('iterationPath').value,
      priority: document.getElementById('priority').value,
      automationStatus: document.getElementById('automationStatus').value,
      tags: document.getElementById('tags').value,
      steps: steps
    };

    // Create test case in Azure DevOps
    const result = await window.azureAPI.createTestCase(testCaseData);

    if (result.success) {
      showToast("✅ Test case created successfully in Azure DevOps!", "success");
      resetForm();
      switchPage('list');
      loadTestCases(); // Reload list
    } else {
      const errorMsg = result.error || 'Unknown error occurred';
      // Make error messages more user-friendly
      let friendlyError = errorMsg;
      if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
        friendlyError = 'Authentication failed. Please check your PAT token and try logging in again.';
      } else if (errorMsg.includes('404')) {
        friendlyError = 'Project not found. Please verify your organization URL and project name.';
      } else if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
        friendlyError = 'Access denied. Please ensure your PAT token has the required permissions.';
      } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
        friendlyError = 'Network error. Please check your connection and try again.';
      }
      showToast(`❌ ${friendlyError}`, "error");
    }
  } catch (error) {
    showToast(`❌ Unexpected error: ${error.message}`, "error");
  } finally {
    submitBtn.innerHTML = originalText;
    submitBtn.classList.remove('btn-loading');
    submitBtn.disabled = false;
  }
});

/**
 * Reset form
 */
window.resetForm = function() {
  document.getElementById('testCaseForm').reset();
  currentSteps = [];
  isBulkEditMode = false;
  document.getElementById('normalMode').classList.remove('hidden');
  document.getElementById('bulkEditMode').classList.add('hidden');
  renderSteps();
  addStep();
};

/**
 * Delete test case
 */
window.deleteTestCase = async function(id) {
  if (!confirm('Are you sure you want to delete this test case?')) {
    return;
  }

  const result = await window.azureAPI.deleteTestCase(id);

  if (result.success) {
    showToast("Test case deleted", "success");
    loadTestCases();
  } else {
    showToast(`Failed to delete test case: ${result.error}`, "error");
  }
};

// ===================================
// UTILITIES
// ===================================

/**
 * Show toast notification with accessibility improvements
 */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');
  toast.setAttribute('aria-atomic', 'true');
  
  const icon = type === 'success' ? '✅' : '⚠️';
  
  toast.innerHTML = `
    <span class="text-2xl" aria-hidden="true">${icon}</span>
    <span class="font-semibold text-gray-900">${message}</span>
    <button onclick="this.parentElement.remove()" class="ml-auto text-gray-500 hover:text-gray-900" aria-label="Dismiss notification" title="Dismiss">✕</button>
  `;
  
  document.body.appendChild(toast);
  
  // Auto-dismiss after 5 seconds (increased from 3 for better UX)
  const timeoutId = setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
  
  // Allow manual dismissal to clear timeout
  toast.querySelector('button').addEventListener('click', () => {
    clearTimeout(timeoutId);
  });
}

/**
 * Page navigation
 */
function switchPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(page + 'Page').classList.remove('hidden');
  
  document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`[data-page="${page}"]`);
  if (activeBtn) activeBtn.classList.add('active');
  
  const titles = {
    dashboard: 'Dashboard',
    create: 'Create Test Case',
    list: 'Test Cases',
    api: 'API Executor'
  };
  
  document.getElementById('pageTitle').textContent = titles[page] || 'BOLTEST';
}

window.switchPage = switchPage;

// Add page navigation event listeners
document.querySelectorAll('.nav-button[data-page]').forEach(btn => {
  btn.addEventListener('click', () => switchPage(btn.dataset.page));
});

// Mobile menu toggle
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ===================================
// TEMPLATES
// ===================================

/**
 * Show templates modal
 */
window.showTemplatesModal = function() {
  document.getElementById('templatesModal').classList.remove('hidden');
};

/**
 * Hide templates modal
 */
window.hideTemplatesModal = function() {
  document.getElementById('templatesModal').classList.add('hidden');
};

/**
 * Use template
 */
window.useTemplate = function(type) {
  const templates = {
    login: {
      title: 'User Login Flow',
      description: 'Validate user can successfully log in with valid credentials',
      steps: [
        { action: 'Navigate to login page', expected: 'Login form is displayed' },
        { action: 'Enter valid username and password', expected: 'Credentials are accepted' },
        { action: 'Click login button', expected: 'User is redirected to dashboard' }
      ],
      priority: '2',
      tags: 'authentication, smoke'
    },
    api: {
      title: 'API Endpoint Test',
      description: 'Validate API endpoint returns correct response',
      steps: [
        { action: 'Send GET request to /api/users', expected: 'Status 200 returned' },
        { action: 'Verify response headers', expected: 'Content-Type is application/json' },
        { action: 'Parse response body', expected: 'Valid JSON array returned' },
        { action: 'Validate data structure', expected: 'Each user has id, name, email fields' }
      ],
      priority: '2',
      tags: 'api, backend'
    },
    regression: {
      title: 'Feature Regression Test',
      description: 'Comprehensive test to ensure feature still works after changes',
      steps: [
        { action: 'Verify feature is accessible', expected: 'Feature loads without errors' },
        { action: 'Test primary user flow', expected: 'Main functionality works as expected' },
        { action: 'Test edge cases', expected: 'Edge cases are handled correctly' },
        { action: 'Verify data persistence', expected: 'Data is saved and retrievable' },
        { action: 'Check error handling', expected: 'Errors display user-friendly messages' }
      ],
      priority: '1',
      tags: 'regression, critical'
    }
  };

  const template = templates[type];
  if (!template) return;

  document.getElementById('title').value = template.title;
  document.getElementById('description').value = template.description;
  document.getElementById('priority').value = template.priority;
  document.getElementById('tags').value = template.tags;

  // Clear existing steps and reset mode
  currentSteps = [];
  isBulkEditMode = false;
  document.getElementById('normalMode').classList.remove('hidden');
  document.getElementById('bulkEditMode').classList.add('hidden');

  // Add template steps
  template.steps.forEach((step, index) => {
    currentSteps.push({
      id: Date.now() + index,
      action: step.action,
      expected: step.expected,
      attachment: null
    });
  });

  renderSteps();
  hideTemplatesModal();
  switchPage('create');
  showToast("Template loaded successfully!", "success");
};

// ===================================
// API EXECUTOR
// ===================================

let lastResponse = null;

/**
 * Toggle section
 */
window.toggleSection = function(section) {
  const sectionMap = {
    headers: 'headersSection',
    body: 'bodySection',
    responseHeaders: 'responseHeadersSection'
  };
  
  const chevronMap = {
    headers: 'headersChevron',
    body: 'bodyChevron',
    responseHeaders: 'responseHeadersChevron'
  };
  
  const sectionEl = document.getElementById(sectionMap[section]);
  const chevronEl = document.getElementById(chevronMap[section]);
  
  if (sectionEl.classList.contains('hidden')) {
    sectionEl.classList.remove('hidden');
    chevronEl.textContent = section === 'responseHeaders' ? '▼' : '▲';
  } else {
    sectionEl.classList.add('hidden');
    chevronEl.textContent = section === 'responseHeaders' ? '▶' : '▼';
  }
};

/**
 * Load API template
 */
window.loadAPITemplate = function() {
  const template = document.getElementById('apiTemplate').value;
  
  const templates = {
    get: {
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/users',
      headers: '{\n  "Content-Type": "application/json"\n}',
      body: ''
    },
    post: {
      method: 'POST',
      url: 'https://jsonplaceholder.typicode.com/posts',
      headers: '{\n  "Content-Type": "application/json"\n}',
      body: '{\n  "title": "Sample Post",\n  "body": "This is a sample post",\n  "userId": 1\n}'
    },
    put: {
      method: 'PUT',
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      headers: '{\n  "Content-Type": "application/json"\n}',
      body: '{\n  "id": 1,\n  "title": "Updated Post",\n  "body": "This post has been updated",\n  "userId": 1\n}'
    },
    delete: {
      method: 'DELETE',
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      headers: '{\n  "Content-Type": "application/json"\n}',
      body: ''
    }
  };

  if (templates[template]) {
    const t = templates[template];
    document.getElementById('apiMethod').value = t.method;
    document.getElementById('apiUrl').value = t.url;
    document.getElementById('apiHeaders').value = t.headers;
    document.getElementById('apiBody').value = t.body;
    showToast("Template loaded", "success");
  }
};

/**
 * Send API request
 */
window.sendAPIRequest = async function() {
  const method = document.getElementById('apiMethod').value;
  const url = document.getElementById('apiUrl').value;
  const headersText = document.getElementById('apiHeaders').value;
  const bodyText = document.getElementById('apiBody').value;

  if (!url) {
    showToast("Please enter a URL", "error");
    return;
  }

  // Show loading
  document.getElementById('emptyResponse').classList.add('hidden');
  document.getElementById('responseSection').classList.add('hidden');
  document.getElementById('loadingState').classList.remove('hidden');

  try {
    const headers = headersText ? JSON.parse(headersText) : {};
    const startTime = Date.now();
    
    const options = {
      method: method,
      headers: headers
    };

    if (bodyText && ['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = bodyText;
    }

    // Route all external calls via local proxy to avoid CORS
    let response;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      response = await fetch('/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, method, headers, body: options.body })
      });
    } else {
      // local relative paths can be fetched directly
      response = await fetch(url, options);
    }
    const endTime = Date.now();
    const duration = endTime - startTime;

    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    lastResponse = {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseData,
      duration: duration
    };

    displayResponse(lastResponse);
  } catch (error) {
    document.getElementById('loadingState').classList.add('hidden');
    showToast(`Request failed: ${error.message}`, "error");
  }
};

/**
 * Display API response
 */
function displayResponse(response) {
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('responseSection').classList.remove('hidden');

  // Status badge
  const statusBadge = document.getElementById('statusBadge');
  const statusClass = response.status >= 200 && response.status < 300 
    ? 'bg-green-100 text-green-800'
    : response.status >= 400 
      ? 'bg-red-100 text-red-800'
      : 'bg-yellow-100 text-yellow-800';
  
  statusBadge.className = `px-4 py-2 rounded-full font-semibold text-sm ${statusClass}`;
  statusBadge.textContent = `${response.status} ${response.statusText}`;

  // Response time
  document.getElementById('responseTime').textContent = `⏱️ ${response.duration}ms`;

  // Headers
  document.getElementById('responseHeaders').textContent = JSON.stringify(response.headers, null, 2);

  // Body
  const bodyText = typeof response.body === 'string' 
    ? response.body 
    : JSON.stringify(response.body, null, 2);
  document.getElementById('responseBody').textContent = bodyText;
}

/**
 * Copy response
 */
window.copyResponse = function() {
  if (!lastResponse) return;
  
  const text = typeof lastResponse.body === 'string' 
    ? lastResponse.body 
    : JSON.stringify(lastResponse.body, null, 2);
  
  navigator.clipboard.writeText(text).then(() => {
    showToast("Response copied to clipboard", "success");
  });
};

/**
 * Download response
 */
window.downloadResponse = function() {
  if (!lastResponse) return;
  
  const text = typeof lastResponse.body === 'string' 
    ? lastResponse.body 
    : JSON.stringify(lastResponse.body, null, 2);
  
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `api-response-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Response downloaded", "success");
};

// ===================================
// INPUT VALIDATION & UX IMPROVEMENTS
// ===================================

/**
 * Add real-time validation feedback
 */
function setupInputValidation() {
  const titleInput = document.getElementById('title');
  const descInput = document.getElementById('description');
  
  if (titleInput) {
    titleInput.addEventListener('input', (e) => {
      const value = e.target.value.trim();
      if (value.length > 0 && value.length < 5) {
        e.target.style.borderColor = '#f59e0b'; // Warning color
      } else if (value.length >= 5) {
        e.target.style.borderColor = '#10b981'; // Success color
      } else {
        e.target.style.borderColor = '';
      }
    });
  }
  
  if (descInput) {
    descInput.addEventListener('input', (e) => {
      const value = e.target.value.trim();
      if (value.length > 0 && value.length < 10) {
        e.target.style.borderColor = '#f59e0b';
      } else if (value.length >= 10) {
        e.target.style.borderColor = '#10b981';
      } else {
        e.target.style.borderColor = '';
      }
    });
  }
}

// Initialize validation when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupInputValidation);
} else {
  setupInputValidation();
}

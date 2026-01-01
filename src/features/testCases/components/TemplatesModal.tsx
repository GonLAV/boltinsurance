import React from 'react';
import { createPortal } from 'react-dom';
import { Step } from '../testCase.types';
type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (template: Template) => void;
};

type Tenant = 'Commercial' | 'Personal' | 'All';

type Template = { 
  id: string; 
  name: string; 
  description: string; 
  steps: Step[];
  sharedParameterName?: string;
  tenant?: Tenant;
};

const TENANTS = ['Commercial', 'Personal', 'All'];

const CUSTOM_TEMPLATES_STORAGE_KEY = 'boltest.templates.custom.v1';

const isValidTenant = (v: string): v is Tenant => v === 'Commercial' || v === 'Personal' || v === 'All';

const safeParseTemplates = (raw: string | null): Template[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t) => t && typeof t === 'object')
      .map((t: any) => {
        const steps = Array.isArray(t.steps) ? t.steps : [];
        return {
          id: String(t.id ?? ''),
          name: String(t.name ?? ''),
          description: String(t.description ?? ''),
          sharedParameterName: t.sharedParameterName ? String(t.sharedParameterName) : undefined,
          tenant: isValidTenant(String(t.tenant)) ? (t.tenant as Tenant) : 'All',
          steps: steps
            .filter((s: any) => s && typeof s === 'object')
            .map((s: any, index: number) => ({
              id: Number(s.id ?? index + 1),
              action: String(s.action ?? ''),
              expectedResult: String(s.expectedResult ?? ''),
            })),
        } as Template;
      })
      .filter((t) => t.id && t.name);
  } catch {
    return [];
  }
};

const mergeTemplates = (base: Template[], custom: Template[]): Template[] => {
  const byId = new Map<string, Template>();
  base.forEach((t) => byId.set(t.id, t));
  custom.forEach((t) => byId.set(t.id, t));
  return Array.from(byId.values());
};

const makeStepsJson = (steps: Step[]) =>
  JSON.stringify(
    steps.map((s) => ({ action: s.action, expectedResult: s.expectedResult })),
    null,
    2
  );

const templates: Template[] = [
  {
    id: 'cl-applicant',
    name: '🏢 Commercial Applicant Creation',
    description: 'Create a new commercial applicant with business details and contact info',
    sharedParameterName: 'CL_APPLICANT_SharedParameters',
    steps: [
      { id: 1, action: 'Navigate to Commercial Applicant creation form', expectedResult: 'Form loads successfully' },
      { id: 2, action: 'Enter First Name: {FirstName}', expectedResult: 'Field accepts input' },
      { id: 3, action: 'Enter Last Name: {LastName}', expectedResult: 'Field accepts input' },
      { id: 4, action: 'Enter Business Email: {Email}', expectedResult: 'Email validation passes' },
      { id: 5, action: 'Enter Business Name: {BusinessName}', expectedResult: 'Field accepts input' },
      { id: 6, action: 'Enter Website Address: {WebsiteAddress}', expectedResult: 'URL validation passes' },
      { id: 7, action: 'Enter Address Line 1: {AddressLine1}', expectedResult: 'Address field populated' },
      { id: 8, action: 'Enter City: {City}', expectedResult: 'City field populated' },
      { id: 9, action: 'Enter State: {State}', expectedResult: 'State dropdown selected' },
      { id: 10, action: 'Enter Zip Code: {ZipCode}', expectedResult: 'Zip code field populated' },
      { id: 11, action: 'Enter Phone Number: {PhoneNumber}', expectedResult: 'Phone validation passes' },
      { id: 12, action: 'Select Consumer Line Type: Commercial', expectedResult: 'Type selected as Commercial' },
      { id: 13, action: 'Click Save Applicant button', expectedResult: 'Applicant created successfully' },
    ],
  },
  {
    id: 'pl-applicant',
    name: '👤 Personal Line Applicant Creation',
    description: 'Create a new personal line applicant with residential address and contact info',
    sharedParameterName: 'PL_APPLICANT_SharedParameters',
    steps: [
      { id: 1, action: 'Navigate to Personal Line Applicant form', expectedResult: 'Form loads successfully' },
      { id: 2, action: 'Enter First Name: {FirstName}', expectedResult: 'Field accepts input' },
      { id: 3, action: 'Enter Last Name: {LastName}', expectedResult: 'Field accepts input' },
      { id: 4, action: 'Enter Email Address: {Email}', expectedResult: 'Email validation passes' },
      { id: 5, action: 'Enter Address Line 1: {AddressLine1}', expectedResult: 'Address field populated' },
      { id: 6, action: 'Enter City: {City}', expectedResult: 'City field populated' },
      { id: 7, action: 'Enter State: {State}', expectedResult: 'State dropdown selected' },
      { id: 8, action: 'Enter Zip Code: {ZipCode}', expectedResult: 'Zip code field populated' },
      { id: 9, action: 'Enter Phone Number: {PhoneNumber}', expectedResult: 'Phone validation passes' },
      { id: 10, action: 'Click Save Applicant button', expectedResult: 'Applicant created successfully' },
    ],
  },
  {
    id: 'cl-auto',
    name: '🚗 Commercial Auto Policy',
    description: 'Configure and quote a commercial auto policy for a business',
    sharedParameterName: 'CL_APPLICATION_AUTO_SharedParameters',
    steps: [
      { id: 1, action: 'Open Commercial Auto application', expectedResult: 'Application form loads' },
      { id: 2, action: 'Enter Policy Number: {PolicyNumber}', expectedResult: 'Policy number accepted' },
      { id: 3, action: 'Select Coverage Type: {CoverageType}', expectedResult: 'Coverage selected' },
      { id: 4, action: 'Set Effective Date: {EffectiveDate}', expectedResult: 'Date set' },
      { id: 5, action: 'Enter Premium Amount: {Premium}', expectedResult: 'Premium entered' },
      { id: 6, action: 'Add Vehicle Info: {VehicleInfo}', expectedResult: 'Vehicle added to policy' },
      { id: 7, action: 'Click Submit Quote', expectedResult: 'Quote generated successfully' },
    ],
  },
  {
    id: 'pl-auto',
    name: '🚙 Personal Auto Policy',
    description: 'Configure and quote a personal auto policy for an individual',
    sharedParameterName: 'PL_APPLICANT_SharedParameters',
    steps: [
      { id: 1, action: 'Open Personal Auto application', expectedResult: 'Application form loads' },
      { id: 2, action: 'Enter VIN: {VIN}', expectedResult: 'VIN decoded successfully' },
      { id: 3, action: 'Select Driver: {DriverName}', expectedResult: 'Driver assigned' },
      { id: 4, action: 'Set Coverage Limits: {Limits}', expectedResult: 'Limits applied' },
      { id: 5, action: 'Calculate Premium', expectedResult: 'Premium calculated: {Premium}' },
      { id: 6, action: 'Click Issue Policy', expectedResult: 'Policy issued successfully' },
    ],
  },
  {
    id: 'cl-property',
    name: '🏢 Commercial Property Policy',
    description: 'Quote for commercial building and business personal property',
    sharedParameterName: 'CL_APPLICANT_SharedParameters',
    steps: [
      { id: 1, action: 'Open Commercial Property form', expectedResult: 'Form loads' },
      { id: 2, action: 'Enter Building Value: {BuildingValue}', expectedResult: 'Value accepted' },
      { id: 3, action: 'Enter Construction Type: {ConstructionType}', expectedResult: 'Type selected' },
      { id: 4, action: 'Set Occupancy: {Occupancy}', expectedResult: 'Occupancy set' },
      { id: 5, action: 'Add Protection Class: {ProtectionClass}', expectedResult: 'Class assigned' },
      { id: 6, action: 'Click Get Quote', expectedResult: 'Property quote generated' },
    ],
  },
  {
    id: 'pl-property',
    name: '🏠 Personal Property (Homeowners)',
    description: 'Quote for homeowners or renters insurance',
    sharedParameterName: 'PL_PERSONALHOMEOWNER_SharedParameters',
    steps: [
      { id: 1, action: 'Open Homeowners application', expectedResult: 'Form loads' },
      { id: 2, action: 'Enter Dwelling Limit: {DwellingLimit}', expectedResult: 'Limit set' },
      { id: 3, action: 'Enter Year Built: {YearBuilt}', expectedResult: 'Year accepted' },
      { id: 4, action: 'Select Roof Type: {RoofType}', expectedResult: 'Roof type selected' },
      { id: 5, action: 'Calculate Replacement Cost', expectedResult: 'Cost calculated' },
      { id: 6, action: 'Click Get Quote', expectedResult: 'Homeowners quote generated' },
    ],
  },
  {
    id: 'renters',
    name: '🏢 Renters Insurance',
    description: 'Quote for renters insurance with personal property coverage',
    sharedParameterName: 'RENTERS_SharedParameters',
    steps: [
      { id: 1, action: 'Open Renters application', expectedResult: 'Form loads' },
      { id: 2, action: 'Enter Personal Property Limit: {PropertyLimit}', expectedResult: 'Limit set' },
      { id: 3, action: 'Select Residence Type: {ResidenceType}', expectedResult: 'Type selected' },
      { id: 4, action: 'Enter Number of Occupants: {Occupants}', expectedResult: 'Occupants set' },
      { id: 5, action: 'Click Get Quote', expectedResult: 'Renters quote generated' },
    ],
  },
  {
    id: 'motorcycle',
    name: '🏍️ Motorcycle Insurance',
    description: 'Quote for motorcycle coverage including accessories',
    sharedParameterName: 'MOTORCYCLE_SharedParameters',
    steps: [
      { id: 1, action: 'Open Motorcycle application', expectedResult: 'Form loads' },
      { id: 2, action: 'Enter Make/Model: {MakeModel}', expectedResult: 'Vehicle identified' },
      { id: 3, action: 'Enter Engine CC: {EngineCC}', expectedResult: 'CC accepted' },
      { id: 4, action: 'Select Accessory Coverage: {AccessoryLimit}', expectedResult: 'Coverage added' },
      { id: 5, action: 'Click Get Quote', expectedResult: 'Motorcycle quote generated' },
    ],
  },
  {
    id: 'watercraft',
    name: '🚤 Watercraft Insurance',
    description: 'Quote for boat or personal watercraft coverage',
    sharedParameterName: 'WATERCRAFT_SharedParameters',
    steps: [
      { id: 1, action: 'Open Watercraft application', expectedResult: 'Form loads' },
      { id: 2, action: 'Enter Hull ID: {HullID}', expectedResult: 'ID accepted' },
      { id: 3, action: 'Select Usage Type: {Usage}', expectedResult: 'Usage set' },
      { id: 4, action: 'Enter Horsepower: {HP}', expectedResult: 'HP accepted' },
      { id: 5, action: 'Click Get Quote', expectedResult: 'Watercraft quote generated' },
    ],
  },
  {
    id: 'pets',
    name: '🐕 Pet Insurance',
    description: 'Quote for dog or cat health insurance',
    sharedParameterName: 'PETS_SharedParameters',
    steps: [
      { id: 1, action: 'Open Pet Insurance form', expectedResult: 'Form loads' },
      { id: 2, action: 'Enter Pet Name: {PetName}', expectedResult: 'Name accepted' },
      { id: 3, action: 'Select Breed: {Breed}', expectedResult: 'Breed selected' },
      { id: 4, action: 'Enter Pet Age: {Age}', expectedResult: 'Age accepted' },
      { id: 5, action: 'Click Get Quote', expectedResult: 'Pet quote generated' },
    ],
  },
  {
    id: 'umbrella',
    name: '☂️ Personal Umbrella',
    description: 'Quote for excess liability coverage',
    sharedParameterName: 'PERSONALUMBRELLA_SharedParameters',
    steps: [
      { id: 1, action: 'Open Umbrella application', expectedResult: 'Form loads' },
      { id: 2, action: 'Enter Underlying Auto Limit: {AutoLimit}', expectedResult: 'Limit accepted' },
      { id: 3, action: 'Enter Underlying Home Limit: {HomeLimit}', expectedResult: 'Limit accepted' },
      { id: 4, action: 'Select Umbrella Limit: {UmbrellaLimit}', expectedResult: 'Limit selected' },
      { id: 5, action: 'Click Get Quote', expectedResult: 'Umbrella quote generated' },
    ],
  },
  {
    id: 'dwelling-fire',
    name: '🔥 Dwelling Fire',
    description: 'Quote for non-owner occupied residential property',
    sharedParameterName: 'DWELLINGFIRE_SharedParameters',
    steps: [
      { id: 1, action: 'Open Dwelling Fire form', expectedResult: 'Form loads' },
      { id: 2, action: 'Enter Property Address: {Address}', expectedResult: 'Address accepted' },
      { id: 3, action: 'Select Coverage Form: {CoverageForm}', expectedResult: 'Form selected' },
      { id: 4, action: 'Enter Rental Income: {RentalIncome}', expectedResult: 'Income set' },
      { id: 5, action: 'Click Get Quote', expectedResult: 'Dwelling fire quote generated' },
    ],
  },
  {
    id: 'condominium',
    name: '🏢 Condominium',
    description: 'Quote for condo unit owner insurance (HO-6)',
    sharedParameterName: 'CONDOMINIUM_SharedParameters',
    steps: [
      { id: 1, action: 'Open Condo application', expectedResult: 'Form loads' },
      { id: 2, action: 'Enter Additions/Alterations: {Alterations}', expectedResult: 'Limit set' },
      { id: 3, action: 'Enter Loss Assessment: {LossAssessment}', expectedResult: 'Limit set' },
      { id: 4, action: 'Select Building Type: {BuildingType}', expectedResult: 'Type selected' },
      { id: 5, action: 'Click Get Quote', expectedResult: 'Condo quote generated' },
    ],
  }
,
  {
    id: 'cl-umbrella',
    name: '☂️ Commercial Umbrella Policy',
    description: 'Excess liability coverage for commercial entities',
    steps: [
      { id: 1, action: 'Open Commercial Umbrella form', expectedResult: 'Form loads' },
      { id: 2, action: 'Link Underlying Policies: {UnderlyingPolicies}', expectedResult: 'Policies linked' },
      { id: 3, action: 'Set Umbrella Limit: {UmbrellaLimit}', expectedResult: 'Limit set' },
      { id: 4, action: 'Verify Self-Insured Retention: {SIR}', expectedResult: 'SIR verified' },
      { id: 5, action: 'Submit for Underwriting', expectedResult: 'Submitted successfully' },
    ],
  },
  {
    id: 'pl-umbrella',
    name: '🌂 Personal Umbrella Policy',
    description: 'Excess liability coverage for individuals',
    steps: [
      { id: 1, action: 'Open Personal Umbrella form', expectedResult: 'Form loads' },
      { id: 2, action: 'Verify Underlying Auto/Home limits', expectedResult: 'Limits meet requirements' },
      { id: 3, action: 'Set Excess Limit: {ExcessLimit}', expectedResult: 'Limit set' },
      { id: 4, action: 'Click Issue', expectedResult: 'Umbrella policy issued' },
    ],
  },
  {
    id: 'workers-comp',
    name: '👷 Workers Compensation',
    description: 'Coverage for employee work-related injuries',
    steps: [
      { id: 1, action: 'Open Workers Comp application', expectedResult: 'Form loads' },
      { id: 2, action: 'Enter Class Codes: {ClassCodes}', expectedResult: 'Codes accepted' },
      { id: 3, action: 'Enter Estimated Payroll: {Payroll}', expectedResult: 'Payroll entered' },
      { id: 4, action: 'Set Number of Employees: {EmployeeCount}', expectedResult: 'Count set' },
      { id: 5, action: 'Calculate Premium', expectedResult: 'WC Premium calculated' },
    ],
  },
  {
    id: 'general-liability',
    name: '⚖️ General Liability',
    description: 'Broad liability coverage for business operations',
    steps: [
      { id: 1, action: 'Open General Liability form', expectedResult: 'Form loads' },
      { id: 2, action: 'Select Business Class: {BusinessClass}', expectedResult: 'Class selected' },
      { id: 3, action: 'Set Occurrence Limit: {OccurrenceLimit}', expectedResult: 'Limit set' },
      { id: 4, action: 'Set Aggregate Limit: {AggregateLimit}', expectedResult: 'Limit set' },
      { id: 5, action: 'Click Quote', expectedResult: 'GL Quote generated' },
    ],
  },
  {
    id: 'professional-liability',
    name: '🎓 Professional Liability (E&O)',
    description: 'Coverage for professional errors and omissions',
    steps: [
      { id: 1, action: 'Open Professional Liability form', expectedResult: 'Form loads' },
      { id: 2, action: 'Enter Professional Service: {ServiceType}', expectedResult: 'Service defined' },
      { id: 3, action: 'Enter Annual Revenue: {Revenue}', expectedResult: 'Revenue accepted' },
      { id: 4, action: 'Set Retroactive Date: {RetroDate}', expectedResult: 'Date set' },
      { id: 5, action: 'Submit for Quote', expectedResult: 'E&O Quote ready' },
    ],
  },
];

const TemplatesModal: React.FC<Props> = ({ open, onClose, onSelect }) => {
  const [selectedTenant, setSelectedTenant] = React.useState('All');
  const [customTemplates, setCustomTemplates] = React.useState<Template[]>([]);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftTenant, setDraftTenant] = React.useState<Tenant>('All');
  const [draftName, setDraftName] = React.useState('');
  const [draftDescription, setDraftDescription] = React.useState('');
  const [draftSharedParam, setDraftSharedParam] = React.useState('');
  const [draftStepsJson, setDraftStepsJson] = React.useState('[]');
  const [editorError, setEditorError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const loaded = safeParseTemplates(localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY));
    setCustomTemplates(loaded);
  }, [open]);

  const persistCustomTemplates = (next: Template[]) => {
    setCustomTemplates(next);
    localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(next));
  };

  const allTemplates = React.useMemo(() => mergeTemplates(templates, customTemplates), [customTemplates]);

  const filteredTemplates = selectedTenant === 'All'
    ? allTemplates
    : allTemplates.filter((t) => (t.tenant ?? 'All') === selectedTenant);

  const resetEditor = () => {
    setEditingId(null);
    setDraftTenant('All');
    setDraftName('');
    setDraftDescription('');
    setDraftSharedParam('');
    setDraftStepsJson('[]');
    setEditorError(null);
  };

  const openNewEditor = () => {
    resetEditor();
    setEditorOpen(true);
  };

  const openEditEditor = (t: Template) => {
    setEditingId(t.id);
    setDraftTenant(t.tenant ?? 'All');
    setDraftName(t.name);
    setDraftDescription(t.description);
    setDraftSharedParam(t.sharedParameterName ?? '');
    setDraftStepsJson(makeStepsJson(t.steps));
    setEditorError(null);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditorError(null);
  };

  const saveTemplate = () => {
    setEditorError(null);

    const name = draftName.trim();
    const description = draftDescription.trim();
    if (!name) {
      setEditorError('Template name is required.');
      return;
    }
    if (!description) {
      setEditorError('Template description is required.');
      return;
    }

    let stepsParsed: Array<{ action: string; expectedResult: string }> = [];
    try {
      const parsed = JSON.parse(draftStepsJson);
      if (!Array.isArray(parsed)) throw new Error('Steps JSON must be an array.');
      stepsParsed = parsed.map((row: any) => ({
        action: String(row?.action ?? ''),
        expectedResult: String(row?.expectedResult ?? ''),
      }));
    } catch (e) {
      setEditorError('Steps must be valid JSON: [{"action":"...","expectedResult":"..."}, ...]');
      return;
    }

    const steps: Step[] = stepsParsed.map((s, index) => ({
      id: index + 1,
      action: s.action,
      expectedResult: s.expectedResult,
    }));

    const id = editingId ?? `custom-${Date.now()}`;
    const nextTemplate: Template = {
      id,
      name,
      description,
      tenant: draftTenant ?? 'All',
      sharedParameterName: draftSharedParam.trim() ? draftSharedParam.trim() : undefined,
      steps,
    };

    const nextCustom = [...customTemplates.filter((t) => t.id !== id), nextTemplate];
    persistCustomTemplates(nextCustom);
    closeEditor();
  };

  const handleSelect = (t: Template) => {
    onSelect({
      ...t,
      steps: t.steps.map((s) => ({ ...s, id: Date.now() + Math.random() })),
    });
    onClose();
  };

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  const modal = (
    <div className="templates-modal-overlay" onClick={onClose}>
      <div className="templates-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="templates-modal-header">
          <div>
            <h2 className="templates-modal-title">📋 Test Case Templates</h2>
            <p className="templates-modal-subtitle">Choose a template to get started quickly</p>
          </div>
          <div className="templates-modal-actions">
            <div className="templates-modal-controls">
              <label htmlFor="tenant-filter" className="templates-modal-label">Tenant:</label>
              <select
                id="tenant-filter"
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className="templates-modal-select"
                aria-label="Filter templates by tenant"
              >
                {TENANTS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="templates-modal-new"
              onClick={openNewEditor}
              title="Create a new template"
            >
              + New Template
            </button>
          </div>
          <button 
            onClick={onClose}
            className="templates-modal-close"
            title="Close templates"
          >
            <span className="templates-close-icon">✕</span>
          </button>
        </div>

        {editorOpen && (
          <div className="templates-modal-editor">
            <div className="templates-editor-grid">
              <div className="templates-editor-field">
                <label className="templates-editor-label" htmlFor="tpl-name">Name</label>
                <input
                  id="tpl-name"
                  className="templates-editor-input"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="e.g. Commercial Applicant Creation"
                />
              </div>
              <div className="templates-editor-field">
                <label className="templates-editor-label" htmlFor="tpl-tenant">Tenant</label>
                <select
                  id="tpl-tenant"
                  className="templates-editor-select"
                  value={draftTenant ?? 'All'}
                  onChange={(e) => setDraftTenant(isValidTenant(e.target.value) ? e.target.value : 'All')}
                >
                  {TENANTS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="templates-editor-field full">
                <label className="templates-editor-label" htmlFor="tpl-desc">Description</label>
                <input
                  id="tpl-desc"
                  className="templates-editor-input"
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  placeholder="What is this template for?"
                />
              </div>

              <div className="templates-editor-field full">
                <label className="templates-editor-label" htmlFor="tpl-shared">Shared Parameter Name (optional)</label>
                <input
                  id="tpl-shared"
                  className="templates-editor-input"
                  value={draftSharedParam}
                  onChange={(e) => setDraftSharedParam(e.target.value)}
                  placeholder="e.g. CL_APPLICANT_SharedParameters"
                />
              </div>

              <div className="templates-editor-field full">
                <label className="templates-editor-label" htmlFor="tpl-steps">Steps (JSON)</label>
                <textarea
                  id="tpl-steps"
                  className="templates-editor-textarea"
                  value={draftStepsJson}
                  onChange={(e) => setDraftStepsJson(e.target.value)}
                  spellCheck={false}
                />
              </div>
            </div>

            {editorError && <div className="templates-editor-error">{editorError}</div>}

            <div className="templates-editor-actions">
              <button type="button" className="btn-cancel" onClick={closeEditor}>Cancel</button>
              <button type="button" className="btn-submit" onClick={saveTemplate}>
                {editingId ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        )}

        {/* Templates Grid with Scroll */}
        <div className="templates-modal-grid">
          {filteredTemplates.length > 0 ? (
            filteredTemplates.map(t => (
            <div 
              key={t.id} 
              className="templates-modal-card"
            >
              <div className="templates-card-name">{t.name}</div>
              <p className="templates-card-description">{t.description}</p>
              <div className="templates-card-meta">
                <span>📌</span>
                <span>{t.steps.length} steps included</span>
              </div>
              <div className="templates-card-actions">
                <button
                  type="button"
                  className="templates-card-edit"
                  onClick={() => openEditEditor(t)}
                >
                  Edit
                </button>
                <button 
                  type="button"
                  className="templates-card-button"
                  onClick={() => handleSelect(t)}
                >
                  ➕ Create From Template
                </button>
              </div>
            </div>
            ))
          ) : (
            <div className="templates-modal-empty">
              <p className="templates-empty-title">No templates found for {selectedTenant}</p>
              <p className="templates-empty-subtitle">Try selecting a different tenant</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default TemplatesModal;

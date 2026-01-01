import React, { useState, useEffect, useRef } from 'react';
import './tenantFilter.css';

export type TenantConfig = {
  id: string;
  name: string;
  displayName: string;
  icon?: string;
  color?: string;
};

type Props = {
  tenants: TenantConfig[];
  selectedTenant: TenantConfig | null;
  onTenantChange: (tenant: TenantConfig) => void;
  showAllOption?: boolean;
};

const TenantFilter: React.FC<Props> = ({
  tenants,
  selectedTenant,
  onTenantChange,
  showAllOption = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTenants, setFilteredTenants] = useState<TenantConfig[]>(tenants);
  const optionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredTenants(tenants);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredTenants(
        tenants.filter(
          t =>
            t.name.toLowerCase().includes(term) ||
            t.displayName.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, tenants]);

  useEffect(() => {
    if (!isOpen) return;
    filteredTenants.forEach((tenant) => {
      const el = optionRefs.current.get(tenant.id);
      if (!el) return;
      el.style.borderLeftColor = tenant.color || '#0078d4';
    });
  }, [isOpen, filteredTenants]);

  const handleSelectTenant = (tenant: TenantConfig) => {
    onTenantChange(tenant);
    setIsOpen(false);
    setSearchTerm('');
  };

  const displayName = selectedTenant?.displayName || 'Select Tenant';

  return (
    <div className="tenant-filter-container">
      <div className="tenant-filter-wrapper">
        <button
          className="tenant-filter-button"
          onClick={() => setIsOpen(!isOpen)}
          title={selectedTenant?.displayName || 'Click to select a tenant'}
        >
          <span className="tenant-filter-icon">
            {selectedTenant?.icon || '🏢'}
          </span>
          <span className="tenant-filter-text">{displayName}</span>
          <span className={`tenant-filter-arrow ${isOpen ? 'open' : ''}`}>
            ▼
          </span>
        </button>

        {isOpen && (
          <div className="tenant-filter-dropdown">
            <div className="tenant-filter-search-wrapper">
              <input
                type="text"
                className="tenant-filter-search"
                placeholder="Search tenants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              {searchTerm && (
                <button
                  className="tenant-filter-clear"
                  onClick={() => setSearchTerm('')}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="tenant-filter-options">
              {showAllOption && (
                <div
                  className={`tenant-filter-option ${
                    !selectedTenant ? 'selected' : ''
                  }`}
                  onClick={() => handleSelectTenant(null as any)}
                >
                  <span className="tenant-filter-option-icon">🌐</span>
                  <span className="tenant-filter-option-text">All Tenants</span>
                  {!selectedTenant && (
                    <span className="tenant-filter-option-checkmark">✓</span>
                  )}
                </div>
              )}

              {filteredTenants.length > 0 ? (
                filteredTenants.map((tenant) => (
                  <div
                    key={tenant.id}
                    className={`tenant-filter-option ${
                      selectedTenant?.id === tenant.id ? 'selected' : ''
                    }`}
                    onClick={() => handleSelectTenant(tenant)}
                    ref={(el) => {
                      if (el) optionRefs.current.set(tenant.id, el);
                      else optionRefs.current.delete(tenant.id);
                    }}
                  >
                    <span className="tenant-filter-option-icon">
                      {tenant.icon || '🏢'}
                    </span>
                    <div className="tenant-filter-option-content">
                      <div className="tenant-filter-option-name">
                        {tenant.displayName}
                      </div>
                      <div className="tenant-filter-option-id">{tenant.name}</div>
                    </div>
                    {selectedTenant?.id === tenant.id && (
                      <span className="tenant-filter-option-checkmark">✓</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="tenant-filter-no-results">
                  No tenants found for "{searchTerm}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isOpen && (
        <div
          className="tenant-filter-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default TenantFilter;

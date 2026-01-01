import React from 'react';
import { API_BASE } from '../../services/apiClient';

const DebugBadge: React.FC = () => {
  if (process.env.NODE_ENV === 'production') return null;

  const base = API_BASE || '(relative)';

  return (
    <div className="debug-badge">
      <strong>API:</strong> {base}
    </div>
  );
};

export default DebugBadge;

import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { routes } from './routes';
import DebugBadge from '../shared/components/layout/DebugBadge';
import 'react-toastify/dist/ReactToastify.css';

const App: React.FC = () => {
  return (
    <>
      <Routes>
        {routes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element}>
            {route.children?.map((child) => (
              <Route key={child.path} path={child.path} element={child.element} />
            ))}
            {route.path === '/app/*' && <Route index element={<Navigate to="dashboard" replace />} />}
          </Route>
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} />
      <DebugBadge />
    </>
  );
};

export default App;

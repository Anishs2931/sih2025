import React from 'react';
import { CurrentUserProvider } from './contexts/CurrentUserContext';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Components
import Login from './components/Login';
import TechnicianDashboard from './components/technician/Technician';
import FixifyAdminDashboard from './components/admin/Admin';
import FixifyUserDashboard from './components/user/User';
import CommunityDescription from './components/user/CommunityDescription';


function App() {
  return (
    <CurrentUserProvider>
      <Router>
        <Routes>
          {/* Default route → landing page */}
          <Route path="/" element={<Login />} />

          {/* Auth/Login page */}
          <Route path="/auth" element={<Login />} />

          {/* Role-based dashboards */}
          <Route path="/user-dashboard" element={<FixifyUserDashboard />} />
          <Route path="/technician-dashboard" element={<TechnicianDashboard/>} />
          <Route path="/admin-dashboard" element={<FixifyAdminDashboard />} />

          {/* Community route */}
          <Route path="/community" element={<CommunityDescription />} />

          {/* Optional: Catch-all route to redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </CurrentUserProvider>
  );
}

export default App;

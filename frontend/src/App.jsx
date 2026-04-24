// src/App.jsx
import Dashboard from './pages/Dashboard';
import Mentors from './pages/Mentors';
import Schools from './pages/Schools';
import Teachers from './pages/Teachers';
import Ecosystem from './pages/Ecosystem';
import Safeguarding from './pages/Safeguarding';
import Pathways from './pages/Pathways';
import MandE from './pages/MandE';
import StarClub from './pages/StarClub';
import FlagsAlerts from './pages/FlagsAlerts';
import Reports from './pages/Reports';
import DonorView from './pages/DonorView';
import CommandCentre from './pages/CommandCentre';
import LiveMap from './pages/LiveMap';
import UserManagement from './pages/UserManagement';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/mentors" element={
  <ProtectedRoute>
    <Mentors />
  </ProtectedRoute>
} />
<Route path="/schools" element={
  <ProtectedRoute>
    <Schools />
  </ProtectedRoute>
} />
<Route path="/teachers" element={
  <ProtectedRoute>
    <Teachers />
  </ProtectedRoute>
} />
<Route path="/ecosystem" element={
  <ProtectedRoute>
    <Ecosystem />
  </ProtectedRoute>
} />

<Route path="/safeguarding" element={
  <ProtectedRoute>
    <Safeguarding />
  </ProtectedRoute>
} />

<Route path="/pathways" element={
  <ProtectedRoute>
    <Pathways />
  </ProtectedRoute>
} />

<Route path="/mande" element={
  <ProtectedRoute>
    <MandE />
  </ProtectedRoute>
} />

<Route path="/starclub" element={
  <ProtectedRoute>
    <StarClub />
  </ProtectedRoute>
} />

<Route path="/flags" element={
  <ProtectedRoute>
    <FlagsAlerts />
  </ProtectedRoute>
} />

<Route path="/reports" element={
  <ProtectedRoute roles={['admin','programme_coordinator']}>
    <Reports />
  </ProtectedRoute>
} />
<Route path="/command" element={
  <ProtectedRoute roles={['admin','programme_coordinator']}>
    <CommandCentre />
  </ProtectedRoute>
} />
<Route path="/donor" element={
  <ProtectedRoute roles={['admin','programme_coordinator']}>
    <DonorView />
  </ProtectedRoute>
} />

<Route path="/map" element={
  <ProtectedRoute>
    <LiveMap />
  </ProtectedRoute>
} />

<Route path="/users" element={
  <ProtectedRoute roles={['admin']}>
    <UserManagement />
  </ProtectedRoute>
} />

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
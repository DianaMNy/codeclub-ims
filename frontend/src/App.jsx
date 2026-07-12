// src/App.jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Mentors = lazy(() => import('./pages/Mentors'));
const Schools = lazy(() => import('./pages/Schools'));
const Teachers = lazy(() => import('./pages/Teachers'));
const Ecosystem = lazy(() => import('./pages/Ecosystem'));
const Safeguarding = lazy(() => import('./pages/Safeguarding'));
const Pathways = lazy(() => import('./pages/Pathways'));
const MandE = lazy(() => import('./pages/MandE'));
const StarClub = lazy(() => import('./pages/StarClub'));
const FlagsAlerts = lazy(() => import('./pages/FlagsAlerts'));
const Reports = lazy(() => import('./pages/Reports'));
const DonorView = lazy(() => import('./pages/DonorView'));
const CommandCentre = lazy(() => import('./pages/CommandCentre'));
const LiveMap = lazy(() => import('./pages/LiveMap'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Chat = lazy(() => import('./pages/Chat'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

function RouteLoading() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'sans-serif',
      color: '#555',
    }}>
      Loading…
    </div>
  );
}

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
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
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
    <Route path="/chat" element={
      <ProtectedRoute>
        <Chat />
      </ProtectedRoute>
    } />

            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

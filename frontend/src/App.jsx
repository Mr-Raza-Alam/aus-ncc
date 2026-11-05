import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './shared/auth/AuthContext';
import { PrivateRoute, RoleRoute } from './shared/auth/RouteGuard';
import Layout from './components/Layout/Layout';

import LandingPage from './pages/LandingPage/LandingPage';
import SelectUnitPage from './pages/SelectUnitPage/SelectUnitPage';
import LoginPage from './pages/LoginPage/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage/ForgotPasswordPage';
import ChangePasswordPage from './pages/ChangePasswordPage/ChangePasswordPage';
import OnboardingPage from './pages/OnboardingPage/OnboardingPage';
import DashboardPage from './pages/DashboardPage/DashboardPage';
import CentralCadetDirectory from './pages/CentralCadetDirectory/CentralCadetDirectory';

import AttendanceModule from './modules/attendance';
import OfficerSessionView from './modules/attendance/views/OfficerSessionView';
import CadetRosterView from './modules/attendance/views/CadetRosterView';
import AttendanceReportsView from './modules/attendance/views/AttendanceReportsView';
import RefreshmentLedgerView from './modules/attendance/views/RefreshmentLedgerView';
import YearlyPromotionView from './modules/attendance/views/YearlyPromotionView';
import AttendanceSettingsView from './modules/attendance/views/AttendanceSettingsView';
import AuditTrailView from './modules/attendance/views/AuditTrailView';
import LearningModule from './modules/learning';
import EventsModule from './modules/events';
import SelectionModule from './modules/selection';

function NotFound() {
  return (
    <div style={{ padding: '60px 24px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem', color: 'var(--navy)' }}>404</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        The page you are looking for does not exist.
      </p>
      <Link to="/" className="btn btn-primary">
        Go to Home
      </Link>
    </div>
  );
}

function PlaceholderPage({ title, description, badge }) {
  return (
    <div className="card" style={{ marginTop: '24px', textAlign: 'center', padding: '48px 24px' }}>
      <h2 style={{ color: 'var(--navy)', marginBottom: '8px' }}>{title}</h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 24px' }}>
        {description}
      </p>
      <div className="badge badge-warning" style={{ display: 'inline-block', padding: '6px 16px' }}>
        {badge || 'Under Construction - Phase 1'}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login/select-unit" element={<SelectUnitPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Forced Security & Onboarding Routes */}
          <Route
            path="/change-password"
            element={
              <PrivateRoute>
                <ChangePasswordPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <PrivateRoute>
                <OnboardingPage />
              </PrivateRoute>
            }
          />

          {/* Authenticated Dashboard Shell Routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </PrivateRoute>
            }
          />

          {/* Attendance Board Service Routes */}
          <Route
            path="/dashboard/attendance"
            element={
              <PrivateRoute>
                <Layout>
                  <AttendanceModule />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/dashboard/attendance/session"
            element={
              <PrivateRoute>
                <Layout>
                  <OfficerSessionView />
                </Layout>
              </PrivateRoute>
            }
          />

          {/* Central Cadet Directory (Master Personnel Hub) */}
          <Route
            path="/dashboard/cadets"
            element={
              <RoleRoute roles={['lead_admin', 'cto', 'assistant']}>
                <Layout>
                  <CentralCadetDirectory />
                </Layout>
              </RoleRoute>
            }
          />
          <Route
            path="/dashboard/roster"
            element={
              <RoleRoute roles={['lead_admin', 'cto', 'assistant']}>
                <Layout>
                  <CentralCadetDirectory />
                </Layout>
              </RoleRoute>
            }
          />
          <Route
            path="/dashboard/attendance/roster"
            element={
              <RoleRoute roles={['lead_admin', 'cto', 'assistant']}>
                <Layout>
                  <CadetRosterView />
                </Layout>
              </RoleRoute>
            }
          />

          <Route
            path="/dashboard/refreshment"
            element={
              <PrivateRoute>
                <Layout>
                  <RefreshmentLedgerView />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/attendance/refreshment"
            element={
              <PrivateRoute>
                <Layout>
                  <RefreshmentLedgerView />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/dashboard/reports"
            element={
              <PrivateRoute>
                <Layout>
                  <AttendanceReportsView />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/attendance/reports"
            element={
              <PrivateRoute>
                <Layout>
                  <AttendanceReportsView />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/dashboard/attendance/promote"
            element={
              <RoleRoute roles={['lead_admin', 'cto']}>
                <Layout>
                  <YearlyPromotionView />
                </Layout>
              </RoleRoute>
            }
          />

          <Route
            path="/dashboard/settings"
            element={
              <RoleRoute roles={['lead_admin', 'cto']}>
                <Layout>
                  <AttendanceSettingsView />
                </Layout>
              </RoleRoute>
            }
          />
          <Route
            path="/dashboard/attendance/settings"
            element={
              <RoleRoute roles={['lead_admin', 'cto']}>
                <Layout>
                  <AttendanceSettingsView />
                </Layout>
              </RoleRoute>
            }
          />

          <Route
            path="/dashboard/attendance/audit"
            element={
              <RoleRoute roles={['lead_admin', 'cto']}>
                <Layout>
                  <AuditTrailView />
                </Layout>
              </RoleRoute>
            }
          />

          <Route
            path="/dashboard/users"
            element={
              <RoleRoute roles={['lead_admin']}>
                <Layout>
                  <PlaceholderPage
                    title="Admin Accounts & Permissions"
                    description="Configure officer roles, delegate module permissions, and oversee units."
                  />
                </Layout>
              </RoleRoute>
            }
          />

          <Route
            path="/dashboard/selection"
            element={
              <RoleRoute roles={['lead_admin', 'cto']}>
                <Layout>
                  <SelectionModule />
                </Layout>
              </RoleRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

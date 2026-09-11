import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DemoProvider } from './context/DemoContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import NewInspectionPage from './pages/NewInspectionPage';
import ScanProductPage from './pages/ScanProductPage';
import AnalysePage from './pages/AnalysePage';
import ComplianceResultPage from './pages/ComplianceResultPage';
import FindingDetailPage from './pages/FindingDetailPage';
import OfficerReviewPage from './pages/OfficerReviewPage';
import InspectionReportPage from './pages/InspectionReportPage';
import ListingSetupPage from './pages/ListingSetupPage';
import ListingAnalysePage from './pages/ListingAnalysePage';
import RepositoryPage from './pages/RepositoryPage';
import AnalyticsPage from './pages/AnalyticsPage';
import RuleLibraryPage from './pages/RuleLibraryPage';
import RuleDetailPage from './pages/RuleDetailPage';
import ProfilePage from './pages/ProfilePage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-950">
        <div className="text-center">
          <div className="mb-4 h-10 w-10 mx-auto rounded-full border-2 border-govblue-500 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-950">
        <div className="text-center">
          <div className="mb-4 h-10 w-10 mx-auto rounded-full border-2 border-govblue-500 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-400">Initializing...</p>
        </div>
      </div>
    );
  }
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignupPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ForgotPasswordPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/inspection/new" element={<ProtectedRoute><NewInspectionPage /></ProtectedRoute>} />
      <Route path="/inspection/:id/scan" element={<ProtectedRoute><ScanProductPage /></ProtectedRoute>} />
      <Route path="/inspection/:id/listing" element={<ProtectedRoute><ListingSetupPage /></ProtectedRoute>} />
      <Route path="/inspection/:id/listing/analyse" element={<ProtectedRoute><ListingAnalysePage /></ProtectedRoute>} />
      <Route path="/inspection/:id/analyse" element={<ProtectedRoute><AnalysePage /></ProtectedRoute>} />
      <Route path="/inspection/:id/result" element={<ProtectedRoute><ComplianceResultPage /></ProtectedRoute>} />
      <Route path="/inspection/:id/finding/:findingId" element={<ProtectedRoute><FindingDetailPage /></ProtectedRoute>} />
      <Route path="/inspection/:id/review" element={<ProtectedRoute><OfficerReviewPage /></ProtectedRoute>} />
      <Route path="/inspection/:id/report" element={<ProtectedRoute><InspectionReportPage /></ProtectedRoute>} />
      <Route path="/inspections" element={<ProtectedRoute><RepositoryPage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/rules" element={<ProtectedRoute><RuleLibraryPage /></ProtectedRoute>} />
      <Route path="/rules/:ruleId" element={<ProtectedRoute><RuleDetailPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <DemoProvider>
        <AppRoutes />
      </DemoProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;

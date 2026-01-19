import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { SignIn } from '@/pages/auth/SignIn';
import { SignUp } from '@/pages/auth/SignUp';
import { Dashboard } from '@/pages/dashboard/Dashboard';
import { CreateBot } from '@/pages/dashboard/CreateBot';
import { EmbedBot } from '@/pages/dashboard/EmbedBot';
import { AgentBuilder } from '@/pages/agent-builder/AgentBuilder';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { TelegramIntegration } from '@/pages/dashboard/TelegramIntegration';
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
          </Route>

          {/* Protected Dashboard Routes */}
          <Route element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create-bot" element={<CreateBot />} />
            <Route path="/embed/:botId" element={<EmbedBot />} />
            <Route path="/agent-builder" element={<AgentBuilder />} />
<Route path="/bot/:botId/telegram" element={<TelegramIntegration />} />
          </Route>

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-indigo-500">Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
};


export default App;

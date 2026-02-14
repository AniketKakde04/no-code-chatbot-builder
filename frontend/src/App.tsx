import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { SignIn } from '@/pages/auth/SignIn';
import { SignUp } from '@/pages/auth/SignUp';
import { Dashboard } from '@/pages/dashboard/Dashboard';
import { CreateBot } from '@/pages/dashboard/CreateBot';
import { EditBot } from '@/pages/dashboard/EditBot';
import { EmbedBot } from '@/pages/dashboard/EmbedBot';
import { AgentBuilder } from '@/pages/agent-builder/AgentBuilder';
import { ChatPage } from '@/pages/chat/ChatPage';
import { PublicChat } from '@/pages/chat/PublicChat';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { TelegramIntegration } from '@/pages/dashboard/TelegramIntegration';
import { WhatsAppIntegration } from '@/pages/dashboard/WhatsAppIntegration';

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

          {/* Protected Dashboard Routes (WITH Sidebar) */}
          <Route element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create-bot" element={<CreateBot />} />
            <Route path="/edit-bot/:botId" element={<EditBot />} />
            <Route path="/embed/:botId" element={<EmbedBot />} />
            <Route path="/chat/:botId" element={<ChatPage />} />
            <Route path="/bot/:botId/telegram" element={<TelegramIntegration />} />
            <Route path="/bot/:botId/whatsapp" element={<WhatsAppIntegration />} />
          </Route>

          {/* Standalone Builder Route (NO Sidebar - Full Screen) */}
          <Route path="/agent-builder" element={
            <ProtectedRoute>
              <AgentBuilder />
            </ProtectedRoute>
          } />
          <Route path="/agent-builder/:workflowId" element={
            <ProtectedRoute>
              <AgentBuilder />
            </ProtectedRoute>
          } />

          {/* Public Share Route (NO auth, NO sidebar) */}
          <Route path="/s/:shareId" element={<PublicChat />} />

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
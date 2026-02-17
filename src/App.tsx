import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { MainLayout } from "./components/layout/MainLayout";
import Index from "./pages/Index";
import Payments from "./pages/Payments";
import Commissions from "./pages/Commissions";
import Boletos from "./pages/Boletos";
import Emails from "./pages/Emails";
import Reajustes from "./pages/Reajustes";
import SettingsPage from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/pagamentos" element={<Payments />} />
        <Route path="/comissoes" element={<Commissions />} />
        <Route path="/boletos" element={<Boletos />} />
        <Route path="/reajustes" element={<Reajustes />} />
        <Route path="/emails" element={<Emails />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MainLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

function AuthRoute() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/" replace />;
  return <Auth />;
}

export default App;

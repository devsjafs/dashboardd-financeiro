import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import Index from "./pages/Index";
import Payments from "./pages/Payments";
import Commissions from "./pages/Commissions";
import Boletos from "./pages/Boletos";
import Emails from "./pages/Emails";
import Reajustes from "./pages/Reajustes";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/pagamentos" element={<Payments />} />
            <Route path="/comissoes" element={<Commissions />} />
            <Route path="/boletos" element={<Boletos />} />
            <Route path="/reajustes" element={<Reajustes />} />
            <Route path="/emails" element={<Emails />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

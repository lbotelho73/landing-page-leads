
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GoogleAuthGuide } from "@/components/auth/GoogleAuthGuide";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProfessionalsPage from "./pages/ProfessionalsPage";
import ServicesPage from "./pages/ServicesPage";
import CustomersPage from "./pages/CustomersPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import PaymentsPage from "./pages/PaymentsPage";
import MarketingPage from "./pages/MarketingPage";
import SettingsPage from "./pages/SettingsPage";
import ReportsPage from "./pages/ReportsPage";
import DataPage from "./pages/DataPage";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  const [showGoogleGuide, setShowGoogleGuide] = useState(false);

  useEffect(() => {
    // Check Supabase environment variables
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      toast.warning(
        "Configuração do Supabase ausente",
        {
          description: "Por favor, configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas suas variáveis de ambiente.",
          duration: 10000,
        }
      );
    } else {
      console.log("Supabase environment variables found");
    }

    // Check for authentication errors
    const checkAuthError = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');
      
      console.log("Checking for auth errors:", { error, errorDescription });
      
      if (error) {
        console.error("Auth error:", error, errorDescription);
        toast.error(`Erro de autenticação: ${errorDescription || error}`, { duration: 10000 });
        
        // Show Google configuration guide for specific errors
        const googleErrors = [
          "google", "connection", "refused", "timeout", "network", "provider"
        ];
        
        const shouldShowGuide = googleErrors.some(term => 
          error.toLowerCase().includes(term) || 
          (errorDescription && errorDescription.toLowerCase().includes(term))
        );
        
        if (shouldShowGuide) {
          console.log("Showing Google Auth guide due to error");
          setShowGoogleGuide(true);
        }
      }
    };
    
    checkAuthError();

    // Set up Supabase auth listener to detect Google auth errors
    const setupAuthListener = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data } = await supabase.auth.getSession();
        
        if (!data.session) {
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("Auth state change:", event);
            
            if (event === 'SIGNED_IN') {
              // Clear URL parameters on successful login
              window.history.replaceState({}, document.title, window.location.pathname);
            } else if (event === 'USER_UPDATED') {
              // User data updated
              console.log("User profile updated");
            } else if (event === 'SIGNED_OUT') {
              // User signed out
              console.log("User signed out");
            }
          });
          
          return () => subscription.unsubscribe();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      }
    };
    
    setupAuthListener();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Toaster />
          <Sonner />
          
          {showGoogleGuide && (
            <div className="fixed top-4 right-4 z-50 w-full max-w-md">
              <GoogleAuthGuide />
            </div>
          )}
          
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/professionals" element={<ProfessionalsPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/marketing" element={<MarketingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/data" element={<DataPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

import React, { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Header from "./components/Header";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import AboutPage from "./pages/AboutPage";
import FutureEnhancementsPage from "./pages/FutureEnhancementsPage";
import ContactPage from "./pages/ContactPage";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";

const UploadedMapNavigatorPage = lazy(() => import("./pages/UploadedMapNavigatorPage"));
const UploadedMap3DPreviewPage = lazy(() => import("./pages/UploadedMap3DPreviewPage"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Header />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/navigate/user-:mapId" element={<Suspense fallback={<div className="p-6">Loading map…</div>}><ErrorBoundary><UploadedMapNavigatorPage /></ErrorBoundary></Suspense>} />
            <Route path="/navigate/upload/:mapId" element={<Suspense fallback={<div className="p-6">Loading map…</div>}><ErrorBoundary><UploadedMapNavigatorPage /></ErrorBoundary></Suspense>} />
            <Route path="/navigate/upload/:mapId/preview-3d" element={<Suspense fallback={<div className="p-6">Loading 3D preview…</div>}><ErrorBoundary><UploadedMap3DPreviewPage /></ErrorBoundary></Suspense>} />
            <Route path="/navigate/user-:mapId" element={<ErrorBoundary><UploadedMapNavigatorPage /></ErrorBoundary>} />
            <Route path="/navigate/upload/:mapId" element={<ErrorBoundary><UploadedMapNavigatorPage /></ErrorBoundary>} />
            <Route path="/navigate/upload/:mapId/preview-3d" element={<ErrorBoundary><UploadedMap3DPreviewPage /></ErrorBoundary>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

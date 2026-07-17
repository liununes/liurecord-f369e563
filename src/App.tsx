import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import Admin from "./pages/Admin";
import ClientGallery from "./pages/ClientGallery";
import ClientPortal from "./pages/ClientPortal";

const queryClient = new QueryClient();

const SCROLL_KEY = "scroll_positions";

function ScrollRestore() {
  const { pathname } = useLocation();

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || "{}");
      const pos = saved[pathname];
      if (pos) {
        requestAnimationFrame(() => window.scrollTo(pos.x, pos.y));
      } else {
        window.scrollTo(0, 0);
      }
    } catch { /* ignore */ }
  }, [pathname]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || "{}");
        saved[pathname] = { x: window.scrollX, y: window.scrollY };
        sessionStorage.setItem(SCROLL_KEY, JSON.stringify(saved));
      } catch { /* ignore */ }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [pathname]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollRestore />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/galeria/:clientId" element={<ClientGallery />} />
          <Route path="/clientes" element={<ClientPortal />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

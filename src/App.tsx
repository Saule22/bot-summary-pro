import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import DashboardPanel from "./components/DashboardPanel";
import ChannelsPanel from "./components/ChannelsPanel";
import KeywordsPanel from "./components/KeywordsPanel";
import DigestPanel from "./components/DigestPanel";
import MessagesPanel from "./components/MessagesPanel";
import ContentPlanPanel from "./components/ContentPlanPanel";
import MyStylePanel from "./components/MyStylePanel";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPanel />} />
            <Route path="/channels" element={<ChannelsPanel />} />
            <Route path="/keywords" element={<KeywordsPanel />} />
            <Route path="/digest" element={<DigestPanel />} />
            <Route path="/messages" element={<MessagesPanel />} />
            <Route path="/content-plan" element={<ContentPlanPanel />} />
            <Route path="/my-style" element={<MyStylePanel />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

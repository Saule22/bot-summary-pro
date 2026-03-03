import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import DashboardPanel from "./components/DashboardPanel";
import ChannelsPanel from "./components/ChannelsPanel";
import KeywordsPanel from "./components/KeywordsPanel";
import DigestPanel from "./components/DigestPanel";
import MessagesPanel from "./components/MessagesPanel";
import ContentPlanPanel from "./components/ContentPlanPanel";
import MyStylePanel from "./components/MyStylePanel";
import WritePostPanel from "./components/WritePostPanel";
import SourcesPanel from "./components/SourcesPanel";
import FindInfoPanel from "./components/FindInfoPanel";
import SettingsPanel from "./components/SettingsPanel";
import Proposal from "./pages/Proposal";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/landing" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/proposal/:clientName" element={<Proposal />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPanel />} />
            <Route path="/write-post" element={<WritePostPanel />} />
            <Route path="/channels" element={<ChannelsPanel />} />
            <Route path="/keywords" element={<KeywordsPanel />} />
            <Route path="/sources" element={<SourcesPanel />} />
            <Route path="/find-info" element={<FindInfoPanel />} />
            <Route path="/digest" element={<DigestPanel />} />
            <Route path="/messages" element={<MessagesPanel />} />
            <Route path="/content-plan" element={<ContentPlanPanel />} />
            <Route path="/my-style" element={<MyStylePanel />} />
            <Route path="/settings" element={<SettingsPanel />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

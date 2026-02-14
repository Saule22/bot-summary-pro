import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTrial } from "@/hooks/useTrial";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bot, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import TrialExpired from "@/pages/TrialExpired";

const AppLayout = () => {
  const { user, loading } = useAuth();
  const { isExpired, daysLeft, loading: trialLoading } = useTrial();

  if (loading || trialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Bot className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/landing" replace />;

  if (isExpired) return <TrialExpired />;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm">
            <SidebarTrigger />
            {daysLeft > 0 && (
              <Badge variant="outline" className="gap-1.5 border-primary/30 text-primary">
                <Clock className="h-3 w-3" />
                Пробный период: {daysLeft} {daysLeft === 1 ? "день" : daysLeft < 5 ? "дня" : "дней"}
              </Badge>
            )}
          </header>
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;

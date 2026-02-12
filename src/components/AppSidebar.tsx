import {
  LayoutDashboard,
  Radio,
  Tag,
  Sparkles,
  MessageSquare,
  CalendarDays,
  Palette,
  Bot,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Дашборд", url: "/", icon: LayoutDashboard },
  { title: "Каналы", url: "/channels", icon: Radio },
  { title: "Ключевые слова", url: "/keywords", icon: Tag },
  { title: "Дайджест", url: "/digest", icon: Sparkles },
  { title: "Сообщения", url: "/messages", icon: MessageSquare },
  { title: "Контент-план", url: "/content-plan", icon: CalendarDays },
  { title: "Мой стиль", url: "/my-style", icon: Palette },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-sidebar-foreground">
              AI Content Bot
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          onClick={() => supabase.auth.signOut()}
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-2">Выход</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

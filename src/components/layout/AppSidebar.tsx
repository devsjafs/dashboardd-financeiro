import { LayoutDashboard, Receipt, DollarSign, FileText, Mail, Settings, RefreshCw, LogOut, AlertTriangle } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  minRole: AppRole; // minimum role required
}

const roleLevel: Record<AppRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

const items: MenuItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, minRole: "viewer" },
  { title: "Pagamentos", url: "/pagamentos", icon: Receipt, minRole: "member" },
  { title: "Boletos", url: "/boletos", icon: FileText, minRole: "member" },
  { title: "Inadimplência", url: "/inadimplencia", icon: AlertTriangle, minRole: "member" },
  { title: "Comissões", url: "/comissoes", icon: DollarSign, minRole: "admin" },
  { title: "Reajustes", url: "/reajustes", icon: RefreshCw, minRole: "admin" },
  { title: "Emails", url: "/emails", icon: Mail, minRole: "member" },
  { title: "Configurações", url: "/configuracoes", icon: Settings, minRole: "admin" },
];

function getInitial(profile: { display_name: string | null } | null, email?: string): string {
  if (profile?.display_name) return profile.display_name.charAt(0).toUpperCase();
  if (email) return email.charAt(0).toUpperCase();
  return "?";
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, user, profile, userRole } = useAuth();
  const navigate = useNavigate();

  const initial = getInitial(profile, user?.email ?? undefined);
  const currentLevel = roleLevel[userRole || "viewer"];

  const visibleItems = items.filter(item => currentLevel >= roleLevel[item.minRole]);

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        isActive
                          ? "bg-muted text-primary font-medium"
                          : "hover:bg-muted/50"
                      }
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 space-y-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate("/configuracoes")}
              className="flex items-center gap-3 w-full rounded-md p-2 hover:bg-muted/50 transition-colors"
              aria-label="Abrir configurações"
            >
              <Avatar className="h-8 w-8 shrink-0">
                {profile?.avatar_url && (
                  <AvatarImage src={profile.avatar_url} alt={profile?.display_name || ""} />
                )}
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  {initial}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <span className="text-sm truncate text-foreground">
                  {profile?.display_name || user?.email}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Configurações</TooltipContent>
        </Tooltip>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {!collapsed && "Sair"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

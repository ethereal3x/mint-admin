import { useState } from "react"
import { Navigate, NavLink, Outlet } from "react-router"
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "~/components/ui/sidebar"
import { useAuth } from "~/hooks/use-auth"
import { Button } from "~/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { ProfileDialog } from "~/components/profile-dialog"
import { ChartNoAxesCombined, LogOut, MessageSquare } from "lucide-react"
import defaultAvatar from "~/svg/default.svg"

const NAV_ITEMS = [
  { to: "/chat", label: "对话调试", icon: MessageSquare },
  { to: "/configs", label: "模型配置", icon: ChartNoAxesCombined },
]

export default function ProtectedLayout() {
  const { user, loading, logout } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex h-svh items-center justify-center">
        <span className="text-muted-foreground text-sm">加载中...</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <Sidebar>
        <SidebarContent className="text-base">
          <SidebarGroup>
            <SidebarGroupLabel className="mb-3 border-b border-sidebar-border pb-3 text-base">「MINT」大模型控制台</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {NAV_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild className="text-base">
                      <NavLink to={item.to}>
                        <item.icon className="size-5" />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <div className="mt-auto border-t p-2">
          <div className="flex w-full items-center gap-2 rounded-md px-2 py-1.5">
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={user.avatar_url || defaultAvatar} />
              <AvatarFallback>
                <img src={defaultAvatar} alt="" className="size-full" />
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="flex-1 truncate text-left transition-colors hover:opacity-80"
            >
              <p className="text-base font-medium truncate">{user.display_name}</p>
              <p className="text-sm text-muted-foreground truncate">@{user.user_id}</p>
            </button>
            <Button variant="ghost" size="icon" onClick={logout} title="退出登录">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </Sidebar>
      <SidebarInset className="overflow-hidden md:pl-[--sidebar-width] transition-[padding] duration-200">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </SidebarInset>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </SidebarProvider>
  )
}

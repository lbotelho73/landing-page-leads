
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { MainNav } from "./MainNav";
import { SidebarNav } from "./SidebarNav";
import { UserNav } from "./UserNav";
import { Toaster } from "sonner";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="border-r bg-sidebar">
          <SidebarHeader className="flex h-14 items-center border-b px-4">
            <span className="font-semibold text-lg">Sensual Flow</span>
          </SidebarHeader>
          <SidebarContent>
            <SidebarNav />
          </SidebarContent>
          <SidebarFooter className="border-t p-4">
            <div className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Sensual Flow Clinic
            </div>
          </SidebarFooter>
        </Sidebar>
        <div className="flex-1 flex flex-col">
          <header className="flex h-14 lg:h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger />
            <MainNav />
            <div className="ml-auto flex items-center gap-2">
              <UserNav />
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-muted/20">
            {children}
          </main>
        </div>
      </div>
      <Toaster position="top-right" />
    </SidebarProvider>
  );
}

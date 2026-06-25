import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { SidebarNav } from "./AppSidebar";
import { APP_TITLE } from "@/const";

/**
 * Layout do app: sidebar FIXA à esquerda no desktop (sempre aberta, sem
 * esconder no hover) e drawer no mobile. O conteúdo respira (padding crescente)
 * e fica deslocado pela largura da sidebar (md:ml-60).
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar fixa — desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r md:block">
        <SidebarNav />
      </aside>

      {/* Topo com menu — mobile */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <PanelLeft className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0">
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <span className="text-sm font-semibold">{APP_TITLE}</span>
      </header>

      {/* Conteúdo */}
      <main className="p-4 md:ml-60 md:p-6 lg:p-8">{children}</main>
    </div>
  );
}

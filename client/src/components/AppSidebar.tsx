import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Globe,
  Package,
  Images,
  Users,
  TrendingUp,
  BarChart3,
  Settings,
  ShieldCheck,
  ChevronsUpDown,
  LogOut,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { APP_LOGO, APP_TITLE } from "@/const";

/** Largura fixa da sidebar (use em md:ml-60 no conteúdo). */
export const SIDEBAR_WIDTH = "15rem";

type NavItem = { icon: LucideIcon; label: string; path: string; adminOnly?: boolean };

/** Itens agrupados em módulos. Cada grupo é dividido por um Separator na sidebar. */
const menuGroups: { title?: string; items: NavItem[] }[] = [
  {
    items: [{ icon: LayoutDashboard, label: "Dashboard", path: "/" }],
  },
  {
    title: "Comercial",
    items: [
      { icon: FileText, label: "Importações", path: "/importacoes" },
      { icon: ShoppingCart, label: "Pedidos", path: "/pedidos" },
      { icon: Globe, label: "Vendas Externas", path: "/vendas-externas" },
    ],
  },
  {
    title: "Catálogo",
    items: [
      { icon: Package, label: "Produtos", path: "/produtos" },
      { icon: Images, label: "Galeria", path: "/galeria" },
      { icon: Users, label: "Fornecedores", path: "/fornecedores" },
      { icon: TrendingUp, label: "Estoque", path: "/estoque" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
      { icon: Settings, label: "Configurações", path: "/configuracoes" },
      { icon: ShieldCheck, label: "Usuários", path: "/configuracoes/usuarios", adminOnly: true },
    ],
  },
];

function isActivePath(location: string, path: string) {
  if (path === "/") return location === "/";
  return location === path || location.startsWith(path + "/");
}

/**
 * Conteúdo da sidebar (logo + navegação + rodapé). Reutilizado tanto na barra
 * fixa do desktop quanto no drawer mobile. `onNavigate` fecha o drawer ao clicar.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const go = (path: string) => {
    setLocation(path);
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col bg-background text-muted-foreground">
      {/* Logo + título */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b px-3">
        <img
          src={APP_LOGO}
          alt={APP_TITLE}
          className="size-7 shrink-0 rounded-md object-cover ring-1 ring-border"
        />
        <span className="truncate text-sm font-semibold tracking-tight text-foreground">
          {APP_TITLE}
        </span>
      </div>

      {/* Navegação */}
      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="flex flex-col gap-1">
          {menuGroups.map((group, groupIndex) => {
            const visible = group.items.filter(
              (item) => !item.adminOnly || user?.role === "admin"
            );
            if (visible.length === 0) return null;

            return (
              <div key={groupIndex} className="flex flex-col gap-1">
                {groupIndex > 0 && <Separator className="my-2" />}
                {group.title && (
                  <p className="px-2.5 pb-0.5 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    {group.title}
                  </p>
                )}
                {visible.map((item) => {
                  const active = isActivePath(location, item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => go(item.path)}
                      className={cn(
                        "flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors hover:bg-muted hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active ? "bg-muted text-primary" : "text-muted-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Rodapé: tema + conta */}
      <div className="flex flex-col gap-1 border-t p-2">
        <button
          onClick={toggleTheme}
          className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span>{theme === "dark" ? "Tema claro" : "Tema escuro"}</span>
        </button>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger className="w-full rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="flex h-11 w-full items-center gap-2 rounded-md px-2 transition-colors hover:bg-muted">
              <Avatar className="size-7 shrink-0 border">
                <AvatarFallback className="text-xs font-medium">
                  {user?.name?.charAt(0).toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col items-start overflow-hidden text-left">
                <span className="w-full truncate text-sm font-medium leading-tight text-foreground">
                  {user?.name ?? "-"}
                </span>
                <span className="w-full truncate text-xs leading-tight text-muted-foreground">
                  {user?.email ?? "-"}
                </span>
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" sideOffset={8} className="w-56">
            <div className="flex items-center gap-2 p-2">
              <Avatar className="size-7 border">
                <AvatarFallback className="text-xs font-medium">
                  {user?.name?.charAt(0).toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-sm font-medium">{user?.name ?? "-"}</span>
                <span className="truncate text-xs text-muted-foreground">{user?.email ?? "-"}</span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

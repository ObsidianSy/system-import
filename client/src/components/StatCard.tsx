import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Tons semânticos de métrica. Centraliza as cores de status que hoje estão
 * hardcoded e espalhadas pelas páginas (text-green-600, text-yellow-600, ...).
 * Fonte única de verdade — mudar a cor de "perigo" muda em todo o sistema.
 */
export type StatTone = "default" | "info" | "success" | "warning" | "danger";

const toneValue: Record<StatTone, string> = {
  default: "text-foreground",
  info: "text-blue-600 dark:text-blue-400",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
};

const toneIcon: Record<StatTone, string> = {
  default: "text-muted-foreground",
  info: "text-blue-600 dark:text-blue-400",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
};

interface StatCardProps {
  /** Rótulo curto (label, 12px maiúsculo). */
  label: string;
  /** Valor da métrica (número/moeda). Renderiza com `tabular-nums`. */
  value: ReactNode;
  /** Ícone Lucide à direita. */
  icon: LucideIcon;
  /** Cor semântica do valor + ícone. */
  tone?: StatTone;
  /** Sub-linha de contexto opcional (ex.: "12 em trânsito", "+5% vs mês anterior"). */
  hint?: ReactNode;
}

/**
 * Card de métrica compacto. Substitui os blocos `<Card><CardContent>...` quase
 * idênticos repetidos nas páginas de listagem. Escala de fonte e números
 * tabulares conforme DESIGN.md (label 12px, valor com tabular-nums).
 */
export function StatCard({ label, value, icon: Icon, tone = "default", hint }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground truncate">
              {label}
            </p>
            <p className={cn("text-lg font-bold tabular-nums mt-0.5", toneValue[tone])}>{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-0.5 truncate">{hint}</p>}
          </div>
          <Icon className={cn("h-5 w-5 shrink-0", toneIcon[tone])} />
        </div>
      </CardContent>
    </Card>
  );
}

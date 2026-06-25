import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/**
 * Tons semânticos de métrica. Centraliza as cores de status (antes hardcoded e
 * espalhadas pelas páginas). Fonte única de verdade.
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
  /** Rótulo da métrica. */
  label: string;
  /** Valor em destaque (número/moeda). */
  value: ReactNode;
  /** Ícone Lucide discreto (opcional). */
  icon?: LucideIcon;
  /** Cor semântica do valor + ícone. */
  tone?: StatTone;
  /** Sub-linha de contexto (usada quando NÃO há barra de progresso). */
  hint?: ReactNode;
  /**
   * 0–100. Quando definido, mostra barra de progresso + percentual.
   * Use APENAS quando a métrica é proporção de um todo (ex.: estoque baixo /
   * total de produtos). NÃO invente um limite para números absolutos.
   */
  percentage?: number;
  /** Texto à direita do percentual (ex.: "de 150 produtos"). */
  limitLabel?: ReactNode;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
  percentage,
  limitLabel,
}: StatCardProps) {
  const hasProgress = typeof percentage === "number";
  const pct = hasProgress ? Math.min(100, Math.max(0, percentage as number)) : 0;

  return (
    <Card className="py-4">
      <CardContent className="px-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          {Icon && <Icon className={cn("h-4 w-4 shrink-0", toneIcon[tone])} />}
        </div>

        <p className={cn("mt-1 text-2xl font-semibold tabular-nums", toneValue[tone])}>{value}</p>

        {hasProgress ? (
          <>
            <Progress value={pct} className="mt-3 h-2" />
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="font-medium tabular-nums text-primary">{pct.toFixed(1)}%</span>
              {limitLabel && <span className="text-muted-foreground">{limitLabel}</span>}
            </div>
          </>
        ) : (
          hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}

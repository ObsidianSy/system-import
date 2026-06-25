import { cn } from "@/lib/utils";

/**
 * Status de importação — fonte única de verdade para label + cor.
 * Antes estava duplicado (statusLabels + statusColors) em Importacoes.tsx e
 * DetalhesImportacao.tsx, com variants do Badge que não distinguiam bem os
 * estados. Cores semânticas centralizadas aqui (e em um só lugar).
 */
export const IMPORT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  in_transit: "Em Trânsito",
  customs: "Na Alfândega",
  delivered: "Entregue",
  cancelled: "Cancelada",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  in_transit: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  customs: "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-300",
  delivered: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

export function ImportStatusBadge({ status, className }: { status: string; className?: string }) {
  const label = IMPORT_STATUS_LABELS[status] ?? status;
  const tone = STATUS_CLASS[status] ?? "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tone,
        className
      )}
    >
      {label}
    </span>
  );
}

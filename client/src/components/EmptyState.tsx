import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  /** Ícone Lucide ilustrativo (opcional). */
  icon?: LucideIcon;
  /** Mensagem principal — curta e direta. */
  title: string;
  /** Linha de apoio opcional (o que fazer / por que está vazio). */
  description?: ReactNode;
  /** Ação opcional (ex.: botão "Criar primeiro produto" ou "Limpar filtros"). */
  action?: ReactNode;
}

/**
 * Estado vazio padrão para listas/tabelas sem resultado. Substitui os blocos
 * "Nenhum X encontrado" montados ad-hoc em cada página, dando um vazio
 * consistente e composto (ícone + título + apoio + ação) em vez de tela em branco.
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      {Icon && (
        <div className="mb-3 rounded-full bg-muted p-3">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

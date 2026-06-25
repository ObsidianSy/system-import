import { type ReactNode } from "react";

interface PageHeaderProps {
  /** Título da página (heading, 24px). */
  title: string;
  /** Linha de contexto abaixo do título (contadores, resumo). */
  description?: ReactNode;
  /** Ações à direita (botões). Apenas 1 deve ser primário (Regra da Voz Única). */
  actions?: ReactNode;
}

/**
 * Cabeçalho padrão de página: título + descrição à esquerda, ações à direita.
 * Substitui o `<div className="flex items-center justify-between">` repetido em
 * toda página de listagem. Tokens e escala conforme DESIGN.md.
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5 truncate">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

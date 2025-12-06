import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Package, AlertTriangle } from "lucide-react";

interface StockBadgeProps {
  stock: number;
  label?: string;
  variant?: "default" | "compact";
  lowStockThreshold?: number;
  className?: string;
}

/**
 * Reusable stock badge component with consistent styling and logic.
 * Shows stock quantity with color-coded status (success/warning/danger).
 * 
 * @param stock - Current stock quantity
 * @param label - Optional label prefix (e.g., "Estoque Real")
 * @param variant - Display variant (default shows label, compact shows icon only)
 * @param lowStockThreshold - Threshold for low stock warning (default: 5)
 * @param className - Additional CSS classes
 */
export function StockBadge({ 
  stock, 
  label, 
  variant = "default",
  lowStockThreshold = 5,
  className 
}: StockBadgeProps) {
  const isOutOfStock = stock === 0;
  const isLowStock = stock > 0 && stock <= lowStockThreshold;

  const badgeVariant = isOutOfStock 
    ? "destructive" 
    : isLowStock 
    ? "secondary" 
    : "default";

  const Icon = isOutOfStock || isLowStock ? AlertTriangle : Package;

  if (variant === "compact") {
    return (
      <Badge variant={badgeVariant} className={cn("gap-1", className)}>
        <Icon className="h-3 w-3" />
        {stock}
      </Badge>
    );
  }

  return (
    <Badge variant={badgeVariant} className={cn("gap-1", className)}>
      <Icon className="h-3 w-3" />
      {label && <span>{label}:</span>}
      <span className="font-semibold">{stock}</span>
    </Badge>
  );
}

interface StockDisplayProps {
  stock: number;
  localStock?: number;
  showComparison?: boolean;
  className?: string;
}

/**
 * Enhanced stock display that can show both external and local stock.
 * Useful for pages that need to compare stock sources.
 */
export function StockDisplay({ 
  stock, 
  localStock, 
  showComparison = false,
  className 
}: StockDisplayProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <StockBadge stock={stock} label="Estoque Real" />
      {showComparison && localStock !== undefined && (
        <Badge variant="outline" className="gap-1">
          <Package className="h-3 w-3" />
          Local: {localStock}
        </Badge>
      )}
    </div>
  );
}

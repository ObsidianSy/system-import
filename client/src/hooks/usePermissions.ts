import { trpc } from "@/lib/trpc";

export function usePermissions() {
  const { data: user } = trpc.auth.me.useQuery();

  const canViewCostUSD = user?.role === "admin" || user?.canViewCostUSD || false;
  const canViewCostBRL = user?.role === "admin" || user?.canViewCostBRL || false;
  const canViewImportTaxes = user?.role === "admin" || user?.canViewImportTaxes || false;
  const canEditProducts = user?.role === "admin" || user?.canEditProducts || false;
  const canEditImportations = user?.role === "admin" || user?.canEditImportations || false;
  const canManageUsers = user?.role === "admin" || user?.canManageUsers || false;
  const isAdmin = user?.role === "admin";

  return {
    canViewCostUSD,
    canViewCostBRL,
    canViewImportTaxes,
    canEditProducts,
    canEditImportations,
    canManageUsers,
    isAdmin,
    user,
  };
}

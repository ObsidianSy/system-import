import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Plus, FileText, Package, DollarSign, FileSpreadsheet, Search, Filter, X, TrendingUp, ShoppingCart, Clock } from "lucide-react";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocation } from "wouter";
import { usePermissions } from "@/hooks/usePermissions";

const statusLabels: Record<string, string> = {
  all: "Todos os Status",
  pending: "Pendente",
  in_transit: "Em Trânsito",
  customs: "Na Alfândega",
  delivered: "Entregue",
  cancelled: "Cancelada",
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  in_transit: "default",
  customs: "outline",
  delivered: "default",
  cancelled: "destructive",
};

export default function Importacoes() {
  const [, setLocation] = useLocation();
  const { data: importations, isLoading } = trpc.importations.list.useQuery();
  const { data: productsWithAggregates, isLoading: isLoadingProducts } = trpc.products.listWithAggregates.useQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { canViewCostUSD, canViewCostBRL, canEditImportations } = usePermissions();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const filteredImportations = useMemo(() => {
    if (!importations) return [];
    return importations.filter((imp) => {
      const matchesSearch = 
        (imp.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (imp.supplierId?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false); // Ideally search by supplier name
      
      const matchesStatus = statusFilter === "all" || imp.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [importations, searchTerm, statusFilter]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    if (!importations) return { totalUSD: 0, totalBRL: 0, totalImports: 0, activeImports: 0 };
    
    const totalUSD = importations.reduce((sum, imp) => sum + imp.totalUSD, 0);
    const totalBRL = importations.reduce((sum, imp) => sum + imp.totalCostBRL, 0);
    const activeImports = importations.filter(imp => 
      imp.status === 'pending' || imp.status === 'in_transit' || imp.status === 'customs'
    ).length;

    return {
      totalUSD,
      totalBRL,
      totalImports: importations.length,
      activeImports
    };
  }, [importations]);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Importações</h1>
            <p className="text-xs text-muted-foreground">
              Gerencie todas as suas importações
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLocation("/importacoes/importar-excel")}
              disabled={!canEditImportations}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Importar Excel
            </Button>
            <Button 
              size="sm" 
              onClick={() => setLocation("/importacoes/nova")}
              disabled={!canEditImportations}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Importação
            </Button>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        {isLoading ? (
          <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
            {canViewCostUSD && (
              <Card>
                <CardContent className="p-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Total USD</p>
                      <p className="text-lg font-bold mt-0.5">
                        ${stats.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            )}

            {canViewCostBRL && (
              <Card>
                <CardContent className="p-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Total BRL</p>
                      <p className="text-sm font-bold text-green-600 mt-0.5">
                        {formatCurrency(stats.totalBRL)}
                      </p>
                    </div>
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Importações</p>
                    <p className="text-lg font-bold mt-0.5">
                      {stats.totalImports}
                    </p>
                  </div>
                  <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Em Andamento</p>
                    <p className="text-lg font-bold text-blue-600 mt-0.5">
                      {stats.activeImports}
                    </p>
                  </div>
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <CardTitle className="text-sm">Lista de Importações</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por fatura..."
                    className="pl-8 h-9 w-full sm:w-[200px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-full sm:w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(searchTerm || statusFilter !== "all") && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}
                    title="Limpar filtros"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredImportations.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fatura</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      {canViewCostUSD && <TableHead className="text-right">Total USD</TableHead>}
                      {canViewCostBRL && <TableHead className="text-right">Total BRL</TableHead>}
                      {canViewCostBRL && <TableHead className="text-right">Taxa Câmbio</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredImportations.map((importation) => (
                      <TableRow
                        key={importation.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setLocation(`/importacoes/${importation.id}`)}
                      >
                        <TableCell className="font-medium">
                          {importation.invoiceNumber || "-"}
                        </TableCell>
                        <TableCell>{formatDate(importation.importDate)}</TableCell>
                        <TableCell>
                          <Badge variant={statusColors[importation.status]}>
                            {statusLabels[importation.status]}
                          </Badge>
                        </TableCell>
                        {canViewCostUSD && (
                          <TableCell className="text-right">
                            ${importation.totalUSD.toFixed(2)}
                          </TableCell>
                        )}
                        {canViewCostBRL && (
                          <TableCell className="text-right">
                            {formatCurrency(importation.totalCostBRL)}
                          </TableCell>
                        )}
                        {canViewCostBRL && (
                          <TableCell className="text-right">
                            R$ {importation.exchangeRate.toFixed(2)}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma importação encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== "all" 
                    ? "Tente ajustar seus filtros de busca" 
                    : "Comece criando sua primeira importação"}
                </p>
                {searchTerm || statusFilter !== "all" ? (
                  <Button variant="outline" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}>
                    Limpar Filtros
                  </Button>
                ) : (
                  <Button onClick={() => setLocation("/importacoes/nova")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Importação
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seção de Produtos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingProducts ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : productsWithAggregates && productsWithAggregates.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Foto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Estoque Atual</TableHead>
                      <TableHead className="text-right">Total em Trânsito</TableHead>
                      <TableHead className="text-right">Total em Pedido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsWithAggregates.map((product) => (
                      <TableRow
                        key={product.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setLocation(`/produtos/${product.id}`)}
                      >
                        <TableCell>
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-xs">{product.sku || "-"}</div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                            {product.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={product.currentStock <= (product.minStock || 0) ? "text-red-600 font-semibold" : ""}>
                            {product.currentStock}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {product.totalInTransit > 0 ? (
                            <span className="text-blue-600 font-medium">{product.totalInTransit}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.totalInOrders > 0 ? (
                            <span className="text-yellow-600 font-medium">{product.totalInOrders}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  Comece cadastrando produtos no sistema
                </p>
                <Button onClick={() => setLocation("/produtos/novo")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Produto
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


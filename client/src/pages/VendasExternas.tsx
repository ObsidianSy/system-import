import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ArrowLeft, Package, TrendingUp, TrendingDown, Trophy, Filter, X } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { useLocation } from "wouter";

export default function VendasExternas() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  // Get all products with SKUs
  const { data: products } = trpc.products.list.useQuery();

  const allSkus = useMemo(() => {
    if (!products) return [];
    return products.filter(p => p.sku).map(p => p.sku!);
  }, [products]);

  // Fetch sales data for all SKUs
  const { data: externalData, isLoading } = trpc.external.getMultipleSkusData.useQuery(
    { skus: allSkus },
    { enabled: allSkus.length > 0 }
  );

  // Filter and sort data
  const filteredData = useMemo(() => {
    if (!externalData) return [];
    
    let filtered = externalData;
    
    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.sku.toLowerCase().includes(search) ||
        item.produto?.nome?.toLowerCase().includes(search) ||
        item.produto?.categoria?.toLowerCase().includes(search)
      );
    }
    
    return filtered;
  }, [externalData, searchTerm]);

  // Top sellers (last 30 days)
  const topSellers = useMemo(() => {
    if (!externalData) return [];
    return [...externalData]
      .filter(item => (item.vendas?.vendas_30d || 0) > 0)
      .sort((a, b) => (b.vendas?.vendas_30d || 0) - (a.vendas?.vendas_30d || 0))
      .slice(0, 5);
  }, [externalData]);

  // Calculate totals
  const totals = useMemo(() => {
    if (!externalData) return { total30d: 0, totalUnits: 0, avgStock: 0 };
    
    return {
      total30d: externalData.reduce((sum, item) => sum + (item.vendas?.vendas_30d || 0), 0),
      totalUnits: externalData.reduce((sum, item) => sum + (item.vendas?.total_unidades || 0), 0),
      avgStock: Math.round(externalData.reduce((sum, item) => sum + (item.estoque?.quantidade || 0), 0) / externalData.length),
    };
  }, [externalData]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/home")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Vendas Externas</h1>
            <p className="text-muted-foreground">
              Performance de vendas do sistema externo
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vendas (30 dias)</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totals.total30d}</div>
                <p className="text-xs text-muted-foreground">
                  Total de unidades vendidas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Histórico</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totals.totalUnits}</div>
                <p className="text-xs text-muted-foreground">
                  Todas as vendas registradas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estoque Médio</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totals.avgStock}</div>
                <p className="text-xs text-muted-foreground">
                  Média de unidades em estoque
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Top Sellers */}
        {!isLoading && topSellers.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <CardTitle>Top 5 Mais Vendidos (30 dias)</CardTitle>
              </div>
              <CardDescription>
                Produtos com melhor performance no último mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topSellers.map((item, index) => (
                  <div
                    key={item.sku}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{item.produto?.nome || item.sku}</div>
                        <div className="text-sm text-muted-foreground">
                          SKU: {item.sku} • {item.produto?.categoria || "-"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {item.vendas?.vendas_30d}
                      </div>
                      <div className="text-xs text-muted-foreground">unidades</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Produtos</CardTitle>
            <CardDescription>
              Visualize vendas e estoque de todos os produtos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por SKU, produto ou categoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-right">Vendas 7d</TableHead>
                    <TableHead className="text-right">Vendas 30d</TableHead>
                    <TableHead className="text-right">Vendas 90d</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Custo Médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => {
                    const vendas30d = item.vendas?.vendas_30d || 0;
                    const isTopSeller = vendas30d >= 10;
                    
                    return (
                      <TableRow key={item.sku}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="font-medium">
                              {item.produto?.nome || "-"}
                            </div>
                            {isTopSeller && (
                              <Trophy className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.sku}</Badge>
                        </TableCell>
                        <TableCell>{item.produto?.categoria || "-"}</TableCell>
                        <TableCell className="text-right font-medium">
                          {item.estoque?.quantidade ?? "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {item.vendas?.vendas_7d || 0}
                            {(item.vendas?.vendas_7d || 0) > 0 && (
                              <TrendingUp className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <div className="flex items-center justify-end gap-1">
                            {vendas30d}
                            {vendas30d > 0 && (
                              <TrendingUp className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.vendas?.vendas_90d || 0}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {item.vendas?.total_unidades || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.estoque?.custo_medio 
                            ? formatCurrency(item.estoque.custo_medio)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {searchTerm 
                  ? `Nenhum produto encontrado para "${searchTerm}"`
                  : "Nenhum dado disponível"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Estoque() {
  const { data: products, isLoading } = trpc.products.list.useQuery();
  const { data: stats } = trpc.dashboard.stats.useQuery();

  const lowStockProducts = products?.filter(p => p.currentStock <= (p.minStock ?? 0)) || [];
  const normalStockProducts = products?.filter(p => p.currentStock > (p.minStock ?? 0)) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Controle de Estoque</h1>
          <p className="text-muted-foreground">
            Acompanhe os níveis de estoque de todos os produtos
          </p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
              <p className="text-xs text-muted-foreground">
                Produtos cadastrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unidades em Estoque</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalStock || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total de unidades
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {stats?.lowStockProducts || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Produtos abaixo do mínimo
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Produtos com Estoque Baixo */}
        {lowStockProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Produtos com Estoque Baixo
              </CardTitle>
              <CardDescription>
                Produtos que atingiram ou estão abaixo do estoque mínimo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Estoque Atual</TableHead>
                      <TableHead className="text-right">Estoque Mínimo</TableHead>
                      <TableHead className="text-right">Nível</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockProducts.map((product) => {
                      const percentage = ((product.currentStock / (product.minStock || 1)) * 100);
                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="h-10 w-10 rounded object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium">{product.name}</div>
                                {product.category && (
                                  <div className="text-sm text-muted-foreground">
                                    {product.category}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{product.sku || "-"}</TableCell>
                          <TableCell className="text-right font-medium">
                            {product.currentStock}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.minStock ?? 0}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <Progress value={Math.min(percentage, 100)} className="w-20 h-2" />
                              <span className="text-sm text-muted-foreground">
                                {percentage.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive" className="gap-1">
                              <TrendingDown className="h-3 w-3" />
                              Crítico
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Todos os Produtos */}
        <Card>
          <CardHeader>
            <CardTitle>Estoque Geral</CardTitle>
            <CardDescription>
              Visualização completa do estoque de todos os produtos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : products && products.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Estoque Atual</TableHead>
                    <TableHead className="text-right">Estoque Mínimo</TableHead>
                    <TableHead className="text-right">Disponibilidade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const isLowStock = product.currentStock <= (product.minStock ?? 0);
                    const percentage = product.minStock 
                      ? ((product.currentStock / product.minStock) * 100)
                      : 100;
                    
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-10 w-10 rounded object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{product.name}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{product.sku || "-"}</TableCell>
                        <TableCell>{product.category || "-"}</TableCell>
                        <TableCell className="text-right font-medium">
                          {product.currentStock}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.minStock ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Progress 
                              value={Math.min(percentage, 100)} 
                              className="w-20 h-2"
                            />
                            <span className="text-sm text-muted-foreground">
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isLowStock ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Baixo
                            </Badge>
                          ) : (
                            <Badge variant="default" className="gap-1">
                              <TrendingUp className="h-3 w-3" />
                              Normal
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
                <p className="text-muted-foreground">
                  Cadastre produtos para visualizar o estoque
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


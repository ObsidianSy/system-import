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
import { DollarSign, TrendingUp, Package, Calendar } from "lucide-react";

export default function Relatorios() {
  const { data: importations, isLoading: loadingImportations } = trpc.importations.list.useQuery();
  const { data: products, isLoading: loadingProducts } = trpc.products.list.useQuery();
  const { data: suppliers, isLoading: loadingSuppliers } = trpc.suppliers.list.useQuery();
  const { data: stats } = trpc.dashboard.stats.useQuery();

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

  // Calcular estatísticas
  const totalImportedUSD = importations?.reduce((sum, imp) => sum + imp.totalUSD, 0) || 0;
  const totalImportedBRL = importations?.reduce((sum, imp) => sum + imp.totalCostBRL, 0) || 0;
  const averageExchangeRate = importations && importations.length > 0
    ? importations.reduce((sum, imp) => sum + imp.exchangeRate, 0) / importations.length
    : 0;

  // Importações por fornecedor
  const importationsBySupplier = suppliers?.map(supplier => {
    const supplierImportations = importations?.filter(imp => imp.supplierId === supplier.id) || [];
    const totalValue = supplierImportations.reduce((sum, imp) => sum + imp.totalCostBRL, 0);
    return {
      supplier: supplier.name,
      count: supplierImportations.length,
      totalValue,
    };
  }).filter(item => item.count > 0)
    .sort((a, b) => b.totalValue - a.totalValue) || [];

  // Produtos mais importados
  const productImportCounts = new Map<string, { name: string; quantity: number; value: number }>();
  
  importations?.forEach((importation: any) => {
    importation.items?.forEach((item: any) => {
      const existing = productImportCounts.get(item.productName) || { name: item.productName, quantity: 0, value: 0 };
      productImportCounts.set(item.productName, {
        name: item.productName,
        quantity: existing.quantity + item.quantity,
        value: existing.value + item.totalCostBRL,
      });
    });
  });

  const topProducts = Array.from(productImportCounts.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">
            Análises e estatísticas das importações
          </p>
        </div>

        {/* Cards de Resumo Geral */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Importado (USD)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalImportedUSD.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Em {importations?.length || 0} importações
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custo Total (BRL)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalImportedBRL)}</div>
              <p className="text-xs text-muted-foreground">
                Incluindo impostos e frete
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa Média de Câmbio</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {averageExchangeRate.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                USD → BRL
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produtos Únicos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{productImportCounts.size}</div>
              <p className="text-xs text-muted-foreground">
                Diferentes produtos importados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Importações por Fornecedor */}
        <Card>
          <CardHeader>
            <CardTitle>Importações por Fornecedor</CardTitle>
            <CardDescription>
              Ranking de fornecedores por volume de importações
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSuppliers || loadingImportations ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : importationsBySupplier.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Nº de Importações</TableHead>
                    <TableHead className="text-right">Valor Total (BRL)</TableHead>
                    <TableHead className="text-right">Valor Médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importationsBySupplier.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.supplier}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{item.count}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.totalValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.totalValue / item.count)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma importação registrada
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 10 Produtos Mais Importados */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Produtos Mais Importados</CardTitle>
            <CardDescription>
              Produtos com maior volume de importação
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingImportations ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : topProducts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Posição</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Quantidade Total</TableHead>
                    <TableHead className="text-right">Valor Total (BRL)</TableHead>
                    <TableHead className="text-right">Custo Médio Unit.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((product, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant={index < 3 ? "default" : "outline"}>
                          {index + 1}º
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          {product.quantity}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(product.value)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(product.value / product.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum produto importado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Histórico de Importações */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico Recente de Importações</CardTitle>
            <CardDescription>
              Últimas importações registradas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingImportations ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : importations && importations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Fatura</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total USD</TableHead>
                    <TableHead className="text-right">Câmbio</TableHead>
                    <TableHead className="text-right">Custo BRL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importations.slice(0, 10).map((importation) => (
                    <TableRow key={importation.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(importation.importDate)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {importation.invoiceNumber || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {importation.status === "pending" && "Pendente"}
                          {importation.status === "in_transit" && "Em Trânsito"}
                          {importation.status === "customs" && "Alfândega"}
                          {importation.status === "delivered" && "Entregue"}
                          {importation.status === "cancelled" && "Cancelada"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        ${importation.totalUSD.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {importation.exchangeRate.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(importation.totalCostBRL)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma importação registrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


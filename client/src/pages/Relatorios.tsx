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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, TrendingUp, Package, Calendar, Filter, X, Percent, Truck, Scale, PieChart as PieChartIcon, BarChart as BarChartIcon } from "lucide-react";
import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function Relatorios() {
  const { data: importations, isLoading: loadingImportations } = trpc.importations.list.useQuery();
  const { data: products, isLoading: loadingProducts } = trpc.products.list.useQuery();
  const { data: suppliers, isLoading: loadingSuppliers } = trpc.suppliers.list.useQuery();
  
  // Filtros de data
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Filtrar importações
  const filteredImportations = useMemo(() => {
    if (!importations) return [];
    return importations.filter(imp => {
      if (!startDate && !endDate) return true;
      const impDate = new Date(imp.importDate);
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date(8640000000000000);
      // Ajustar end date para o final do dia
      end.setHours(23, 59, 59, 999);
      return impDate >= start && impDate <= end;
    });
  }, [importations, startDate, endDate]);

  // Calcular estatísticas de Estoque (Atual - não depende de filtro de data)
  const stockStats = useMemo(() => {
    if (!products) return { totalValue: 0, totalQuantity: 0, averageUnitCost: 0 };
    const stats = products.reduce((acc, product) => {
      return {
        totalValue: acc.totalValue + (product.currentStock * ((product.averageCostBRL || 0) / 100)),
        totalQuantity: acc.totalQuantity + product.currentStock
      };
    }, { totalValue: 0, totalQuantity: 0 });

    return {
      ...stats,
      averageUnitCost: stats.totalQuantity > 0 ? stats.totalValue / stats.totalQuantity : 0
    };
  }, [products]);

  // Calcular estatísticas de Importação (Filtradas)
  const importStats = useMemo(() => {
    if (!filteredImportations.length) return {
      totalUSD: 0,
      totalBRL: 0,
      totalTaxes: 0,
      avgFreight: 0,
      avgExchange: 0,
      totalUnits: 0,
      averageUnitCost: 0
    };

    const totals = filteredImportations.reduce((acc, imp) => {
      // @ts-ignore - items are now included in the list query
      const impUnits = imp.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
      
      return {
        totalUSD: acc.totalUSD + imp.totalUSD,
        totalBRL: acc.totalBRL + imp.totalCostBRL,
        totalTaxes: acc.totalTaxes + (imp.importTax + imp.icms + imp.otherTaxes),
        totalFreight: acc.totalFreight + imp.freightUSD,
        totalExchange: acc.totalExchange + imp.exchangeRate,
        totalUnits: acc.totalUnits + impUnits
      };
    }, { totalUSD: 0, totalBRL: 0, totalTaxes: 0, totalFreight: 0, totalExchange: 0, totalUnits: 0 });

    return {
      totalUSD: totals.totalUSD,
      totalBRL: totals.totalBRL,
      totalTaxes: totals.totalTaxes,
      avgFreight: totals.totalFreight / filteredImportations.length,
      avgExchange: totals.totalExchange / filteredImportations.length,
      totalUnits: totals.totalUnits,
      averageUnitCost: totals.totalUnits > 0 ? totals.totalBRL / totals.totalUnits : 0
    };
  }, [filteredImportations]);

  // Importações por fornecedor (Filtradas)
  const importationsBySupplier = useMemo(() => {
    if (!suppliers || !filteredImportations) return [];
    return suppliers.map(supplier => {
      const supplierImportations = filteredImportations.filter(imp => imp.supplierId === supplier.id);
      const totalValue = supplierImportations.reduce((sum, imp) => sum + imp.totalCostBRL, 0);
      return {
        supplier: supplier.name,
        count: supplierImportations.length,
        totalValue,
      };
    }).filter(item => item.count > 0)
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [suppliers, filteredImportations]);

  // Produtos mais importados (Filtrados)
  const topProducts = useMemo(() => {
    if (!filteredImportations) return [];
    const productImportCounts = new Map<string, { name: string; quantity: number; value: number }>();
    
    filteredImportations.forEach((importation: any) => {
      importation.items?.forEach((item: any) => {
        const existing = productImportCounts.get(item.productName) || { name: item.productName, quantity: 0, value: 0 };
        productImportCounts.set(item.productName, {
          name: item.productName,
          quantity: existing.quantity + item.quantity,
          value: existing.value + item.totalCostBRL,
        });
      });
    });

    return Array.from(productImportCounts.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [filteredImportations]);

  // Dados para o gráfico de linha (Custos ao longo do tempo)
  const monthlyData = useMemo(() => {
    if (!filteredImportations) return [];
    const monthlyMap = new Map<string, { name: string; value: number }>();

    filteredImportations.forEach(imp => {
      const date = new Date(imp.importDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      const existing = monthlyMap.get(key) || { name: monthName, value: 0 };
      monthlyMap.set(key, {
        name: monthName,
        value: existing.value + imp.totalCostBRL
      });
    });

    return Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(entry => entry[1]);
  }, [filteredImportations]);

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-muted-foreground">
              Análises detalhadas de estoque e importações
            </p>
          </div>
          
          <div className="flex items-end gap-2 bg-card p-2 rounded-lg border shadow-sm">
            <div className="grid gap-1.5">
              <Label htmlFor="start-date" className="text-xs">Data Inicial</Label>
              <Input 
                id="start-date" 
                type="date" 
                className="h-8 w-[140px]" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="end-date" className="text-xs">Data Final</Label>
              <Input 
                id="end-date" 
                type="date" 
                className="h-8 w-[140px]" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {(startDate || endDate) && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearFilters} title="Limpar filtros">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Cards de Estoque Atual */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Valor Total em Estoque (Atual)</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(stockStats.totalValue)}</div>
              <p className="text-xs text-muted-foreground">
                Baseado no custo médio dos produtos
              </p>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Quantidade em Estoque (Atual)</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stockStats.totalQuantity.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Itens totais armazenados
              </p>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Custo Médio Unitário (Estoque)</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(stockStats.averageUnitCost)}</div>
              <p className="text-xs text-muted-foreground">
                Média ponderada do estoque atual
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Cards de Resumo de Importações (Filtrados) */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Importado</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatUSD(importStats.totalUSD)}</div>
              <p className="text-xs text-muted-foreground">
                {filteredImportations.length} importações no período
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custo Total (BRL)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(importStats.totalBRL)}</div>
              <p className="text-xs text-muted-foreground">
                Custo final com impostos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unidades Importadas</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{importStats.totalUnits.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total de itens recebidos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custo Médio Unitário</CardTitle>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(importStats.averageUnitCost)}</div>
              <p className="text-xs text-muted-foreground">
                Custo médio por item importado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Impostos</CardTitle>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(importStats.totalTaxes)}</div>
              <p className="text-xs text-muted-foreground">
                II + ICMS + Outros
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Frete Médio (USD)</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatUSD(importStats.avgFreight)}</div>
              <p className="text-xs text-muted-foreground">
                Por importação
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Câmbio Médio</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {importStats.avgExchange.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Média do período
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChartIcon className="h-5 w-5" />
                Evolução de Custos (BRL)
              </CardTitle>
              <CardDescription>
                Total gasto em importações por mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="value" fill="#8884d8" name="Total (BRL)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Distribuição por Fornecedor
              </CardTitle>
              <CardDescription>
                Valor total importado por fornecedor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={importationsBySupplier}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalValue"
                      nameKey="supplier"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {importationsBySupplier.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Importações por Fornecedor */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento por Fornecedor</CardTitle>
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


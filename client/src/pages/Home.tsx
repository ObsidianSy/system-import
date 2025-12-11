import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Package, TrendingUp, FileText, DollarSign, AlertTriangle, Activity, ShoppingCart, Users, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const { data: recentImportations } = trpc.importations.list.useQuery();
  const { data: products } = trpc.products.list.useQuery();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const recentActivity = recentImportations?.slice(0, 6) || [];

  // Preparar dados para gráfico de estoque por categoria
  const stockByCategory = products?.reduce((acc: any[], product) => {
    const category = product.category || 'Sem Categoria';
    const existing = acc.find(item => item.name === category);
    if (existing) {
      existing.value += product.currentStock;
    } else {
      acc.push({ name: category, value: product.currentStock });
    }
    return acc;
  }, []) || [];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header compacto */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-xs text-muted-foreground">Visão geral do negócio</p>
          </div>
        </div>

        {/* Ações Rápidas - No topo */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-2">Ações:</span>
          <Button variant="outline" size="sm" onClick={() => setLocation("/importacoes/nova")}>
            <FileText className="h-3 w-3 mr-1" />
            Importação
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLocation("/produtos/novo")}>
            <Package className="h-3 w-3 mr-1" />
            Produto
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLocation("/fornecedores/novo")}>
            <Users className="h-3 w-3 mr-1" />
            Fornecedor
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLocation("/galeria")}>
            <Eye className="h-3 w-3 mr-1" />
            Galeria
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3">
                <CardTitle className="text-xs font-medium">
                  Total Investido
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-xl font-bold">
                  {formatCurrency(stats?.totalInvestedBRL || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  +20.1% em relação ao mês anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3">
                <CardTitle className="text-xs font-medium">
                  Importações Ativas
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-xl font-bold">
                  {(stats?.pendingImportations || 0) + (stats?.inTransitImportations || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.inTransitImportations || 0} em trânsito
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3">
                <CardTitle className="text-xs font-medium">
                  Total em Estoque
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-xl font-bold">{stats?.totalStock || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.totalProducts || 0} produtos cadastrados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3">
                <CardTitle className="text-xs font-medium">
                  Alertas de Estoque
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-xl font-bold text-destructive">
                  {stats?.lowStockProducts || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Produtos abaixo do mínimo
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Gráficos - Layout otimizado */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {/* Gráfico de Importações */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Investimento Mensal</CardTitle>
              <CardDescription className="text-xs">Últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent className="pl-1">
              <div className="h-[200px]">
                {stats?.monthlyStats && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.monthlyStats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#888888" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="#888888" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => `${value/1000}k`} 
                      />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ fontSize: '12px' }}
                      />
                      <Bar 
                        dataKey="total" 
                        fill="currentColor" 
                        radius={[4, 4, 0, 0]} 
                        className="fill-primary" 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Distribuição de Estoque por Categoria */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Estoque por Categoria</CardTitle>
              <CardDescription className="text-xs">Distribuição atual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                {stockByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stockByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {stockByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                    Sem dados
                  </div>
                )}
              </div>
              <div className="mt-2 space-y-1">
                {stockByCategory.slice(0, 4).map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="truncate max-w-[100px]">{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value} un</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seção inferior - Atividades e Produtos em Destaque */}
        <div className="grid gap-3 md:grid-cols-2">
          {/* Atividade Recente - Compacta */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Atividade Recente</CardTitle>
                <CardDescription className="text-xs">Últimas importações</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/importacoes")}>
                <Eye className="h-3 w-3 mr-1" />
                Ver todas
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentActivity.map((importation) => (
                <div 
                  key={importation.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setLocation(`/importacoes/${importation.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">
                        {importation.invoiceNumber || "Sem fatura"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(importation.importDate).toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: 'short' 
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-green-600">
                    {formatCurrency(importation.totalCostBRL)}
                  </span>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Nenhuma atividade recente
                </p>
              )}
            </CardContent>
          </Card>

          {/* Top Produtos - Compacto */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Top Produtos</CardTitle>
                <CardDescription className="text-xs">Por valor em estoque</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/produtos")}>
                <Eye className="h-3 w-3 mr-1" />
                Ver todos
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats?.topProductsByStockValue?.slice(0, 6).map((product, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" title={product.name}>
                      {product.name}
                    </p>
                    <div className="h-1.5 w-full bg-secondary rounded-full mt-1 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full" 
                        style={{ 
                          width: `${(product.value / (stats.topProductsByStockValue[0]?.value || 1)) * 100}%` 
                        }} 
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-green-600 whitespace-nowrap">
                    {formatCurrency(product.value)}
                  </span>
                </div>
              ))}
              {(!stats?.topProductsByStockValue || stats.topProductsByStockValue.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Nenhum produto cadastrado
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}


import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Package, TrendingUp, FileText, DollarSign, AlertTriangle, Activity, ShoppingCart, Users, Eye, TrendingDown, Megaphone, Tag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { usePermissions } from "@/hooks/usePermissions";
import { useMemo } from "react";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const { data: recentImportations } = trpc.importations.list.useQuery();
  const { data: products } = trpc.products.list.useQuery();
  const { canViewCostBRL, canViewCostUSD } = usePermissions();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const recentActivity = recentImportations?.slice(0, 6) || [];

  // Identificar produtos com alto e baixo estoque
  const highStockProducts = useMemo(() => {
    if (!products) return [];
    return products
      .filter(p => p.currentStock > (p.minStock ?? 0) * 3) // 3x acima do mínimo
      .sort((a, b) => b.currentStock - a.currentStock)
      .slice(0, 10);
  }, [products]);

  const lowStockProducts = useMemo(() => {
    if (!products) return [];
    return products
      .filter(p => p.currentStock <= (p.minStock ?? 0))
      .sort((a, b) => a.currentStock - b.currentStock)
      .slice(0, 10);
  }, [products]);

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
            {canViewCostBRL && (
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
            )}

            {canViewCostBRL && (
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
            )}

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

            {!canViewCostBRL && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3">
                  <CardTitle className="text-xs font-medium">
                    Alto Estoque
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-xl font-bold text-blue-600">
                    {highStockProducts.length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Otimizar anúncios
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Dashboard para Usuários sem Permissão de Custos - Focado em Estoque */}
        {!canViewCostBRL && (
          <div className="grid gap-3 md:grid-cols-2">
            {/* Produtos com Alto Estoque */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      Produtos com Alto Estoque
                    </CardTitle>
                    <CardDescription className="text-xs">Otimize anúncios e promoções</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-blue-600 border-blue-300">
                    {highStockProducts.length} produtos
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {highStockProducts.length > 0 ? (
                  highStockProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border"
                      onClick={() => setLocation(`/produtos/${product.id}`)}
                    >
                      {/* Imagem do Produto */}
                      <div className="w-12 h-12 rounded-md bg-white border flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Package className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-8 w-8 rounded-md bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Megaphone className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{product.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {product.sku && (
                              <Badge variant="outline" className="text-xs font-mono">
                                {product.sku}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {product.currentStock} un
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Mín: {product.minStock ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">
                          +{Math.round((product.currentStock / (product.minStock || 1) - 1) * 100)}%
                        </Badge>
                        <p className="text-xs text-muted-foreground">acima</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-muted-foreground">
                      Nenhum produto com estoque alto
                    </p>
                  </div>
                )}
                {highStockProducts.length > 0 && (
                  <div className="pt-2 mt-2 border-t">
                    <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                      <Megaphone className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-blue-900">Sugestão</p>
                        <p className="text-xs text-blue-700 mt-0.5">
                          Aumente a visibilidade destes produtos: otimize anúncios, crie promoções e destaque nas redes sociais.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Produtos com Baixo Estoque */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Produtos com Baixo Estoque
                    </CardTitle>
                    <CardDescription className="text-xs">Remova descontos e aumente preços</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    {lowStockProducts.length} produtos
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {lowStockProducts.length > 0 ? (
                  lowStockProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border"
                      onClick={() => setLocation(`/produtos/${product.id}`)}
                    >
                      {/* Imagem do Produto */}
                      <div className="w-12 h-12 rounded-md bg-white border flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Package className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-8 w-8 rounded-md bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <Tag className="h-4 w-4 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{product.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {product.sku && (
                              <Badge variant="outline" className="text-xs font-mono">
                                {product.sku}
                              </Badge>
                            )}
                            <Badge variant="destructive" className="text-xs">
                              {product.currentStock} un
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Mín: {product.minStock ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {product.currentStock === 0 ? (
                          <Badge variant="destructive" className="text-xs">
                            Zerado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">
                            Crítico
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-muted-foreground">
                      Nenhum produto com estoque baixo
                    </p>
                  </div>
                )}
                {lowStockProducts.length > 0 && (
                  <div className="pt-2 mt-2 border-t">
                    <div className="flex items-start gap-2 p-2 bg-orange-50 rounded-lg">
                      <Tag className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-orange-900">Sugestão</p>
                        <p className="text-xs text-orange-700 mt-0.5">
                          Remova descontos ativos e considere aumentar os preços. Estoque baixo significa alta demanda.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Gráficos - Layout otimizado */}
        {canViewCostBRL && (
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
        )}

        {/* Seção inferior - Atividades e Produtos em Destaque */}
        {canViewCostBRL && (
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
        )}
      </div>
    </DashboardLayout>
  );
}


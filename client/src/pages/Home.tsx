import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Package, TrendingUp, FileText, DollarSign, AlertTriangle, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const { data: recentImportations } = trpc.importations.list.useQuery();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const recentActivity = recentImportations?.slice(0, 5) || [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral do seu negócio de importação
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setLocation("/importacoes/nova")}>
              Nova Importação
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Investido
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats?.totalInvestedBRL || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  +20.1% em relação ao mês anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Importações Ativas
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(stats?.pendingImportations || 0) + (stats?.inTransitImportations || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.inTransitImportations || 0} em trânsito
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total em Estoque
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalStock || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.totalProducts || 0} produtos cadastrados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Alertas de Estoque
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {stats?.lowStockProducts || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Produtos abaixo do mínimo
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Visão Geral de Importações</CardTitle>
              <CardDescription>
                Investimento total nos últimos 6 meses
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[300px]">
                {stats?.monthlyStats && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.monthlyStats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="month" 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => `R$${value}`} 
                      />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        cursor={{ fill: 'transparent' }}
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

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Top Produtos em Estoque</CardTitle>
              <CardDescription>
                Por valor total armazenado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {stats?.topProductsByStockValue?.map((product, index) => (
                  <div className="flex items-center" key={index}>
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium leading-none truncate max-w-[200px]" title={product.name}>
                        {product.name}
                      </p>
                      <div className="h-2 w-full bg-secondary rounded-full mt-2 overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full" 
                          style={{ 
                            width: `${(product.value / (stats.topProductsByStockValue[0]?.value || 1)) * 100}%` 
                          }} 
                        />
                      </div>
                    </div>
                    <div className="ml-4 font-medium text-sm">
                      {formatCurrency(product.value)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
              <CardDescription>
                Últimas importações registradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {recentActivity.map((importation) => (
                  <div className="flex items-center" key={importation.id}>
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {importation.invoiceNumber || "Sem fatura"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(importation.importDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="ml-auto font-medium text-sm">
                      +{formatCurrency(importation.totalCostBRL)}
                    </div>
                  </div>
                ))}
                {recentActivity.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma atividade recente.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => setLocation("/importacoes/nova")}>
                <FileText className="mr-2 h-4 w-4" />
                Nova Importação
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setLocation("/produtos/novo")}>
                <Package className="mr-2 h-4 w-4" />
                Cadastrar Produto
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setLocation("/fornecedores/novo")}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Novo Fornecedor
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}


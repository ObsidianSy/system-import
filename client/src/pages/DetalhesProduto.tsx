import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { formatCurrency, calculateSalePrice } from "@/lib/currency";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Package, AlertTriangle, TrendingUp, TrendingDown, Edit, Trash2, Calculator, Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  useMemo
} from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function DetalhesProduto() {
  const [location, setLocation] = useLocation();
  const [, params] = useRoute("/produtos/:id");
  const productId = params?.id;
  
  // Check URL params to determine where user came from
  const searchParams = new URLSearchParams(location.split('?')[1]);
  const fromPage = searchParams.get('from');
  const previousPath = fromPage === 'galeria' ? '/galeria' : '/produtos';

  const { data: product, isLoading } = trpc.products.get.useQuery(
    { id: productId! },
    { enabled: !!productId }
  );

  const { data: movements } = trpc.stock.movements.useQuery(
    { productId: productId! },
    { enabled: !!productId }
  );

  // Fetch external stock data for this product's SKU
  const { data: externalStockData } = trpc.external.getMultipleSkusStock.useQuery(
    { skus: product?.sku ? [product.sku] : [] },
    { enabled: !!product?.sku }
  );

  // Fetch full data including sales
  const { data: externalFullData } = trpc.external.getMultipleSkusData.useQuery(
    { skus: product?.sku ? [product.sku] : [] },
    { enabled: !!product?.sku }
  );

  const externalStock = useMemo(() => {
    if (!externalStockData || !product?.sku) return null;
    return externalStockData.find(item => item.sku === product.sku);
  }, [externalStockData, product?.sku]);

  const externalSales = useMemo(() => {
    if (!externalFullData || !product?.sku) return null;
    return externalFullData.find(item => item.sku === product.sku);
  }, [externalFullData, product?.sku]);

  const utils = trpc.useUtils();
  const deleteProduct = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Produto deletado com sucesso!");
      utils.products.list.invalidate();
      setLocation("/produtos");
    },
    onError: (error: any) => {
      toast.error("Erro ao deletar produto: " + error.message);
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Tem certeza que deseja deletar o produto "${product?.name}"? Esta ação não pode ser desfeita.`)) {
      deleteProduct.mutate({ id: productId! });
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString('pt-BR');
  };

  const movementTypeLabels: Record<string, string> = {
    import: "Importação",
    sale: "Venda",
    adjustment: "Ajuste",
    return: "Devolução",
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  if (!product) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">Produto não encontrado</h3>
          <Button onClick={() => setLocation(previousPath)}>
            Voltar para {previousPath === '/galeria' ? 'Galeria' : 'Produtos'}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isLowStock = product.currentStock <= (product.minStock ?? 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(previousPath)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
              {isLowStock && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Estoque Baixo
                </Badge>
              )}
            </div>
            {product.description && (
              <p className="text-muted-foreground mt-1">{product.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation(`/produtos/${product.id}/editar`)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteProduct.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Deletar
            </Button>
          </div>
        </div>

        {/* Cards de Informações - Prioridade: Estoque Real */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estoque Real</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {externalStock?.estoque !== undefined 
                  ? externalStock.estoque 
                  : "-"}
              </div>
              <p className="text-xs text-muted-foreground">
                Sistema externo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Comprado</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{product.currentStock}</div>
              <p className="text-xs text-muted-foreground">
                Importações registradas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas (30d)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {externalSales?.vendas?.vendas_30d ?? "-"}
              </div>
              <p className="text-xs text-muted-foreground">
                Total: {externalSales?.vendas?.total_unidades ?? "-"} un.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLowStock ? (
                  <Badge variant="destructive">Crítico</Badge>
                ) : (
                  <Badge variant="default">Normal</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Nível de estoque
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Informações do Produto */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Produto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">SKU / Código</p>
                    <p className="font-medium">{product.sku || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Categoria</p>
                    <p className="font-medium">{product.category || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Código NCM</p>
                    <p className="font-medium">{product.ncmCode || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estoque Mínimo</p>
                    <p className="font-medium">{product.minStock ?? 0} unidades</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estoque Real</p>
                    <p className="font-medium">
                      {externalStock?.estoque !== undefined 
                        ? `${externalStock.estoque} unidades` 
                        : "Não disponível"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Comprado</p>
                    <p className="font-medium">{product.currentStock} unidades</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cadastrado em</p>
                    <p className="font-medium">{formatDate(product.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Código do Fornecedor</p>
                    <p className="font-medium">{product.supplierProductCode || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Custo Médio (BRL)</p>
                    <p className="font-medium">{formatCurrency(product.averageCostBRL)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Custo Última Importação (USD)</p>
                    <p className="font-medium">
                      {product.lastImportUnitPriceUSD 
                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(product.lastImportUnitPriceUSD / 100)
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Preço de Venda</p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {product.salePriceBRL > 0 ? formatCurrency(product.salePriceBRL) : "-"}
                      </p>
                      {product.averageCostBRL > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <Calculator className="h-3 w-3 mr-1" />
                          Sugerido: {formatCurrency(calculateSalePrice(product.averageCostBRL))}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Imagem do Produto</CardTitle>
              </CardHeader>
              <CardContent>
                {product.imageUrl ? (
                  <div className="flex justify-center bg-white rounded-lg p-2 border">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-auto max-h-[400px] object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                    <Package className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Histórico de Movimentações */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Movimentações e Custos</CardTitle>
          </CardHeader>
          <CardContent>
            {movements && movements.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Estoque Anterior</TableHead>
                    <TableHead className="text-right">Estoque Novo</TableHead>
                    <TableHead className="text-right">Custo Unit. (BRL)</TableHead>
                    <TableHead className="text-right">Custo Unit. (USD)</TableHead>
                    <TableHead className="text-right">Custo Médio Ant.</TableHead>
                    <TableHead className="text-right">Custo Médio Novo (BRL)</TableHead>
                    <TableHead className="text-right">Custo Médio Novo (USD)</TableHead>
                    <TableHead>Referência</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement: any) => (
                    <TableRow key={movement.id}>
                      <TableCell className="text-sm">
                        {formatDate(movement.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {movementTypeLabels[movement.type] || movement.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={movement.quantity > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                          {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {movement.previousStock}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {movement.newStock}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {movement.unitCostBRL ? formatCurrency(movement.unitCostBRL) : "-"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {movement.unitCostUSD 
                          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(movement.unitCostUSD / 100)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {movement.previousAverageCostBRL ? formatCurrency(movement.previousAverageCostBRL) : "-"}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {movement.newAverageCostBRL ? (
                          <div className="flex items-center justify-end gap-1">
                            {formatCurrency(movement.newAverageCostBRL)}
                            {movement.newAverageCostBRL !== movement.previousAverageCostBRL && (
                              movement.newAverageCostBRL > movement.previousAverageCostBRL ? (
                                <TrendingUp className="h-3 w-3 text-red-500" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-green-500" />
                              )
                            )}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {movement.newAverageCostUSD ? (
                          <div className="flex items-center justify-end gap-1">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(movement.newAverageCostUSD / 100)}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {movement.reference || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma movimentação registrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


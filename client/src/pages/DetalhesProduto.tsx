import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StockBadge, StockDisplay } from "@/components/ui/stock-badge";
import { trpc } from "@/lib/trpc";
import { formatCurrency, calculateSalePrice } from "@/lib/currency";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Package, AlertTriangle, TrendingUp, TrendingDown, Edit, Trash2, Calculator, Globe, Tag, Plus, X, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useExternalStock, useExternalProductData } from "@/_core/hooks/useExternalStock";
import { usePermissions } from "@/hooks/usePermissions";
import type { ExternalProductData } from "../../../shared/externalTypes";
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
  const { canViewCostUSD, canViewCostBRL } = usePermissions();
  
  // Dialog de edição de canais
  const [showChannelsDialog, setShowChannelsDialog] = useState(false);
  const [tempChannels, setTempChannels] = useState<string[]>([]);
  const [newChannelInput, setNewChannelInput] = useState("");
  
  // Check URL params to determine where user came from
  const searchParams = new URLSearchParams(window.location.search);
  const fromPage = searchParams.get('from');
  const previousPath = fromPage === 'galeria' ? '/galeria' : '/produtos';
  
  console.log('[DetalhesProduto] URL:', window.location.href);
  console.log('[DetalhesProduto] fromPage:', fromPage);
  console.log('[DetalhesProduto] previousPath:', previousPath);

  const { data: product, isLoading } = trpc.products.get.useQuery(
    { id: productId! },
    { enabled: !!productId }
  );

  const { data: allProducts } = trpc.products.list.useQuery();

  const { data: movements } = trpc.stock.movements.useQuery(
    { productId: productId! },
    { enabled: !!productId }
  );

  // Fetch external stock and sales data using hooks
  const { getStock, isLoading: isLoadingStock } = useExternalStock(
    product?.sku ? [product.sku] : [],
    { enabled: !!product?.sku }
  );

  const { getProductData, isLoading: isLoadingProductData } = useExternalProductData(
    product?.sku ? [product.sku] : [],
    { enabled: !!product?.sku }
  );

  const externalData: ExternalProductData | undefined = product?.sku ? getProductData(product.sku) : undefined;

  // Extrair todos os canais únicos de todos os produtos
  const allChannels = useMemo(() => {
    if (!allProducts) return [];
    const channelsSet = new Set<string>();
    allProducts.forEach(p => {
      if (p.advertisedChannels) {
        p.advertisedChannels.forEach(ch => channelsSet.add(ch));
      }
    });
    return Array.from(channelsSet).sort();
  }, [allProducts]);

  const utils = trpc.useUtils();
  
  const updateProductChannels = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Canais atualizados com sucesso!");
      utils.products.get.invalidate({ id: productId! });
      utils.products.list.invalidate();
      setShowChannelsDialog(false);
      setTempChannels([]);
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar canais: " + error.message);
    },
  });
  
  const deleteProduct = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Produto deletado com sucesso!");
      utils.products.list.invalidate();
      const returnPath = fromPage === 'galeria' ? '/galeria' : '/produtos';
      console.log('[DetalhesProduto] Produto deletado, voltando para:', returnPath);
      setLocation(returnPath);
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

  const openChannelsDialog = () => {
    if (product) {
      setTempChannels(product.advertisedChannels || []);
      setNewChannelInput("");
      setShowChannelsDialog(true);
    }
  };

  const addChannelToTemp = (channel: string) => {
    const trimmed = channel.trim();
    if (!trimmed) {
      toast.error("Digite o nome do canal");
      return;
    }
    if (tempChannels.includes(trimmed)) {
      toast.error("Este canal já foi adicionado");
      return;
    }
    setTempChannels(prev => [...prev, trimmed]);
    setNewChannelInput("");
  };

  const removeChannelFromTemp = (channel: string) => {
    setTempChannels(prev => prev.filter(c => c !== channel));
  };

  const toggleChannelInTemp = (channel: string) => {
    if (tempChannels.includes(channel)) {
      removeChannelFromTemp(channel);
    } else {
      setTempChannels(prev => [...prev, channel]);
    }
  };

  const saveChannels = () => {
    if (!productId) return;
    
    updateProductChannels.mutate({
      id: productId,
      advertisedChannels: tempChannels,
    });
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
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-3 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
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
            onClick={() => {
              console.log('[DetalhesProduto] Voltando para:', previousPath);
              setLocation(previousPath);
            }}
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
            <Button variant="outline" onClick={() => {
              const editUrl = fromPage === 'galeria' 
                ? `/produtos/${product.id}/editar?from=galeria` 
                : `/produtos/${product.id}/editar`;
              console.log('[DetalhesProduto] Navegando para edição:', editUrl);
              setLocation(editUrl);
            }}>
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
        <div className="grid gap-3 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3">
              <CardTitle className="text-xs font-medium">Estoque Real</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-xl font-bold">
                {isLoadingStock ? (
                  <Skeleton className="h-8 w-16" />
                ) : product.sku ? (
                  getStock(product.sku)
                ) : (
                  "-"
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Sistema externo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3">
              <CardTitle className="text-xs font-medium">Total Comprado</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-xl font-bold">{product.currentStock}</div>
              <p className="text-xs text-muted-foreground">
                Importações registradas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3">
              <CardTitle className="text-xs font-medium">Vendas (30d)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-xl font-bold">
                {isLoadingProductData ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  externalData?.vendas?.vendas_30d ?? "-"
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Total: {externalData?.vendas?.total_unidades ?? "-"} un.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3">
              <CardTitle className="text-xs font-medium">Status</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-lg font-bold">
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
                      {isLoadingStock ? (
                        <Skeleton className="h-4 w-24" />
                      ) : product.sku ? (
                        `${getStock(product.sku)} unidades`
                      ) : (
                        "Não disponível"
                      )}
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
                  {canViewCostBRL && (
                    <div>
                      <p className="text-sm text-muted-foreground">Custo Médio (BRL)</p>
                      <p className="font-medium">{formatCurrency(product.averageCostBRL)}</p>
                    </div>
                  )}
                  {canViewCostUSD && (
                    <div>
                      <p className="text-sm text-muted-foreground">Custo Última Importação (USD)</p>
                      <p className="font-medium">
                        {product.lastImportUnitPriceUSD 
                          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(product.lastImportUnitPriceUSD / 100)
                          : "-"}
                      </p>
                    </div>
                  )}
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

            {/* Canais Anunciados */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Locais Anunciados
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openChannelsDialog}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {product.advertisedChannels && product.advertisedChannels.length > 0 ? "Editar" : "Adicionar"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {product.advertisedChannels && product.advertisedChannels.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {product.advertisedChannels.map((channel) => (
                      <Badge
                        key={channel}
                        variant="secondary"
                        className="px-3 py-1"
                      >
                        {channel}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum canal adicionado ainda. Clique em "Adicionar" para começar.
                  </p>
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
                    {canViewCostBRL && <TableHead className="text-right">Custo Unit. (BRL)</TableHead>}
                    {canViewCostUSD && <TableHead className="text-right">Custo Unit. (USD)</TableHead>}
                    {canViewCostBRL && <TableHead className="text-right">Custo Médio Ant.</TableHead>}
                    {canViewCostBRL && <TableHead className="text-right">Custo Médio Novo (BRL)</TableHead>}
                    {canViewCostUSD && <TableHead className="text-right">Custo Médio Novo (USD)</TableHead>}
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
                      {canViewCostBRL && (
                        <TableCell className="text-right text-sm">
                          {movement.unitCostBRL ? formatCurrency(movement.unitCostBRL) : "-"}
                        </TableCell>
                      )}
                      {canViewCostUSD && (
                        <TableCell className="text-right text-sm">
                          {movement.unitCostUSD 
                            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(movement.unitCostUSD / 100)
                            : "-"}
                        </TableCell>
                      )}
                      {canViewCostBRL && (
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {movement.previousAverageCostBRL ? formatCurrency(movement.previousAverageCostBRL) : "-"}
                        </TableCell>
                      )}
                      {canViewCostBRL && (
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
                      )}
                      {canViewCostUSD && (
                        <TableCell className="text-right text-sm font-medium">
                          {movement.newAverageCostUSD ? (
                            <div className="flex items-center justify-end gap-1">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(movement.newAverageCostUSD / 100)}
                            </div>
                          ) : "-"}
                        </TableCell>
                      )}
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

      {/* Dialog de Edição Rápida de Canais */}
      <Dialog open={showChannelsDialog} onOpenChange={setShowChannelsDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Locais Anunciados</DialogTitle>
            <DialogDescription>
              Adicione ou remova os canais onde este produto está anunciado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Input para novo canal */}
            <div className="space-y-2">
              <Label htmlFor="newChannel">Adicionar Canal</Label>
              <div className="flex gap-2">
                <Input
                  id="newChannel"
                  placeholder="Digite o nome do canal..."
                  value={newChannelInput}
                  onChange={(e) => setNewChannelInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addChannelToTemp(newChannelInput);
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={() => addChannelToTemp(newChannelInput)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Canais sugeridos (já usados em outros produtos) */}
            {allChannels.length > 0 && (
              <div className="space-y-2">
                <Label>Canais Disponíveis (clique para adicionar/remover)</Label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30 max-h-32 overflow-y-auto">
                  {allChannels.map((channel) => (
                    <Badge
                      key={channel}
                      variant={tempChannels.includes(channel) ? "default" : "outline"}
                      className="cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => toggleChannelInTemp(channel)}
                    >
                      {tempChannels.includes(channel) && (
                        <Check className="h-3 w-3 mr-1" />
                      )}
                      {channel}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Canais selecionados */}
            <div className="space-y-2">
              <Label>Canais Selecionados ({tempChannels.length})</Label>
              {tempChannels.length > 0 ? (
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg">
                  {tempChannels.map((channel) => (
                    <Badge
                      key={channel}
                      variant="secondary"
                      className="pl-3 pr-1 py-1 gap-2"
                    >
                      {channel}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeChannelFromTemp(channel)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                  Nenhum canal selecionado
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChannelsDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveChannels} disabled={updateProductChannels.isPending}>
              {updateProductChannels.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}


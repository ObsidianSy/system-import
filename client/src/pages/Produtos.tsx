import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/currency";
import { Plus, Package, AlertTriangle, Filter, X, Search, Grid3x3, List, MoreVertical, Edit, Trash2, Eye, EyeOff, TrendingUp, TrendingDown, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { useExternalStock } from "@/_core/hooks/useExternalStock";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { usePermissions } from "@/hooks/usePermissions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Produtos() {
  const [, setLocation] = useLocation();
  const { data: products, isLoading } = trpc.products.list.useQuery();
  const { data: currentOrder } = trpc.orders.current.useQuery();
  const utils = trpc.useUtils();
  const { canViewCostBRL, canEditProducts } = usePermissions();

  // Extract SKUs and fetch external stock
  const productsWithSkus = useMemo(() => 
    products?.filter(p => p.sku).map(p => p.sku!) || [],
    [products]
  );

  const { getStock, isLoading: isLoadingExternalStock } = useExternalStock(productsWithSkus);

  // Estados
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sortBy, setSortBy] = useState("sku");
  const [showAverageCost, setShowAverageCost] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const deleteProduct = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Produto excluído com sucesso!");
      utils.products.list.invalidate();
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir produto: " + error.message);
    },
  });

  const addItemToOrder = trpc.orders.addItem.useMutation({
    onSuccess: () => {
      toast.success("Produto adicionado ao pedido!");
      utils.orders.current.invalidate();
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar ao pedido: " + error.message);
    },
  });

  // Extrair categorias únicas
  const categories = useMemo(() => {
    if (!products) return [];
    const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter((c): c is string => Boolean(c))));
    return uniqueCategories.sort();
  }, [products]);

  // Aplicar filtros e ordenação
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    let filtered = products.filter(product => {
      // Busca
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          product.name.toLowerCase().includes(search) ||
          product.sku?.toLowerCase().includes(search) ||
          product.description?.toLowerCase().includes(search) ||
          product.category?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Categoria
      if (categoryFilter !== "all" && product.category !== categoryFilter) {
        return false;
      }

      // Estoque - usar estoque real da API externa
      const realStock = product.sku ? getStock(product.sku) : 0;
      if (stockFilter === "low" && realStock > (product.minStock ?? 0)) {
        return false;
      }
      if (stockFilter === "out" && realStock === 0) {
        return false;
      }
      if (stockFilter === "available" && realStock === 0) {
        return false;
      }

      // Preço
      if (priceMin) {
        const minPrice = parseFloat(priceMin) * 100;
        if (product.salePriceBRL < minPrice) return false;
      }
      if (priceMax) {
        const maxPrice = parseFloat(priceMax) * 100;
        if (product.salePriceBRL > maxPrice) return false;
      }

      return true;
    });

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return a.salePriceBRL - b.salePriceBRL;
        case "price-desc":
          return b.salePriceBRL - a.salePriceBRL;
        case "stock-asc": {
          const stockA = a.sku ? getStock(a.sku) : 0;
          const stockB = b.sku ? getStock(b.sku) : 0;
          return stockA - stockB;
        }
        case "stock-desc": {
          const stockA = a.sku ? getStock(a.sku) : 0;
          const stockB = b.sku ? getStock(b.sku) : 0;
          return stockB - stockA;
        }
        case "name":
          return a.name.localeCompare(b.name);
        case "sku":
        default:
          return (a.sku || "").localeCompare(b.sku || "");
      }
    });

    return filtered;
  }, [products, searchTerm, categoryFilter, stockFilter, priceMin, priceMax, sortBy, getStock]);

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setStockFilter("all");
    setPriceMin("");
    setPriceMax("");
    setSortBy("sku");
  };

  const hasActiveFilters = searchTerm || categoryFilter !== "all" || stockFilter !== "all" || priceMin || priceMax;

  const handleDelete = (e: React.MouseEvent, productId: string, productName: string) => {
    e.stopPropagation();
    setDeleteConfirm({ id: productId, name: productName });
  };

  const handleAddToOrder = async (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    
    if (!currentOrder?.order?.id) {
      toast.error("Erro ao obter pedido atual");
      return;
    }

    try {
      await addItemToOrder.mutateAsync({
        orderId: currentOrder.order.id,
        productId: product.id,
        quantity: 1,
        unitPriceUSD: product.lastImportUnitPriceUSD || 0,
      });
    } catch (error) {
      console.error('[Produtos] Erro ao adicionar ao pedido:', error);
    }
  };

  // Estatísticas
  const stats = useMemo(() => {
    if (!products) return { total: 0, lowStock: 0, outOfStock: 0, totalValue: 0, totalUnits: 0 };
    
    let lowStock = 0;
    let outOfStock = 0;
    let totalValue = 0;
    let totalUnits = 0;

    products.forEach(p => {
      const realStock = p.sku ? getStock(p.sku) : 0;
      totalUnits += realStock;
      if (realStock === 0) outOfStock++;
      else if (realStock <= (p.minStock ?? 0)) lowStock++;
      totalValue += p.salePriceBRL * realStock;
    });

    return {
      total: products.length,
      lowStock,
      outOfStock,
      totalValue,
      totalUnits
    };
  }, [products, getStock]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <PageHeader
          title="Produtos"
          description={`${filteredProducts.length} de ${products?.length || 0} produtos • ${stats.lowStock} estoque baixo • ${stats.outOfStock} sem estoque`}
          actions={
            <>
              {currentOrder?.items && currentOrder.items.length > 0 && (
                <Button variant="outline" onClick={() => setLocation('/pedidos')} className="gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  <span className="font-semibold">{currentOrder.items.length}</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode("grid")}
                className={viewMode === "grid" ? "bg-primary text-primary-foreground" : ""}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "bg-primary text-primary-foreground" : ""}
              >
                <List className="h-4 w-4" />
              </Button>
              {canViewCostBRL && viewMode === "list" && (
                <Button
                  variant={showAverageCost ? "default" : "outline"}
                  size="icon"
                  onClick={() => setShowAverageCost(!showAverageCost)}
                  title={showAverageCost ? "Ocultar Custo Médio" : "Mostrar Custo Médio"}
                >
                  {showAverageCost ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              )}
              <Button onClick={() => setLocation("/produtos/novo")} disabled={!canEditProducts}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            </>
          }
        />

        {/* Cards de Estatísticas */}
        <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Produtos" value={stats.total} icon={Package} />
          <StatCard label="Unidades" value={stats.totalUnits} icon={Package} tone="info" />
          <StatCard label="Est. Baixo" value={stats.lowStock} icon={AlertTriangle} tone="warning" />
          <StatCard label="Sem Est." value={stats.outOfStock} icon={TrendingDown} tone="danger" />
          {canViewCostBRL && (
            <StatCard
              label="Valor"
              value={formatCurrency(stats.totalValue)}
              icon={TrendingUp}
              tone="success"
            />
          )}
        </div>

        {/* Filtros e Busca - Inline sem Card */}
        <div className="flex flex-col lg:flex-row gap-2">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, SKU, categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9"
            />
          </div>

          {/* Filtros Inline */}
          <div className="flex gap-2 flex-wrap lg:flex-nowrap">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="Estoque" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="available">Disponível</SelectItem>
                <SelectItem value="low">Baixo</SelectItem>
                <SelectItem value="out">Esgotado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sku">SKU</SelectItem>
                <SelectItem value="name">Nome</SelectItem>
                <SelectItem value="price-asc">Menor Preço</SelectItem>
                <SelectItem value="price-desc">Maior Preço</SelectItem>
                <SelectItem value="stock-asc">Menor Estoque</SelectItem>
                <SelectItem value="stock-desc">Maior Estoque</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtros Avançados */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Filter className="h-4 w-4" />
                  {hasActiveFilters && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary text-[9px] text-primary-foreground flex items-center justify-center">
                      !
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filtros Avançados</SheetTitle>
                  <SheetDescription>
                    Refine sua busca com filtros de preço
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <div className="space-y-2">
                    <Label>Faixa de Preço (R$)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Mín"
                        value={priceMin}
                        onChange={(e) => setPriceMin(e.target.value)}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Máx"
                        value={priceMax}
                        onChange={(e) => setPriceMax(e.target.value)}
                      />
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Limpar Filtros
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Grid de Produtos */}
        {filteredProducts && filteredProducts.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {filteredProducts.map((product) => {
                const realStock = product.sku ? getStock(product.sku) : 0;
                const isLowStock = realStock <= (product.minStock || 0) && realStock > 0;
                const isOutOfStock = realStock === 0;

                return (
                  <Card
                    key={product.id}
                    className="group cursor-pointer hover:shadow-md transition-all duration-200 overflow-hidden hover:border-primary/50"
                    onClick={() => setLocation(`/produtos/${product.id}`)}
                  >
                    {/* Imagem */}
                    <div className="relative aspect-square bg-muted/30">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-16 w-16 text-muted-foreground/20" />
                        </div>
                      )}

                      {/* Botões de Ação */}
                      <div className="absolute top-1.5 right-1.5 flex gap-1">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-7 w-7 rounded-full shadow-md backdrop-blur-sm"
                          onClick={(e) => handleAddToOrder(e, product)}
                          disabled={addItemToOrder.isPending}
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-7 w-7 rounded-full shadow-md backdrop-blur-sm"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/produtos/${product.id}`);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/produtos/${product.id}/editar`);
                              }}
                              disabled={!canEditProducts}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => handleDelete(e as any, product.id, product.name)}
                              className="text-destructive focus:text-destructive"
                              disabled={!canEditProducts}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Badge de Estoque */}
                      <div className="absolute bottom-1.5 right-1.5">
                        {isOutOfStock ? (
                          <Badge variant="destructive" className="shadow-sm backdrop-blur-sm text-xs px-2 py-0.5">
                            Esgotado
                          </Badge>
                        ) : isLowStock ? (
                          <Badge variant="outline" className="bg-yellow-500/90 text-white border-yellow-600 shadow-sm backdrop-blur-sm text-xs px-2 py-0.5">
                            Baixo ({realStock})
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-500/90 text-white border-green-600 shadow-sm backdrop-blur-sm text-xs px-2 py-0.5">
                            {realStock} un
                          </Badge>
                        )}
                      </div>

                      {/* Categoria */}
                      {product.category && (
                        <div className="absolute bottom-1.5 left-1.5">
                          <Badge variant="secondary" className="shadow-sm backdrop-blur-sm text-xs px-2 py-0.5">
                            {product.category}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <CardContent className="p-3">
                      <h3 className="font-semibold text-xs line-clamp-2 mb-2 leading-tight">
                        {product.name}
                      </h3>
                      
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {product.sku && (
                          <div className="flex justify-between">
                            <span>SKU:</span>
                            <span className="font-mono">{product.sku}</span>
                          </div>
                        )}
                        {product.ncmCode && (
                          <div className="flex justify-between">
                            <span>NCM:</span>
                            <span className="font-mono">{product.ncmCode}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Comprado:</span>
                          <span className="font-semibold">{product.currentStock} un</span>
                        </div>
                      </div>

                      {product.salePriceBRL > 0 && (
                        <div className="mt-2 pt-2 border-t flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Preço</span>
                          <span className="font-bold text-xs text-green-600">
                            {formatCurrency(product.salePriceBRL)}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            // Modo Lista (compacto)
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {filteredProducts.map((product) => {
                    const realStock = product.sku ? getStock(product.sku) : 0;
                    const isLowStock = realStock <= (product.minStock || 0) && realStock > 0;
                    const isOutOfStock = realStock === 0;

                    return (
                      <div
                        key={product.id}
                        className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setLocation(`/produtos/${product.id}`)}
                      >
                        {/* Imagem */}
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-16 w-16 rounded object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded bg-muted flex items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{product.name}</h3>
                          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                            {product.sku && <span>SKU: {product.sku}</span>}
                            {product.category && <span>• {product.category}</span>}
                          </div>
                        </div>

                        {/* Estoque */}
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Estoque</div>
                          {isOutOfStock ? (
                            <Badge variant="destructive">Esgotado</Badge>
                          ) : isLowStock ? (
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-600">
                              {realStock} un
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-600">
                              {realStock} un
                            </Badge>
                          )}
                        </div>

                        {/* Custo Médio (BRL) - Apenas para admin */}
                        {canViewCostBRL && showAverageCost && (
                          <div className="text-right min-w-[100px]">
                            <div className="text-sm text-muted-foreground">Custo Médio</div>
                            <div className="font-medium text-blue-600">
                              {product.averageCostBRL > 0 ? formatCurrency(product.averageCostBRL) : "-"}
                            </div>
                          </div>
                        )}

                        {/* Preço */}
                        <div className="text-right min-w-[100px]">
                          <div className="text-sm text-muted-foreground">Preço</div>
                          <div className="font-bold text-green-600">
                            {product.salePriceBRL > 0 ? formatCurrency(product.salePriceBRL) : "-"}
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => handleAddToOrder(e, product)}
                            disabled={addItemToOrder.isPending}
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocation(`/produtos/${product.id}`);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocation(`/produtos/${product.id}/editar`);
                                }}
                                disabled={!canEditProducts}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => handleDelete(e as any, product.id, product.name)}
                                className="text-destructive focus:text-destructive"
                                disabled={!canEditProducts}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )
        ) : (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={Package}
                title={hasActiveFilters ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
                description={
                  hasActiveFilters
                    ? "Tente ajustar os filtros"
                    : "Comece criando seu primeiro produto"
                }
                action={
                  hasActiveFilters ? (
                    <Button onClick={clearFilters} variant="outline">
                      <X className="h-4 w-4 mr-2" />
                      Limpar Filtros
                    </Button>
                  ) : (
                    <Button onClick={() => setLocation("/produtos/novo")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Produto
                    </Button>
                  )
                }
              />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>

    <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir produto</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir "{deleteConfirm?.name}"? Esta acao nao pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (deleteConfirm) {
                deleteProduct.mutate({ id: deleteConfirm.id });
                setDeleteConfirm(null);
              }
            }}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

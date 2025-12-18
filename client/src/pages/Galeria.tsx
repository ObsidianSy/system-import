import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/currency";
import { useLocation } from "wouter";
import { Search, Package, Filter, X, Grid3x3, LayoutGrid, ArrowUpDown, Edit, Trash2, ShoppingCart, MoreVertical, Printer, Check, Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useExternalStock } from "@/_core/hooks/useExternalStock";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Galeria() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [gridSize, setGridSize] = useState<"4" | "6" | "8">("6");
  
  // Filtros
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [channelFilter, setChannelFilter] = useState("all"); // all, announced, not-announced, specific-channel
  const [specificChannel, setSpecificChannel] = useState("");
  
  // Seleção múltipla
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  
  // Dialog de edição rápida de canais
  const [showChannelsDialog, setShowChannelsDialog] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [tempChannels, setTempChannels] = useState<string[]>([]);
  const [newChannelInput, setNewChannelInput] = useState("");
  
  // Opções de impressão
  const [printOptions, setPrintOptions] = useState({
    showName: true,
    showSku: true,
    showPrice: true,
    showCategory: true,
    showStock: false,
    showChannels: true,
    imageSize: "medium" as "small" | "medium" | "large",
    columns: 3,
  });
  
  const { data: products, isLoading } = trpc.products.list.useQuery();
  const { data: currentOrder } = trpc.orders.current.useQuery();
  const utils = trpc.useUtils();
  
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

  const updateProductChannels = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Canais atualizados com sucesso!");
      utils.products.list.invalidate();
      setShowChannelsDialog(false);
      setEditingProductId(null);
      setTempChannels([]);
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar canais: " + error.message);
    },
  });

  // Fetch external stock
  const allSkus = useMemo(() => 
    products?.filter(p => p.sku).map(p => p.sku!) || [],
    [products]
  );

  const { getStock, isLoading: isLoadingExternalStock } = useExternalStock(allSkus);

  // Extrair categorias únicas
  const categories = useMemo(() => {
    if (!products) return [];
    const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return uniqueCategories.sort();
  }, [products]);

  const allChannels = useMemo(() => {
    if (!products) return [];
    const channelsSet = new Set<string>();
    products.forEach(p => {
      if (p.advertisedChannels) {
        p.advertisedChannels.forEach(ch => channelsSet.add(ch));
      }
    });
    return Array.from(channelsSet).sort();
  }, [products]);

  // Aplicar filtros e ordenação
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    let filtered = products.filter(product => {
      // Filtro de busca
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          product.name.toLowerCase().includes(search) ||
          product.category?.toLowerCase().includes(search) ||
          product.sku?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Filtro de categoria
      if (categoryFilter !== "all" && product.category !== categoryFilter) {
        return false;
      }

      // Filtro de estoque
      const realStock = product.sku 
        ? getStock(product.sku, product.currentStock)
        : product.currentStock;
        
      if (stockFilter === "low" && realStock > (product.minStock ?? 0)) {
        return false;
      }
      if (stockFilter === "out" && realStock > 0) {
        return false;
      }
      if (stockFilter === "available" && realStock === 0) {
        return false;
      }

      // Filtro de preço
      if (priceMin) {
        const minPrice = parseFloat(priceMin) * 100;
        if (product.salePriceBRL < minPrice) return false;
      }
      if (priceMax) {
        const maxPrice = parseFloat(priceMax) * 100;
        if (product.salePriceBRL > maxPrice) return false;
      }

      // Filtro de canais anunciados
      const hasChannels = product.advertisedChannels && product.advertisedChannels.length > 0;
      if (channelFilter === "announced" && !hasChannels) {
        return false;
      }
      if (channelFilter === "not-announced" && hasChannels) {
        return false;
      }
      if (specificChannel && (!hasChannels || !product.advertisedChannels.some(ch => 
        ch.toLowerCase().includes(specificChannel.toLowerCase())
      ))) {
        return false;
      }

      return true;
    });

    // Aplicar ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return a.salePriceBRL - b.salePriceBRL;
        case "price-desc":
          return b.salePriceBRL - a.salePriceBRL;
        case "stock": {
          const stockA = a.sku ? getStock(a.sku, a.currentStock) : a.currentStock;
          const stockB = b.sku ? getStock(b.sku, b.currentStock) : b.currentStock;
          return stockB - stockA;
        }
        case "name":
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [products, searchTerm, categoryFilter, stockFilter, priceMin, priceMax, sortBy, channelFilter, specificChannel, getStock]);

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setStockFilter("all");
    setPriceMin("");
    setPriceMax("");
    setSortBy("name");
    setChannelFilter("all");
    setSpecificChannel("");
  };

  const hasActiveFilters = searchTerm || categoryFilter !== "all" || stockFilter !== "all" || priceMin || priceMax || channelFilter !== "all" || specificChannel;
  
  const getGridClass = () => {
    switch(gridSize) {
      case "4": return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
      case "6": return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6";
      case "8": return "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8";
      default: return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6";
    }
  };

  const handleDelete = (e: React.MouseEvent, productId: string, productName: string) => {
    e.stopPropagation();
    if (window.confirm(`Tem certeza que deseja excluir "${productName}"?`)) {
      deleteProduct.mutate({ id: productId });
    }
  };

  const handleEdit = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    console.log('[Galeria] Navegando para edição:', `/produtos/${productId}/editar?from=galeria`);
    setLocation(`/produtos/${productId}/editar?from=galeria`);
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
      
      console.log('[Galeria] Produto adicionado ao pedido:', {
        productId: product.id,
        productName: product.name,
        orderId: currentOrder.order.id,
      });
    } catch (error) {
      console.error('[Galeria] Erro ao adicionar ao pedido:', error);
    }
  };

  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  const selectAll = () => {
    if (filteredProducts) {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const clearSelection = () => {
    setSelectedProducts(new Set());
  };

  const openChannelsDialog = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    if (product) {
      setEditingProductId(productId);
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
    if (!editingProductId) return;
    
    updateProductChannels.mutate({
      id: editingProductId,
      advertisedChannels: tempChannels,
    });
  };

  const addSelectedToOrder = async () => {
    if (!currentOrder?.order?.id || selectedProducts.size === 0) {
      toast.error("Selecione produtos primeiro");
      return;
    }

    try {
      const productsToAdd = filteredProducts?.filter(p => selectedProducts.has(p.id)) || [];
      
      for (const product of productsToAdd) {
        await addItemToOrder.mutateAsync({
          orderId: currentOrder.order.id,
          productId: product.id,
          quantity: 1,
          unitPriceUSD: product.lastImportUnitPriceUSD || 0,
        });
      }
      
      toast.success(`${productsToAdd.length} produtos adicionados ao pedido!`);
      clearSelection();
    } catch (error) {
      console.error('[Galeria] Erro ao adicionar em lote:', error);
    }
  };

  const printCatalog = () => {
    if (selectedProducts.size === 0) {
      toast.error("Selecione produtos para imprimir");
      return;
    }
    setShowPrintDialog(true);
  };

  const generatePrintHTML = () => {
    const selectedItems = filteredProducts?.filter(p => selectedProducts.has(p.id)) || [];
    
    const gridCols = printOptions.columns;
    const imageHeight = printOptions.imageSize === "small" ? "120px" : 
                       printOptions.imageSize === "medium" ? "180px" : "240px";

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Catálogo de Produtos</title>
  <style>
    @page { size: A4; margin: 1cm; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    .catalog-grid { 
      display: grid; 
      grid-template-columns: repeat(${gridCols}, 1fr); 
      gap: 15px; 
      margin: 20px 0;
    }
    .product-card { 
      border: 1px solid #ddd; 
      padding: 10px; 
      text-align: center;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .product-image { 
      width: 100%; 
      height: ${imageHeight}; 
      object-fit: contain; 
      margin-bottom: 8px;
      background: #f5f5f5;
    }
    .product-name { font-size: 14px; font-weight: bold; margin: 5px 0; }
    .product-sku { font-size: 11px; color: #666; margin: 3px 0; }
    .product-price { font-size: 13px; color: #2563eb; font-weight: bold; margin: 5px 0; }
    .product-category { font-size: 10px; color: #888; margin: 3px 0; }
    .product-stock { font-size: 11px; color: #16a34a; margin: 3px 0; }
    .product-channels { font-size: 10px; color: #1e40af; margin: 5px 0; display: flex; flex-wrap: wrap; gap: 3px; justify-content: center; }
    .channel-badge { background: #dbeafe; padding: 2px 6px; border-radius: 4px; border: 1px solid #93c5fd; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
    h1 { margin: 0; font-size: 24px; }
    .date { font-size: 12px; color: #666; }
    @media print {
      .no-print { display: none; }
      body { padding: 10px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Catálogo de Produtos</h1>
    <div class="date">Gerado em: ${new Date().toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</div>
  </div>
  
  <div class="catalog-grid">
`;

    selectedItems.forEach(product => {
      const channelsHTML = printOptions.showChannels && product.advertisedChannels && product.advertisedChannels.length > 0
        ? `<div class="product-channels">${product.advertisedChannels.map(ch => `<span class="channel-badge">${ch}</span>`).join('')}</div>`
        : '';
      
      html += `
    <div class="product-card">
      ${product.imageUrl ? `<img src="${product.imageUrl}" class="product-image" alt="${product.name}">` : 
        `<div class="product-image" style="display:flex;align-items:center;justify-content:center;color:#ccc;">Sem imagem</div>`}
      ${printOptions.showName ? `<div class="product-name">${product.name}</div>` : ''}
      ${printOptions.showSku && product.sku ? `<div class="product-sku">SKU: ${product.sku}</div>` : ''}
      ${printOptions.showCategory && product.category ? `<div class="product-category">${product.category}</div>` : ''}
      ${channelsHTML}
      ${printOptions.showPrice && product.salePriceBRL > 0 ? `<div class="product-price">${formatCurrency(product.salePriceBRL)}</div>` : ''}
      ${printOptions.showStock ? `<div class="product-stock">Estoque: ${product.currentStock} un</div>` : ''}
    </div>
`;
    });

    html += `
  </div>
  
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
`;

    return html;
  };

  const executePrint = () => {
    const html = generatePrintHTML();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
    setShowPrintDialog(false);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className={`grid ${getGridClass()} gap-4`}>
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Minimalista */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Galeria de Produtos</h1>
            <p className="text-sm text-muted-foreground">
              {filteredProducts?.length || 0} de {products?.length || 0} produtos • {products?.filter(p => {
                const realStock = p.sku ? getStock(p.sku, p.currentStock) : p.currentStock;
                return realStock > 0;
              }).length || 0} em estoque
            </p>
          </div>
          
          {/* Ações e Controles */}
          <div className="flex items-center gap-2">
            {currentOrder?.items && currentOrder.items.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setLocation('/pedidos')}
                className="gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="font-semibold">{currentOrder.items.length}</span>
                <span className="text-xs text-muted-foreground">
                  {currentOrder.items.length === 1 ? 'item' : 'itens'}
                </span>
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={printCatalog}
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir catálogo
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              variant={gridSize === "4" ? "default" : "outline"}
              size="icon"
              onClick={() => setGridSize("4")}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={gridSize === "6" ? "default" : "outline"}
              size="icon"
              onClick={() => setGridSize("6")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={gridSize === "8" ? "default" : "outline"}
              size="icon"
              onClick={() => setGridSize("8")}
            >
              <Package className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Barra de Ações em Lote */}
        {selectedProducts.size > 0 && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-primary" />
                    <span className="font-semibold">
                      {selectedProducts.size} {selectedProducts.size === 1 ? 'produto selecionado' : 'produtos selecionados'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                  >
                    Limpar seleção
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAll}
                  >
                    Selecionar todos ({filteredProducts?.length || 0})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addSelectedToOrder}
                    disabled={addItemToOrder.isPending}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Adicionar ao pedido
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={printCatalog}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir catálogo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Barra de Busca e Filtros Inline */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Busca */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, categoria ou SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filtros Inline */}
              <div className="flex gap-2 flex-wrap lg:flex-nowrap">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px]">
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
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Estoque" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="available">Disponível</SelectItem>
                    <SelectItem value="low">Baixo</SelectItem>
                    <SelectItem value="out">Esgotado</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={channelFilter} onValueChange={setChannelFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Canais" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="announced">Anunciados</SelectItem>
                    <SelectItem value="not-announced">Não anunciados</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px]">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nome</SelectItem>
                    <SelectItem value="price-asc">Menor Preço</SelectItem>
                    <SelectItem value="price-desc">Maior Preço</SelectItem>
                    <SelectItem value="stock">Estoque</SelectItem>
                  </SelectContent>
                </Select>

                {/* Filtros Avançados - Sheet */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Filter className="h-4 w-4" />
                      {hasActiveFilters && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                          !
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Filtros Avançados</SheetTitle>
                      <SheetDescription>
                        Refine sua busca com filtros de preço e canais
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

                      <div className="space-y-2">
                        <Label htmlFor="specificChannel">Buscar por Canal Específico</Label>
                        <Input
                          id="specificChannel"
                          placeholder="Ex: Mercado Livre, Shopee..."
                          value={specificChannel}
                          onChange={(e) => setSpecificChannel(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Busca parcial - encontra canais que contenham o texto digitado
                        </p>
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
          </CardContent>
        </Card>

        {/* Gallery Grid */}
        {filteredProducts && filteredProducts.length > 0 ? (
          <div className={`grid ${getGridClass()} gap-4`}>
            {filteredProducts.map((product) => {
              // Sempre usar o estoque real da API externa se tiver SKU
              const realStock = product.sku 
                ? getStock(product.sku)  // Remove o fallback para currentStock
                : 0;  // Se não tiver SKU, considera 0
              const isLowStock = realStock <= (product.minStock || 0) && realStock > 0;
              const isOutOfStock = realStock === 0;

              return (
                <Card
                  key={product.id}
                  className={`group cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden border-2 hover:border-primary/50 ${
                    selectedProducts.has(product.id) ? 'ring-2 ring-primary border-primary' : ''
                  }`}
                  onClick={() => {
                    console.log('[Galeria] Navegando para:', `/produtos/${product.id}?from=galeria`);
                    setLocation(`/produtos/${product.id}?from=galeria`);
                  }}
                >
                  {/* Image Container - Minimalista */}
                  <div className="relative aspect-square bg-muted/30 overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-16 w-16 text-muted-foreground/20" />
                      </div>
                    )}
                    
                    {/* Checkbox de Seleção - Canto Superior Esquerdo */}
                    <div 
                      className="absolute top-2 left-2 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="bg-white rounded-md p-1 shadow-lg">
                        <Checkbox
                          checked={selectedProducts.has(product.id)}
                          onCheckedChange={() => toggleProductSelection(product.id)}
                        />
                      </div>
                    </div>

                    {/* Botão Adicionar ao Carrinho - Canto Inferior Direito */}
                    <div className="absolute bottom-2 right-2 z-10">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-9 w-9 rounded-full shadow-lg hover:scale-110 transition-transform"
                        onClick={(e) => handleAddToOrder(e, product)}
                        title="Adicionar ao Pedido"
                        disabled={addItemToOrder.isPending}
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Menu de Opções - Canto Superior Direito (ao lado do Stock) */}
                    <div className="absolute top-2 right-2 z-10 flex gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 rounded-full shadow-lg backdrop-blur-sm"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(e as any, product.id);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(e as any, product.id, product.name);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {/* Stock Badge - Abaixo do Menu */}
                    <div className="absolute top-12 right-2">
                      {isOutOfStock ? (
                        <Badge variant="destructive" className="shadow-lg backdrop-blur-sm">
                          Esgotado (0 un)
                        </Badge>
                      ) : isLowStock ? (
                        <Badge variant="outline" className="bg-yellow-500/90 text-white border-yellow-600 shadow-lg backdrop-blur-sm">
                          Baixo ({realStock} un)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-500/90 text-white border-green-600 shadow-lg backdrop-blur-sm">
                          {realStock} un
                        </Badge>
                      )}
                    </div>

                    {/* Category Badge - Canto Inferior */}
                    {product.category && (
                      <div className="absolute bottom-2 left-2">
                        <Badge variant="secondary" className="shadow-lg backdrop-blur-sm">
                          {product.category}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Product Info - Minimalista */}
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div>
                        <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                          {product.name}
                        </h3>
                        {product.sku && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {product.sku}
                          </p>
                        )}
                      </div>

                      {/* Badges de Canais Anunciados */}
                      <div className="flex items-center gap-1.5">
                        {product.advertisedChannels && product.advertisedChannels.length > 0 ? (
                          <div className="flex flex-wrap gap-1 flex-1">
                            {product.advertisedChannels.slice(0, 3).map((channel) => (
                              <Badge
                                key={channel}
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200"
                              >
                                {channel}
                              </Badge>
                            ))}
                            {product.advertisedChannels.length > 3 && (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200"
                              >
                                +{product.advertisedChannels.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-[9px] text-muted-foreground flex-1">Sem canais</span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 hover:bg-primary hover:text-primary-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            openChannelsDialog(product.id);
                          }}
                          title="Editar canais anunciados"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      {product.salePriceBRL > 0 && (
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-xs text-muted-foreground">Preço</span>
                          <span className="font-bold text-sm text-green-600">
                            {formatCurrency(product.salePriceBRL)}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center space-y-3">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <div>
                <h3 className="font-semibold text-lg">Nenhum produto encontrado</h3>
                <p className="text-muted-foreground text-sm">
                  {hasActiveFilters
                    ? "Tente ajustar os filtros"
                    : "Comece cadastrando seus produtos"}
                </p>
              </div>
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Dialog de Configuração de Impressão */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Configurar Impressão do Catálogo</DialogTitle>
            <DialogDescription>
              {selectedProducts.size} {selectedProducts.size === 1 ? 'produto selecionado' : 'produtos selecionados'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Informações a exibir</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showName"
                    checked={printOptions.showName}
                    onCheckedChange={(checked) =>
                      setPrintOptions({ ...printOptions, showName: !!checked })
                    }
                  />
                  <label htmlFor="showName" className="text-sm cursor-pointer">
                    Nome do produto
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showSku"
                    checked={printOptions.showSku}
                    onCheckedChange={(checked) =>
                      setPrintOptions({ ...printOptions, showSku: !!checked })
                    }
                  />
                  <label htmlFor="showSku" className="text-sm cursor-pointer">
                    SKU
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showCategory"
                    checked={printOptions.showCategory}
                    onCheckedChange={(checked) =>
                      setPrintOptions({ ...printOptions, showCategory: !!checked })
                    }
                  />
                  <label htmlFor="showCategory" className="text-sm cursor-pointer">
                    Categoria
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showPrice"
                    checked={printOptions.showPrice}
                    onCheckedChange={(checked) =>
                      setPrintOptions({ ...printOptions, showPrice: !!checked })
                    }
                  />
                  <label htmlFor="showPrice" className="text-sm cursor-pointer">
                    Preço
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showStock"
                    checked={printOptions.showStock}
                    onCheckedChange={(checked) =>
                      setPrintOptions({ ...printOptions, showStock: !!checked })
                    }
                  />
                  <label htmlFor="showStock" className="text-sm cursor-pointer">
                    Estoque
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showChannels"
                    checked={printOptions.showChannels}
                    onCheckedChange={(checked) =>
                      setPrintOptions({ ...printOptions, showChannels: !!checked })
                    }
                  />
                  <label htmlFor="showChannels" className="text-sm cursor-pointer">
                    Locais anunciados
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageSize">Tamanho da imagem</Label>
              <Select
                value={printOptions.imageSize}
                onValueChange={(value: "small" | "medium" | "large") =>
                  setPrintOptions({ ...printOptions, imageSize: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Pequeno</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="large">Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="columns">Colunas por página</Label>
              <Select
                value={printOptions.columns.toString()}
                onValueChange={(value) =>
                  setPrintOptions({ ...printOptions, columns: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 colunas</SelectItem>
                  <SelectItem value="3">3 colunas</SelectItem>
                  <SelectItem value="4">4 colunas</SelectItem>
                  <SelectItem value="5">5 colunas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrintDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={executePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

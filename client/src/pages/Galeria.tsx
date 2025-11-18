import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/currency";
import { useLocation } from "wouter";
import { Search, Package, AlertTriangle, Printer, Settings2, Filter, X } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Galeria() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filtros
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  
  // Configurações de impressão
  const [printConfig, setPrintConfig] = useState({
    showSku: true,
    showCategory: true,
    showStock: true,
    showPrice: true,
    showStockBadge: false,
    columns: "8" as "4" | "6" | "8",
    imageSize: "medium" as "small" | "medium" | "large",
  });
  
  const { data: products, isLoading } = trpc.products.list.useQuery();
  const utils = trpc.useUtils();
  const { data: currentOrder } = trpc.orders.current.useQuery();
  const addItemToOrder = trpc.orders.addItem.useMutation({
    onSuccess: () => {
      utils.orders.current.invalidate();
      toast.success("Produto adicionado ao pedido");
    },
  });

  // For quick add with price from last import
  const [addingProduct, setAddingProduct] = useState<any | null>(null);
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [addUnitPriceUSD, setAddUnitPriceUSD] = useState<number>(0);
  const lastImportPriceQuery = trpc.products.lastImportPrice.useQuery(
    { productId: addingProduct?.id || '' },
    { enabled: false }
  );

  // Extrair categorias únicas
  const categories = useMemo(() => {
    if (!products) return [];
    const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return uniqueCategories.sort();
  }, [products]);

  // Aplicar filtros
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    return products.filter(product => {
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
      if (stockFilter === "low" && product.currentStock > (product.minStock ?? 0)) {
        return false;
      }
      if (stockFilter === "out" && product.currentStock > 0) {
        return false;
      }
      if (stockFilter === "available" && product.currentStock === 0) {
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

      return true;
    });
  }, [products, searchTerm, categoryFilter, stockFilter, priceMin, priceMax]);

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setStockFilter("all");
    setPriceMin("");
    setPriceMax("");
  };

  const hasActiveFilters = searchTerm || categoryFilter !== "all" || stockFilter !== "all" || priceMin || priceMax;

  const handlePrint = () => {
    setDialogOpen(false);
    
    // Criar janela do catálogo
    const catalogWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!catalogWindow) return;

    // Gerar HTML do catálogo
    const catalogHTML = generateCatalogHTML();
    catalogWindow.document.write(catalogHTML);
    catalogWindow.document.close();

    // Aguardar carregar e abrir diálogo de impressão
    catalogWindow.onload = () => {
      catalogWindow.print();
    };
  };

  const generateCatalogHTML = () => {
    const gridClass = printConfig.columns === "4" ? "grid-cols-4" : 
                      printConfig.columns === "6" ? "grid-cols-6" : "grid-cols-8";
    
    const productsHTML = filteredProducts?.map(product => `
      <div class="product-card">
        <div class="product-image">
          ${product.imageUrl 
            ? `<img src="${product.imageUrl}" alt="${product.name}" />` 
            : `<div class="no-image">Sem Imagem</div>`
          }
          ${printConfig.showCategory && product.category ? `
            <div class="badge badge-category">${product.category}</div>
          ` : ''}
          ${printConfig.showStockBadge ? `
            <div class="badge badge-stock ${
              product.currentStock === 0 ? 'out-of-stock' : 
              product.currentStock <= (product.minStock || 0) ? 'low-stock' : 'in-stock'
            }">
              ${product.currentStock === 0 ? 'Sem Estoque' : 
                product.currentStock <= (product.minStock || 0) ? 'Estoque Baixo' : 'Em Estoque'}
            </div>
          ` : ''}
        </div>
        <div class="product-info">
          <h3 class="product-name">${product.name}</h3>
          ${printConfig.showSku && product.sku ? `<p class="product-sku">SKU: ${product.sku}</p>` : ''}
          ${(printConfig.showStock || printConfig.showPrice) ? `
            <div class="product-details">
              ${printConfig.showStock ? `
                <div class="detail-item">
                  <span class="label">Estoque</span>
                  <span class="value">${product.currentStock} un</span>
                </div>
              ` : ''}
              ${printConfig.showPrice && product.salePriceBRL > 0 ? `
                <div class="detail-item">
                  <span class="label">Preço</span>
                  <span class="value price">${formatCurrency(product.salePriceBRL)}</span>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    `).join('') || '';

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Catálogo de Produtos</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: landscape;
      margin: 1cm;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: white;
      padding: 20px;
    }
    
    .catalog-header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #000;
    }
    
    .catalog-header h1 {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    .catalog-header .date {
      font-size: 14px;
      color: #666;
    }
    
    .products-grid {
      display: grid;
      grid-template-columns: repeat(${printConfig.columns}, 1fr);
      gap: 15px;
    }
    
    .product-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      background: white;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    .product-image {
      position: relative;
      width: 100%;
      padding-top: ${printConfig.imageSize === 'small' ? '75%' : printConfig.imageSize === 'large' ? '133%' : '100%'};
      background: #f3f4f6;
      overflow: hidden;
    }
    
    .product-image img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .no-image {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #9ca3af;
      font-size: 14px;
      font-weight: 500;
    }
    
    .badge {
      position: absolute;
      padding: 4px 8px;
      font-size: 10px;
      font-weight: 600;
      border-radius: 4px;
      text-transform: uppercase;
    }
    
    .badge-category {
      top: 8px;
      left: 8px;
      background: #6b7280;
      color: white;
    }
    
    .badge-stock {
      top: 8px;
      right: 8px;
    }
    
    .badge-stock.in-stock {
      background: #10b981;
      color: white;
    }
    
    .badge-stock.low-stock {
      background: #f59e0b;
      color: white;
    }
    
    .badge-stock.out-of-stock {
      background: #ef4444;
      color: white;
    }
    
    .product-info {
      padding: 12px;
    }
    
    .product-name {
      font-size: 13px;
      font-weight: 600;
      line-height: 1.3;
      margin-bottom: 4px;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    
    .product-sku {
      font-size: 10px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    
    .product-details {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
    }
    
    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .detail-item .label {
      font-size: 9px;
      color: #6b7280;
      text-transform: uppercase;
    }
    
    .detail-item .value {
      font-size: 12px;
      font-weight: 600;
    }
    
    .detail-item .price {
      color: #10b981;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      .product-card {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="catalog-header">
    <h1>Catálogo de Produtos</h1>
    <p class="date">${new Date().toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    })}</p>
  </div>
  
  <div class="products-grid">
    ${productsHTML}
  </div>
</body>
</html>
    `;
  };

  const getGridCols = () => {
    const cols = printConfig.columns;
    if (cols === "4") return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 print:grid-cols-4";
    if (cols === "6") return "grid-cols-2 md:grid-cols-4 lg:grid-cols-6 print:grid-cols-6";
    return "grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 print:grid-cols-8";
  };

  const getImageAspect = () => {
    if (printConfig.imageSize === "small") return "aspect-square print:aspect-[4/3]";
    if (printConfig.imageSize === "large") return "aspect-square print:aspect-[3/4]";
    return "aspect-square";
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Galeria de Produtos</h1>
            <p className="text-muted-foreground">
              Visualização focada nas imagens dos produtos
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {[searchTerm, categoryFilter !== "all", stockFilter !== "all", priceMin, priceMax].filter(Boolean).length}
                </Badge>
              )}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir Catálogo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Configurar Impressão do Catálogo</DialogTitle>
                <DialogDescription>
                  Escolha quais informações deseja exibir no catálogo impresso
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Layout */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Layout</Label>
                  <RadioGroup
                    value={printConfig.columns}
                    onValueChange={(value: "4" | "6" | "8") =>
                      setPrintConfig({ ...printConfig, columns: value })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="4" id="cols-4" />
                      <Label htmlFor="cols-4" className="font-normal cursor-pointer">
                        4 colunas (mais espaçoso)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="6" id="cols-6" />
                      <Label htmlFor="cols-6" className="font-normal cursor-pointer">
                        6 colunas (equilibrado)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="8" id="cols-8" />
                      <Label htmlFor="cols-8" className="font-normal cursor-pointer">
                        8 colunas (mais compacto)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Tamanho das Imagens */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Tamanho das Imagens</Label>
                  <RadioGroup
                    value={printConfig.imageSize}
                    onValueChange={(value: "small" | "medium" | "large") =>
                      setPrintConfig({ ...printConfig, imageSize: value })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="small" id="img-small" />
                      <Label htmlFor="img-small" className="font-normal cursor-pointer">
                        Pequeno
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="img-medium" />
                      <Label htmlFor="img-medium" className="font-normal cursor-pointer">
                        Médio (recomendado)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="large" id="img-large" />
                      <Label htmlFor="img-large" className="font-normal cursor-pointer">
                        Grande
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Informações a exibir */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Informações a Exibir</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-sku"
                        checked={printConfig.showSku}
                        onCheckedChange={(checked) =>
                          setPrintConfig({ ...printConfig, showSku: checked as boolean })
                        }
                      />
                      <Label htmlFor="show-sku" className="font-normal cursor-pointer">
                        Código SKU
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-category"
                        checked={printConfig.showCategory}
                        onCheckedChange={(checked) =>
                          setPrintConfig({ ...printConfig, showCategory: checked as boolean })
                        }
                      />
                      <Label htmlFor="show-category" className="font-normal cursor-pointer">
                        Categoria
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-stock"
                        checked={printConfig.showStock}
                        onCheckedChange={(checked) =>
                          setPrintConfig({ ...printConfig, showStock: checked as boolean })
                        }
                      />
                      <Label htmlFor="show-stock" className="font-normal cursor-pointer">
                        Quantidade em Estoque
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-price"
                        checked={printConfig.showPrice}
                        onCheckedChange={(checked) =>
                          setPrintConfig({ ...printConfig, showPrice: checked as boolean })
                        }
                      />
                      <Label htmlFor="show-price" className="font-normal cursor-pointer">
                        Preço de Venda
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-stock-badge"
                        checked={printConfig.showStockBadge}
                        onCheckedChange={(checked) =>
                          setPrintConfig({ ...printConfig, showStockBadge: checked as boolean })
                        }
                      />
                      <Label htmlFor="show-stock-badge" className="font-normal cursor-pointer">
                        Status do Estoque (badges)
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button onClick={handlePrint} className="flex-1">
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Painel de Filtros */}
        {showFilters && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Filtros</CardTitle>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="search-filter">Buscar</Label>
                  <Input
                    id="search-filter"
                    placeholder="Nome, SKU ou categoria..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category!}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock-filter">Estoque</Label>
                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger id="stock-filter">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="available">Disponível</SelectItem>
                      <SelectItem value="low">Estoque Baixo</SelectItem>
                      <SelectItem value="out">Sem Estoque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                Exibindo {filteredProducts?.length || 0} de {products?.length || 0} produtos
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{filteredProducts?.length || 0} produtos encontrados</span>
          <span>•</span>
          <span>{products?.filter(p => p.currentStock > 0).length || 0} em estoque</span>
        </div>

        {/* Gallery Grid - configurável */}
        {filteredProducts && filteredProducts.length > 0 ? (
          <div className={`grid ${getGridCols()} gap-4`}>
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="group cursor-pointer hover:shadow-lg transition-all overflow-hidden"
                onClick={() => setLocation(`/produtos/${product.id}`)}
              >
                {/* Image Container */}
                <div className={`relative ${getImageAspect()} bg-muted overflow-hidden`}>
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-20 w-20 text-muted-foreground/30" />
                    </div>
                  )}
                  
                  {/* Stock Badge - condicional */}
                  {printConfig.showStockBadge && (
                    <div className="absolute top-3 right-3">
                      {product.currentStock === 0 ? (
                        <Badge variant="destructive" className="shadow-lg">
                          Sem Estoque
                        </Badge>
                      ) : product.currentStock <= (product.minStock || 0) ? (
                        <Badge variant="outline" className="bg-yellow-500/90 text-white border-yellow-600 shadow-lg">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Baixo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-500/90 text-white border-green-600 shadow-lg">
                          Disponível
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Category Badge - condicional */}
                  {printConfig.showCategory && product.category && (
                    <div className="absolute top-3 left-3">
                      <Badge variant="secondary" className="shadow-lg">
                        {product.category}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <CardContent className="p-4 space-y-2">
                  <div>
                    <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                    {printConfig.showSku && product.sku && (
                      <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                    )}
                  </div>

                  {(printConfig.showStock || printConfig.showPrice) && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      {printConfig.showStock && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Estoque</p>
                          <p className="font-semibold text-sm">{product.currentStock} un</p>
                        </div>
                      )}
                      
                      {printConfig.showPrice && product.salePriceBRL > 0 && (
                        <div className="space-y-1 text-right">
                          <p className="text-xs text-muted-foreground">Preço</p>
                          <p className="font-semibold text-sm text-green-600">
                            {formatCurrency(product.salePriceBRL)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-2 flex justify-end">
                    <Button
                      onClick={async (e) => {
                        e.stopPropagation();
                        // Open modal and prefetch last import price
                        setAddingProduct(product);
                        setAddQuantity(1);
                        setAddUnitPriceUSD(0);
                        try {
                          const res = await lastImportPriceQuery.refetch();
                          if (res?.data) setAddUnitPriceUSD((res.data || 0) / 100);
                        } catch (err) {
                          // ignore
                        }
                      }}
                      variant="ghost"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar ao Pedido
                    </Button>
                  </div>
                  {/* Add-to-order modal */}
                  <Dialog open={!!addingProduct} onOpenChange={(open) => { if (!open) setAddingProduct(null); }}>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Adicionar ao Pedido</DialogTitle>
                        <DialogDescription>
                          Ajuste a quantidade e o preço em USD antes de adicionar ao Pedido.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div>
                          <Label>Produto</Label>
                          <div className="mt-1 font-medium">{addingProduct?.name}</div>
                        </div>
                        <div>
                          <Label>Quantidade</Label>
                          <Input type="number" min={1} value={addQuantity} onChange={(e:any) => setAddQuantity(parseInt(e.target.value) || 1)} />
                        </div>
                        <div>
                          <Label>Preço Unit. (USD)</Label>
                          <Input type="number" step="0.01" value={addUnitPriceUSD} onChange={(e:any) => setAddUnitPriceUSD(parseFloat(e.target.value) || 0)} />
                        </div>

                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => setAddingProduct(null)}>Cancelar</Button>
                          <Button onClick={() => {
                            if (!currentOrder?.order?.id || !addingProduct) return;
                            addItemToOrder.mutate({
                              orderId: currentOrder.order.id,
                              productId: addingProduct.id,
                              quantity: addQuantity,
                              unitPriceUSD: Math.round(addUnitPriceUSD * 100),
                            });
                            setAddingProduct(null);
                          }}>
                            Adicionar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Custo Médio - sempre oculto */}
                  {product.averageCostBRL > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Custo Médio:</span>
                        <span className="font-medium">{formatCurrency(product.averageCostBRL)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center space-y-3">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <div>
                <h3 className="font-semibold text-lg">Nenhum produto encontrado</h3>
                <p className="text-muted-foreground text-sm">
                  {searchTerm
                    ? "Tente buscar com outros termos"
                    : "Comece cadastrando seus produtos"}
                </p>
              </div>
              {!searchTerm && (
                <Button onClick={() => setLocation("/produtos/novo")}>
                  Cadastrar Produto
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}


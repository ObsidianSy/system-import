import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/currency";
import { Plus, Package, AlertTriangle, Filter, X } from "lucide-react";
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
import { StockBadge } from "@/components/ui/stock-badge";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { useExternalStock } from "@/_core/hooks/useExternalStock";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Produtos() {
  const [, setLocation] = useLocation();
  const { data: products, isLoading } = trpc.products.list.useQuery();

  // Extract SKUs and fetch external stock using custom hook
  const productsWithSkus = useMemo(() => 
    products?.filter(p => p.sku).map(p => p.sku!) || [],
    [products]
  );

  const { getStock, isLoading: isLoadingExternalStock } = useExternalStock(productsWithSkus);

  // Estados dos filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);

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
      // Filtro de busca por nome ou SKU
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          product.name.toLowerCase().includes(search) ||
          product.sku?.toLowerCase().includes(search) ||
          product.description?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Filtro de categoria
      if (categoryFilter !== "all" && product.category !== categoryFilter) {
        return false;
      }

      // Filtro de estoque (usar estoque real se disponível)
      const realStock = product.sku ? getStock(product.sku, product.currentStock) : product.currentStock;
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
        const minPrice = parseFloat(priceMin) * 100; // converter para centavos
        if (product.salePriceBRL < minPrice) return false;
      }
      if (priceMax) {
        const maxPrice = parseFloat(priceMax) * 100; // converter para centavos
        if (product.salePriceBRL > maxPrice) return false;
      }

      return true;
    });
  }, [products, searchTerm, categoryFilter, stockFilter, priceMin, priceMax, getStock]);

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setStockFilter("all");
    setPriceMin("");
    setPriceMax("");
  };

  const hasActiveFilters = searchTerm || categoryFilter !== "all" || stockFilter !== "all" || priceMin || priceMax;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
            <p className="text-muted-foreground">
              Gerencie seu catálogo de produtos
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
            <Button onClick={() => setLocation("/produtos/novo")}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
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
                  <Label htmlFor="search">Buscar</Label>
                  <Input
                    id="search"
                    placeholder="Nome, SKU ou descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger id="category">
                      <SelectValue />
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
                  <Label htmlFor="stock">Estoque</Label>
                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger id="stock">
                      <SelectValue />
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
                Exibindo {filteredProducts.length} de {products?.length || 0} produtos
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Lista de Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : products && products.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>NCM</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Estoque Real</TableHead>
                    <TableHead className="text-right">Total Comprado</TableHead>
                    <TableHead className="text-right">Estoque Mínimo</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const isLowStock = product.currentStock <= (product.minStock ?? 0);
                    return (
                      <TableRow
                        key={product.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setLocation(`/produtos/${product.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-10 w-10 rounded object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{product.name}</div>
                              {product.description && (
                                <div className="text-sm text-muted-foreground line-clamp-1">
                                  {product.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{product.sku || "-"}</TableCell>
                        <TableCell>{product.ncmCode || "-"}</TableCell>
                        <TableCell>{product.category || "-"}</TableCell>
                        <TableCell className="text-right">
                          {isLoadingExternalStock ? (
                            <Skeleton className="h-5 w-16 ml-auto" />
                          ) : product.sku ? (
                            <StockBadge stock={getStock(product.sku)} variant="compact" />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {product.currentStock}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.minStock ?? 0}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {product.salePriceBRL > 0 ? formatCurrency(product.salePriceBRL) : "-"}
                        </TableCell>
                        <TableCell>
                          {isLowStock ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Baixo
                            </Badge>
                          ) : (
                            <Badge variant="default">Normal</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  Comece criando seu primeiro produto
                </p>
                <Button onClick={() => setLocation("/produtos/novo")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Produto
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


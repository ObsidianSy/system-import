import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Search, Package, AlertTriangle, Printer } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Galeria() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: products, isLoading } = trpc.products.list.useQuery();

  const filteredProducts = products?.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);
  };

  const handlePrint = () => {
    window.print();
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
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Galeria de Produtos</h1>
            <p className="text-muted-foreground">
              Visualização focada nas imagens dos produtos
            </p>
          </div>
          <Button onClick={handlePrint} variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md print:hidden">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground print:hidden">
          <span>{filteredProducts?.length || 0} produtos encontrados</span>
          <span>•</span>
          <span>{products?.filter(p => p.currentStock > 0).length || 0} em estoque</span>
        </div>

        {/* Gallery Grid - 8 colunas */}
        {filteredProducts && filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 print:gap-2">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="group cursor-pointer hover:shadow-lg transition-all overflow-hidden"
                onClick={() => setLocation(`/produtos/${product.id}`)}
              >
                {/* Image Container */}
                <div className="relative aspect-square bg-muted overflow-hidden">
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
                  
                  {/* Stock Badge */}
                  <div className="absolute top-3 right-3">
                    {product.currentStock === 0 ? (
                      <Badge variant="destructive" className="shadow-lg">
                        Sem Estoque
                      </Badge>
                    ) : product.currentStock <= (product.minStock || 0) ? (
                      <Badge variant="outline" className="bg-yellow-500/90 text-white border-yellow-600 shadow-lg">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Estoque Baixo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-500/90 text-white border-green-600 shadow-lg">
                        Em Estoque
                      </Badge>
                    )}
                  </div>

                  {/* Category Badge */}
                  {product.category && (
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
                    {product.sku && (
                      <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Estoque</p>
                      <p className="font-semibold text-sm">{product.currentStock} un</p>
                    </div>
                    
                    {product.salePriceBRL > 0 && (
                      <div className="space-y-1 text-right">
                        <p className="text-xs text-muted-foreground">Preço</p>
                        <p className="font-semibold text-sm text-green-600">
                          {formatCurrency(product.salePriceBRL)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Custo Médio - oculto na impressão */}
                  {product.averageCostBRL > 0 && (
                    <div className="pt-2 border-t print:hidden">
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


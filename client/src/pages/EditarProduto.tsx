import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { formatCurrency, calculateSalePrice } from "@/lib/currency";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Save, Upload, Trash2, Calculator, Plus, X, Tag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";

export default function EditarProduto() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/produtos/:id/editar");
  const productId = params?.id;
  
  // Check URL params to determine where user came from
  const searchParams = new URLSearchParams(window.location.search);
  const fromPage = searchParams.get('from');
  const previousPath = fromPage === 'galeria' ? '/galeria' : `/produtos/${productId}`;
  
  const { data: product, isLoading } = trpc.products.get.useQuery(
    { id: productId! },
    { enabled: !!productId }
  );

  const utils = trpc.useUtils();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [supplierProductCode, setSupplierProductCode] = useState("");
  const [ncmCode, setNcmCode] = useState("");
  const [category, setCategory] = useState("");
  const [currentStock, setCurrentStock] = useState("");
  const [minStock, setMinStock] = useState("");
  const [salePriceBRL, setSalePriceBRL] = useState("");
  const [averageCostUSD, setAverageCostUSD] = useState("");
  const [lastImportUnitPriceUSD, setLastImportUnitPriceUSD] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [advertisedChannels, setAdvertisedChannels] = useState<string[]>([]);
  const [newChannel, setNewChannel] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Populate form when data loads
  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || "");
      setSku(product.sku || "");
      setSupplierProductCode(product.supplierProductCode || "");
      setNcmCode(product.ncmCode || "");
      setCategory(product.category || "");
      setCurrentStock(product.currentStock?.toString() || "0");
      setMinStock(product.minStock?.toString() || "0");
      setSalePriceBRL(product.salePriceBRL ? (product.salePriceBRL / 100).toFixed(2) : "");
      setAverageCostUSD(product.averageCostUSD ? (product.averageCostUSD / 100).toFixed(2) : "");
      setLastImportUnitPriceUSD(product.lastImportUnitPriceUSD ? (product.lastImportUnitPriceUSD / 100).toFixed(2) : "");
      setImageUrl(product.imageUrl || "");
      setAdvertisedChannels(product.advertisedChannels || []);
    }
  }, [product]);

  const updateProduct = trpc.products.update.useMutation({
    onSuccess: async () => {
      if (imageFile) {
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("Falha ao ler imagem"));
            reader.readAsDataURL(imageFile);
          });
          const base64Data = base64.split(',')[1];
          await uploadImage.mutateAsync({
            productId: productId!,
            imageData: base64Data,
            mimeType: imageFile.type,
          });
        } catch {
          toast.error("Produto salvo, mas erro ao enviar imagem");
        }
      }
      toast.success("Produto atualizado com sucesso!");
      utils.products.list.invalidate();
      utils.products.get.invalidate({ id: productId! });
      setLocation(previousPath);
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar produto: " + error.message);
    },
  });

  const uploadImage = trpc.products.uploadImage.useMutation();

  const deleteProduct = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Produto deletado com sucesso!");
      utils.products.list.invalidate();
      setLocation(fromPage === 'galeria' ? '/galeria' : '/produtos');
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("A imagem deve ter no máximo 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setImageUrl("");
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Nome do produto é obrigatório");
      return;
    }

    updateProduct.mutate({
      id: productId!,
      name: name.trim(),
      description: description.trim() || undefined,
      sku: sku.trim() || undefined,
      supplierProductCode: supplierProductCode.trim() || undefined,
      ncmCode: ncmCode.trim() || undefined,
      category: category.trim() || undefined,
      currentStock: parseInt(currentStock) || 0,
      minStock: parseInt(minStock) || 0,
      salePriceBRL: salePriceBRL ? Math.round(parseFloat(salePriceBRL) * 100) : 0,
      averageCostUSD: averageCostUSD ? Math.round(parseFloat(averageCostUSD) * 100) : 0,
      lastImportUnitPriceUSD: lastImportUnitPriceUSD ? Math.round(parseFloat(lastImportUnitPriceUSD) * 100) : 0,
      imageUrl: imageUrl.trim() || undefined,
      advertisedChannels,
    });
  };

  const addChannel = () => {
    if (!newChannel.trim()) {
      toast.error("Digite o nome do canal");
      return;
    }
    if (advertisedChannels.includes(newChannel.trim())) {
      toast.error("Este canal já foi adicionado");
      return;
    }
    setAdvertisedChannels(prev => [...prev, newChannel.trim()]);
    setNewChannel("");
  };

  const removeChannel = (channel: string) => {
    setAdvertisedChannels(prev => prev.filter(c => c !== channel));
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
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
          <Button onClick={() => setLocation(fromPage === 'galeria' ? '/galeria' : '/produtos')}>
            Voltar para {fromPage === 'galeria' ? 'Galeria' : 'Produtos'}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setLocation(previousPath)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Editar Produto</h1>
            <p className="text-muted-foreground">
              Atualize as informações do produto
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              type="button"
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteProduct.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Deletar
            </Button>
            <Button type="submit" disabled={updateProduct.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações do Produto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Camiseta Básica"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição detalhada do produto..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU / Código Interno</Label>
                <Input
                  id="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Ex: CAM-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplierProductCode">Código do Fornecedor</Label>
                <Input
                  id="supplierProductCode"
                  value={supplierProductCode}
                  onChange={(e) => setSupplierProductCode(e.target.value)}
                  placeholder="Código que o fornecedor usa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ncmCode">Código NCM</Label>
                <Input
                  id="ncmCode"
                  value={ncmCode}
                  onChange={(e) => setNcmCode(e.target.value)}
                  placeholder="Ex: 6109.10.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Roupas"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentStock">Estoque Atual</Label>
                <Input
                  id="currentStock"
                  type="number"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  placeholder="Ex: 50"
                />
                <p className="text-xs text-muted-foreground">
                  Quantidade atual em estoque
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minStock">Estoque Mínimo</Label>
                <Input
                  id="minStock"
                  type="number"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  placeholder="Ex: 10"
                />
                <p className="text-xs text-muted-foreground">
                  Alerta quando estoque atingir este valor
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastImportUnitPriceUSD">Custo Última Importação (USD)</Label>
                <Input
                  id="lastImportUnitPriceUSD"
                  type="number"
                  step="0.01"
                  value={lastImportUnitPriceUSD}
                  onChange={(e) => setLastImportUnitPriceUSD(e.target.value)}
                  placeholder="Ex: 10.00"
                />
                <p className="text-xs text-muted-foreground">
                  Custo unitário da última importação (sem impostos/frete)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="averageCostUSD">Custo Médio (USD) - Calculado</Label>
                <Input
                  id="averageCostUSD"
                  type="number"
                  step="0.01"
                  value={averageCostUSD}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Custo médio ponderado em USD (calculado automaticamente)
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="salePriceBRL">Preço de Venda (R$)</Label>
                  {product.averageCostBRL > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const calculatedPrice = calculateSalePrice(product.averageCostBRL);
                        setSalePriceBRL((calculatedPrice / 100).toFixed(2));
                        toast.success("Preço calculado: Custo Médio + R$ 5,00");
                      }}
                    >
                      <Calculator className="h-3 w-3 mr-1" />
                      Calcular Automático
                    </Button>
                  )}
                </div>
                <Input
                  id="salePriceBRL"
                  type="number"
                  step="0.01"
                  value={salePriceBRL}
                  onChange={(e) => setSalePriceBRL(e.target.value)}
                  placeholder="Ex: 150.00"
                />
                <p className="text-xs text-muted-foreground">
                  {product.averageCostBRL > 0 
                    ? `Sugestão: ${formatCurrency(calculateSalePrice(product.averageCostBRL))} (Custo + R$ 5,00)`
                    : "Preço de venda sugerido (opcional)"
                  }
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Imagem do Produto</Label>
              {(imagePreview || imageUrl) ? (
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <img
                      src={imagePreview || imageUrl}
                      alt="Preview"
                      className="h-32 w-32 object-cover rounded-lg border"
                      onError={(e) => {
                        e.currentTarget.src = "https://via.placeholder.com/128?text=Erro";
                      }}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={removeImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {imageFile ? `Arquivo: ${imageFile.name}` : "Imagem via URL"}
                    </p>
                    {!imageFile && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-3 w-3 mr-2" />
                        Trocar por arquivo
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Clique para enviar imagem</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG até 5MB</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">ou cole uma URL</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://exemplo.com/imagem.jpg"
                  />
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="h-5 w-5" />
                <h3 className="font-semibold text-lg">Locais Anunciados</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: ML - Loja A, Shopee, Instagram..."
                    value={newChannel}
                    onChange={(e) => setNewChannel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addChannel();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={addChannel}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {advertisedChannels.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {advertisedChannels.map((channel) => (
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
                          onClick={() => removeChannel(channel)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}

                {advertisedChannels.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum canal adicionado ainda
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="grid gap-2 md:grid-cols-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Estoque Atual:</p>
                  <p className="font-semibold">{product.currentStock} unidades</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Custo Médio:</p>
                  <p className="font-semibold">{formatCurrency(product.averageCostBRL)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Última Atualização:</p>
                  <p className="font-semibold">
                    {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString('pt-BR') : '-'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </DashboardLayout>
  );
}


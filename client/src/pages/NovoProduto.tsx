import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Upload, X, Plus, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function NovoProduto() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    ncmCode: "",
    category: "",
    currentStock: 0,
    minStock: 0,
    lastImportUnitPriceUSD: 0,
    advertisedChannels: [] as string[],
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [newChannel, setNewChannel] = useState("");

  const createProduct = trpc.products.create.useMutation({
    onSuccess: async (product) => {
      // Upload image if selected
      if (imageFile) {
        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = reader.result as string;
            const base64Data = base64.split(',')[1];
            
            await uploadImage.mutateAsync({
              productId: product.id,
              imageData: base64Data,
              mimeType: imageFile.type,
            });
          };
          reader.readAsDataURL(imageFile);
        } catch (error) {
          console.error("Error uploading image:", error);
        }
      }
      
      toast.success("Produto cadastrado com sucesso!");
      setLocation("/produtos");
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar produto: " + error.message);
    },
  });

  const uploadImage = trpc.products.uploadImage.useMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error("O nome do produto é obrigatório");
      return;
    }

    // Convert to cents and set averageCostUSD to match lastImportUnitPriceUSD for initial value
    const lastImportPriceCents = Math.round(formData.lastImportUnitPriceUSD * 100);

    createProduct.mutate({
      ...formData,
      lastImportUnitPriceUSD: lastImportPriceCents,
      averageCostUSD: lastImportPriceCents, // Initialize average cost with the first import price
    });
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const addChannel = () => {
    if (!newChannel.trim()) {
      toast.error("Digite o nome do canal");
      return;
    }
    if (formData.advertisedChannels.includes(newChannel.trim())) {
      toast.error("Este canal já foi adicionado");
      return;
    }
    setFormData(prev => ({
      ...prev,
      advertisedChannels: [...prev.advertisedChannels, newChannel.trim()]
    }));
    setNewChannel("");
  };

  const removeChannel = (channel: string) => {
    setFormData(prev => ({
      ...prev,
      advertisedChannels: prev.advertisedChannels.filter(c => c !== channel)
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/produtos")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Novo Produto</h1>
            <p className="text-muted-foreground">
              Cadastre um novo produto no catálogo
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Produto</CardTitle>
                  <CardDescription>
                    Dados básicos e identificação do produto
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Produto *</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Colar de liga 51cm"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      placeholder="Descrição detalhada do produto"
                      value={formData.description}
                      onChange={(e) => handleChange("description", e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU / Código</Label>
                      <Input
                        id="sku"
                        placeholder="Ex: PROD-001"
                        value={formData.sku}
                        onChange={(e) => handleChange("sku", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Categoria</Label>
                      <Input
                        id="category"
                        placeholder="Ex: Joias, Acessórios"
                        value={formData.category}
                        onChange={(e) => handleChange("category", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ncmCode">Código NCM</Label>
                      <Input
                        id="ncmCode"
                        placeholder="Ex: 7117.19.90.00"
                        value={formData.ncmCode}
                        onChange={(e) => handleChange("ncmCode", e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Nomenclatura Comum do Mercosul
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="currentStock">Estoque Inicial</Label>
                      <Input
                        id="currentStock"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.currentStock}
                        onChange={(e) => handleChange("currentStock", parseInt(e.target.value) || 0)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Quantidade inicial em estoque
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="minStock">Estoque Mínimo</Label>
                      <Input
                        id="minStock"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.minStock}
                        onChange={(e) => handleChange("minStock", parseInt(e.target.value) || 0)}
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
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.lastImportUnitPriceUSD}
                        onChange={(e) => handleChange("lastImportUnitPriceUSD", parseFloat(e.target.value) || 0)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Custo unitário da última importação (sem impostos/frete)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Locais Anunciados
                  </CardTitle>
                  <CardDescription>
                    Adicione os canais onde este produto está sendo anunciado
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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

                  {formData.advertisedChannels.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.advertisedChannels.map((channel) => (
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

                  {formData.advertisedChannels.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum canal adicionado ainda
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Imagem do Produto</CardTitle>
                  <CardDescription>
                    Adicione uma foto do produto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground text-center px-4">
                          Clique para selecionar uma imagem
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG até 5MB
                        </p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/produtos")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createProduct.isPending}>
              {createProduct.isPending ? "Salvando..." : "Salvar Produto"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}


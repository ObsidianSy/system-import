import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Calculator } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ImportItem {
  productId?: string;
  productName: string;
  productDescription?: string;
  color?: string;
  size?: string;
  quantity: number;
  unitPriceUSD: number;
}

export default function NovaImportacao() {
  const [, setLocation] = useLocation();
  const { data: suppliers } = trpc.suppliers.list.useQuery();
  const { data: products } = trpc.products.list.useQuery();
  const { data: taxConfig } = trpc.taxConfig.getActive.useQuery();

  const [formData, setFormData] = useState({
    invoiceNumber: "",
    supplierId: "",
    importDate: new Date().toISOString().split('T')[0],
    status: "pending" as const,
    exchangeRate: 5.46,
    freightUSD: 0,
    importTaxRate: 60,
    icmsRate: 18,
    otherTaxes: 0,
    shippingMethod: "",
    trackingNumber: "",
    estimatedDelivery: "",
    transactionNumber: "",
    paymentMethod: "",
    notes: "",
  });

  const [items, setItems] = useState<ImportItem[]>([
    { productName: "", quantity: 1, unitPriceUSD: 0 }
  ]);

  // Load tax rates from config
  useEffect(() => {
    if (taxConfig) {
      setFormData(prev => ({
        ...prev,
        importTaxRate: taxConfig.importTaxRate,
        icmsRate: taxConfig.icmsRate,
      }));
    }
  }, [taxConfig]);

  const createImportation = trpc.importations.create.useMutation({
    onSuccess: () => {
      toast.success("Importação registrada com sucesso!");
      setLocation("/importacoes");
    },
    onError: (error) => {
      toast.error("Erro ao registrar importação: " + error.message);
    },
  });

  // Calculate totals
  const subtotalUSD = items.reduce((sum, item) => sum + (item.quantity * item.unitPriceUSD), 0);
  const totalUSD = subtotalUSD + formData.freightUSD;
  const subtotalBRL = subtotalUSD * formData.exchangeRate;
  const freightBRL = formData.freightUSD * formData.exchangeRate;
  const totalBeforeTaxBRL = totalUSD * formData.exchangeRate;
  const importTax = totalBeforeTaxBRL * (formData.importTaxRate / 100);
  const icms = totalBeforeTaxBRL * (formData.icmsRate / 100);
  const totalCostBRL = totalBeforeTaxBRL + importTax + icms + formData.otherTaxes;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplierId) {
      toast.error("Selecione um fornecedor");
      return;
    }

    if (items.length === 0 || !items[0].productName) {
      toast.error("Adicione pelo menos um produto");
      return;
    }

    if (formData.exchangeRate <= 0) {
      toast.error("Taxa de câmbio inválida");
      return;
    }

    createImportation.mutate({
      ...formData,
      importDate: new Date(formData.importDate),
      estimatedDelivery: formData.estimatedDelivery ? new Date(formData.estimatedDelivery) : undefined,
      subtotalUSD,
      items: items.map(item => ({
        ...item,
        productDescription: item.productDescription || undefined,
        color: item.color || undefined,
        size: item.size || undefined,
      })),
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    setItems([...items, { productName: "", quantity: 1, unitPriceUSD: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const selectProduct = (index: number, productId: string) => {
    const product = products?.find(p => p.id === productId);
    if (product) {
      updateItem(index, "productId", productId);
      updateItem(index, "productName", product.name);
      updateItem(index, "productDescription", product.description || "");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/importacoes")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nova Importação</h1>
            <p className="text-muted-foreground">
              Registre uma nova importação com cálculo automático de custos
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Básicos */}
          <Card>
            <CardHeader>
              <CardTitle>Dados da Importação</CardTitle>
              <CardDescription>
                Informações básicas da fatura comercial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Número da Fatura</Label>
                  <Input
                    id="invoiceNumber"
                    placeholder="Ex: TS25101002"
                    value={formData.invoiceNumber}
                    onChange={(e) => handleChange("invoiceNumber", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplierId">Fornecedor *</Label>
                  <Select
                    value={formData.supplierId}
                    onValueChange={(value) => handleChange("supplierId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers?.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="importDate">Data da Importação *</Label>
                  <Input
                    id="importDate"
                    type="date"
                    value={formData.importDate}
                    onChange={(e) => handleChange("importDate", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange("status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="in_transit">Em Trânsito</SelectItem>
                      <SelectItem value="customs">Na Alfândega</SelectItem>
                      <SelectItem value="delivered">Entregue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shippingMethod">Método de Envio</Label>
                  <Input
                    id="shippingMethod"
                    placeholder="Ex: DHL AIR EXPRESS"
                    value={formData.shippingMethod}
                    onChange={(e) => handleChange("shippingMethod", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trackingNumber">Código de Rastreio</Label>
                  <Input
                    id="trackingNumber"
                    placeholder="Ex: 1234567890"
                    value={formData.trackingNumber}
                    onChange={(e) => handleChange("trackingNumber", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedDelivery">Previsão de Entrega</Label>
                  <Input
                    id="estimatedDelivery"
                    type="date"
                    value={formData.estimatedDelivery}
                    onChange={(e) => handleChange("estimatedDelivery", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Método de Pagamento</Label>
                  <Input
                    id="paymentMethod"
                    placeholder="Ex: Mercado Pago"
                    value={formData.paymentMethod}
                    onChange={(e) => handleChange("paymentMethod", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactionNumber">Nº da Transação</Label>
                  <Input
                    id="transactionNumber"
                    placeholder="Ex: 2288021022025..."
                    value={formData.transactionNumber}
                    onChange={(e) => handleChange("transactionNumber", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Produtos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Produtos da Importação</CardTitle>
                  <CardDescription>
                    Adicione os produtos desta importação
                  </CardDescription>
                </div>
                <Button type="button" onClick={addItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Produto
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Produto</TableHead>
                      <TableHead className="w-[150px]">Cor/Variação</TableHead>
                      <TableHead className="w-[100px]">Qtd</TableHead>
                      <TableHead className="w-[120px]">Preço Unit. (USD)</TableHead>
                      <TableHead className="w-[120px]">Total (USD)</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={item.productId || ""}
                            onValueChange={(value) => selectProduct(index, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar produto existente" />
                            </SelectTrigger>
                            <SelectContent>
                              {products?.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.sku || product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Ou digite o nome do produto"
                            value={item.productName}
                            onChange={(e) => updateItem(index, "productName", e.target.value)}
                            className="mt-2"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Ex: Vermelho"
                            value={item.color || ""}
                            onChange={(e) => updateItem(index, "color", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPriceUSD}
                            onChange={(e) => updateItem(index, "unitPriceUSD", parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          ${(item.quantity * item.unitPriceUSD).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Custos e Impostos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Cálculo de Custos e Impostos
              </CardTitle>
              <CardDescription>
                Configure a taxa de câmbio, frete e impostos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="exchangeRate">Taxa de Câmbio (USD → BRL) *</Label>
                  <Input
                    id="exchangeRate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.exchangeRate}
                    onChange={(e) => handleChange("exchangeRate", parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="freightUSD">Frete (USD)</Label>
                  <Input
                    id="freightUSD"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.freightUSD}
                    onChange={(e) => handleChange("freightUSD", parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="importTaxRate">Imposto de Importação (%)</Label>
                  <Input
                    id="importTaxRate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.importTaxRate}
                    onChange={(e) => handleChange("importTaxRate", parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="icmsRate">ICMS (%)</Label>
                  <Input
                    id="icmsRate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.icmsRate}
                    onChange={(e) => handleChange("icmsRate", parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2 md:col-span-4">
                  <Label htmlFor="otherTaxes">Outras Taxas (BRL)</Label>
                  <Input
                    id="otherTaxes"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.otherTaxes}
                    onChange={(e) => handleChange("otherTaxes", parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Resumo de Custos */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-4">Resumo de Custos</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal Produtos (USD):</span>
                      <span className="font-medium">${subtotalUSD.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Frete (USD):</span>
                      <span className="font-medium">${formData.freightUSD.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Total (USD):</span>
                      <span>${totalUSD.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal (BRL):</span>
                      <span className="font-medium">{formatCurrency(subtotalBRL)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Frete (BRL):</span>
                      <span className="font-medium">{formatCurrency(freightBRL)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Imposto de Importação:</span>
                      <span className="font-medium">{formatCurrency(importTax)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ICMS:</span>
                      <span className="font-medium">{formatCurrency(icms)}</span>
                    </div>
                    {formData.otherTaxes > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Outras Taxas:</span>
                        <span className="font-medium">{formatCurrency(formData.otherTaxes)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold pt-2 border-t">
                      <span>Custo Total (BRL):</span>
                      <span className="text-primary">{formatCurrency(totalCostBRL)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Observações adicionais sobre esta importação..."
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/importacoes")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createImportation.isPending}>
              {createImportation.isPending ? "Salvando..." : "Salvar Importação"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}


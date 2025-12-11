import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function EditarImportacaoCompleta() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/importacoes/:id/editar-completa");
  const importationId = params?.id;

  const { data: importation, isLoading } = trpc.importations.get.useQuery(
    { id: importationId! },
    { enabled: !!importationId }
  );

  const { data: suppliers } = trpc.suppliers.list.useQuery();
  const { data: products } = trpc.products.list.useQuery();
  const utils = trpc.useUtils();

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [importDate, setImportDate] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [freightUSD, setFreightUSD] = useState("");
  const [importTaxRate, setImportTaxRate] = useState("60");
  const [icmsRate, setIcmsRate] = useState("18");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<any[]>([]);

  // Populate form when data loads
  useEffect(() => {
    if (importation) {
      setInvoiceNumber(importation.invoiceNumber || "");
      setSupplierId(importation.supplierId);
      setImportDate(new Date(importation.importDate).toISOString().split('T')[0]);
      setExchangeRate(importation.exchangeRate.toString());
      setFreightUSD(importation.freightUSD.toString());
      setNotes(importation.notes || "");
      
      // Calculate tax rates from the stored values
      const totalBeforeTax = importation.totalUSD * importation.exchangeRate;
      const calcImportTaxRate = totalBeforeTax > 0 ? (importation.importTax / totalBeforeTax) * 100 : 60;
      const calcIcmsRate = totalBeforeTax > 0 ? (importation.icms / totalBeforeTax) * 100 : 18;
      
      setImportTaxRate(calcImportTaxRate.toFixed(0));
      setIcmsRate(calcIcmsRate.toFixed(0));
      
      setItems(importation.items?.map((item: any) => ({
        id: item.id,
        productId: item.productId || "",
        productName: item.productName,
        productDescription: item.productDescription || "",
        supplierProductCode: item.supplierProductCode || "",
        color: item.color || "",
        size: item.size || "",
        quantity: item.quantity.toString(),
        unitPriceUSD: item.unitPriceUSD.toString(),
      })) || []);
    }
  }, [importation]);

  const updateImportation = trpc.importations.updateComplete.useMutation({
    onSuccess: () => {
      toast.success("Importação atualizada com sucesso!");
      setLocation(`/importacoes/${importationId}`);
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const handleAddItem = () => {
    setItems([...items, {
      productId: "",
      productName: "",
      productDescription: "",
      supplierProductCode: "",
      color: "",
      size: "",
      quantity: "1",
      unitPriceUSD: "0",
    }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    console.log('handleItemChange:', { index, field, value, totalItems: items.length });
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // If product is selected, auto-fill name and cost
    if (field === "productId" && value) {
      const product = products?.find(p => p.id === value);
      if (product) {
        console.log('Produto encontrado:', product);
        newItems[index].productName = product.name;
        newItems[index].supplierProductCode = product.supplierProductCode || "";
        if (product.lastImportUnitPriceUSD) {
          newItems[index].unitPriceUSD = (product.lastImportUnitPriceUSD / 100).toString();
        }
      }
    }
    
    setItems(newItems);
  };

  const calculateTotals = () => {
    const subtotalUSD = items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPriceUSD) || 0);
    }, 0);
    
    const freight = parseFloat(freightUSD) || 0;
    const totalUSD = subtotalUSD + freight;
    const rate = parseFloat(exchangeRate) || 0;
    const totalBRL = totalUSD * rate;
    
    const importTax = totalBRL * (parseFloat(importTaxRate) / 100);
    const icms = totalBRL * (parseFloat(icmsRate) / 100);
    const totalCostBRL = totalBRL + importTax + icms;
    
    return {
      subtotalUSD,
      totalUSD,
      totalBRL,
      importTax,
      icms,
      totalCostBRL,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supplierId) {
      toast.error("Selecione um fornecedor");
      return;
    }
    
    if (items.length === 0) {
      toast.error("Adicione pelo menos um produto");
      return;
    }
    
    const totals = calculateTotals();
    
    updateImportation.mutate({
      id: importationId!,
      invoiceNumber,
      supplierId,
      importDate: new Date(importDate),
      exchangeRate: parseFloat(exchangeRate),
      subtotalUSD: totals.subtotalUSD,
      freightUSD: parseFloat(freightUSD) || 0,
      importTaxRate: parseFloat(importTaxRate),
      icmsRate: parseFloat(icmsRate),
      notes,
      items: items.map(item => ({
        id: item.id,
        productId: item.productId || undefined,
        productName: item.productName,
        productDescription: item.productDescription,
        supplierProductCode: item.supplierProductCode,
        color: item.color,
        size: item.size,
        quantity: parseFloat(item.quantity),
        unitPriceUSD: parseFloat(item.unitPriceUSD),
      })),
    });
  };

  const totals = calculateTotals();
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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

  if (!importation) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">Importação não encontrada</h3>
          <Button onClick={() => setLocation("/importacoes")}>
            Voltar para Importações
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setLocation(`/importacoes/${importationId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Editar Valores e Produtos</h1>
            <p className="text-xs text-muted-foreground">
              Altere quantidades, preços, impostos, frete e produtos
            </p>
          </div>
          <Button type="submit" disabled={updateImportation.isPending} size="sm">
            <Save className="h-4 w-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>

        {/* Informações Básicas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Informações da Importação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="invoiceNumber" className="text-xs">Número da Fatura</Label>
                <Input
                  id="invoiceNumber"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="import shopee subverse"
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="supplier" className="text-xs">Fornecedor *</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Selecione" />
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

              <div className="space-y-1">
                <Label htmlFor="importDate" className="text-xs">Data da Importação *</Label>
                <Input
                  id="importDate"
                  type="date"
                  value={importDate}
                  onChange={(e) => setImportDate(e.target.value)}
                  required
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="exchangeRate" className="text-xs">Taxa de Câmbio (R$) *</Label>
                <Input
                  id="exchangeRate"
                  type="number"
                  step="0.01"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  placeholder="1"
                  required
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="freightUSD" className="text-xs">Frete (USD) *</Label>
                <Input
                  id="freightUSD"
                  type="number"
                  step="0.01"
                  value={freightUSD}
                  onChange={(e) => setFreightUSD(e.target.value)}
                  placeholder="0"
                  required
                  className="h-8 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="importTaxRate" className="text-xs">Imposto (%)</Label>
                  <Input
                    id="importTaxRate"
                    type="number"
                    step="0.1"
                    value={importTaxRate}
                    onChange={(e) => setImportTaxRate(e.target.value)}
                    placeholder="40"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="icmsRate" className="text-xs">ICMS (%)</Label>
                  <Input
                    id="icmsRate"
                    type="number"
                    step="0.1"
                    value={icmsRate}
                    onChange={(e) => setIcmsRate(e.target.value)}
                    placeholder="1"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes" className="text-xs">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Compra Shopee"
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Produtos */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Produtos</CardTitle>
            <Button type="button" onClick={handleAddItem} size="sm" className="h-7">
              <Plus className="h-3 w-3 mr-1" />
              Adicionar Produto
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {items.map((item, index) => (
                <Card key={index} className="p-2.5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">Produto {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid gap-2 md:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Vincular a Produto Existente</Label>
                        <Select
                          value={item.productId}
                          onValueChange={(value) => handleItemChange(index, "productId", value)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {products?.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.sku || product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Nome do Produto *</Label>
                        <Input
                          value={item.productName}
                          onChange={(e) => handleItemChange(index, "productName", e.target.value)}
                          placeholder="kit beads 6 unidades"
                          required
                          className="h-8 text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Código do Fornecedor</Label>
                        <Input
                          value={item.supplierProductCode}
                          onChange={(e) => handleItemChange(index, "supplierProductCode", e.target.value)}
                          placeholder="Código usado pelo fornecedor"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Cor</Label>
                        <Input
                          value={item.color}
                          onChange={(e) => handleItemChange(index, "color", e.target.value)}
                          placeholder="Cor"
                          className="h-8 text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Tamanho</Label>
                        <Input
                          value={item.size}
                          onChange={(e) => handleItemChange(index, "size", e.target.value)}
                          placeholder="Tamanho"
                          className="h-8 text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Quantidade *</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                          placeholder="10"
                          required
                          className="h-8 text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Preço Unit. USD *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unitPriceUSD}
                          onChange={(e) => handleItemChange(index, "unitPriceUSD", e.target.value)}
                          placeholder="17,84"
                          required
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Descrição</Label>
                      <Textarea
                        value={item.productDescription}
                        onChange={(e) => handleItemChange(index, "productDescription", e.target.value)}
                        placeholder="Descrição do produto..."
                        rows={1}
                        className="text-sm resize-none"
                      />
                    </div>

                    <div className="pt-1 border-t">
                      <p className="text-xs text-right font-semibold">
                        Total: ${((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPriceUSD) || 0)).toFixed(2)} USD
                      </p>
                    </div>
                  </div>
                </Card>
              ))}

              {items.length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Nenhum produto adicionado. Clique em "Adicionar Produto" para começar.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resumo */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Resumo dos Cálculos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal Produtos:</span>
                  <span className="font-medium">${totals.subtotalUSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Frete:</span>
                  <span className="font-medium">${(parseFloat(freightUSD) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5 text-xs">
                  <span className="font-semibold">Total USD:</span>
                  <span className="font-bold">${totals.totalUSD.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total em BRL:</span>
                  <span className="font-medium">{formatCurrency(totals.totalBRL)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Imposto ({importTaxRate}%):</span>
                  <span className="font-medium">{formatCurrency(totals.importTax)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">ICMS ({icmsRate}%):</span>
                  <span className="font-medium">{formatCurrency(totals.icms)}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5">
                  <span className="text-xs font-semibold">Custo Total BRL:</span>
                  <span className="font-bold text-sm">{formatCurrency(totals.totalCostBRL)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </DashboardLayout>
  );
}


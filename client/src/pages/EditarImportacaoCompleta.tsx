import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Save, Plus, Trash2, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
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
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // If product is selected, auto-fill name and cost
    if (field === "productId" && value) {
      const product = products?.find(p => p.id === value);
      if (product) {
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

  const calculateItemCosts = (item: any) => {
    const quantity = parseFloat(item.quantity) || 0;
    const unitPriceUSD = parseFloat(item.unitPriceUSD) || 0;
    const totalUSD = quantity * unitPriceUSD;
    const rate = parseFloat(exchangeRate) || 1;
    
    const totals = calculateTotals();
    const itemProportion = totals.subtotalUSD > 0 ? totalUSD / totals.subtotalUSD : 0;
    const itemCostBRL = (totals.totalCostBRL * itemProportion);
    const unitCostBRL = quantity > 0 ? itemCostBRL / quantity : 0;
    
    return {
      totalUSD,
      unitCostBRL,
      totalCostBRL: itemCostBRL,
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
        {/* Header */}
        <PageHeader
          title="Editar Valores e Produtos"
          description="Altere quantidades, preços, impostos, frete e produtos"
          actions={
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setLocation(`/importacoes/${importationId}`)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button type="submit" disabled={updateImportation.isPending} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </Button>
            </>
          }
        />

        {/* Totais */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Total USD</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                ${totals.totalUSD.toFixed(2)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {formatCurrency(totals.totalBRL)} • Frete: ${(parseFloat(freightUSD) || 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Impostos</p>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(totals.importTax + totals.icms)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                II {importTaxRate}% + ICMS {icmsRate}%
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Custo Total</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatCurrency(totals.totalCostBRL)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0)} unidades • {items.length} produto{items.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
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
            <CardTitle className="text-sm">Produtos Importados</CardTitle>
            <Button type="button" onClick={handleAddItem} size="sm" className="h-8">
              <Plus className="h-3 w-3 mr-1" />
              Adicionar Produto
            </Button>
          </CardHeader>
          <CardContent className="px-2 pb-2">
            {items.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Nenhum produto adicionado. Clique em "Adicionar Produto" para começar.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-20 h-9 text-[10px] p-2">Foto</TableHead>
                      <TableHead className="text-[10px] p-2 min-w-[200px]">SKU / Produto</TableHead>
                      <TableHead className="text-center w-24 h-9 text-[10px] p-2">Qtd</TableHead>
                      <TableHead className="text-right w-28 h-9 text-[10px] p-2">Preço Unit.<br/>(USD)</TableHead>
                      <TableHead className="text-right w-28 h-9 text-[10px] p-2">Total<br/>(USD)</TableHead>
                      <TableHead className="text-right w-28 h-9 text-[10px] p-2">Custo Unit.<br/>(BRL)</TableHead>
                      <TableHead className="text-right w-32 h-9 text-[10px] p-2">Custo Total<br/>(BRL)</TableHead>
                      <TableHead className="w-10 h-9 p-2"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => {
                      const costs = calculateItemCosts(item);
                      const selectedProduct = products?.find(p => p.id === item.productId);
                      
                      return (
                        <TableRow key={index} className="group">
                          <TableCell className="p-2">
                            {selectedProduct?.imageUrl ? (
                              <img
                                src={selectedProduct.imageUrl}
                                alt={item.productName}
                                className="w-16 h-16 object-cover rounded border"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-muted rounded flex items-center justify-center border">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="p-2">
                            <Select
                              value={item.productId}
                              onValueChange={(value) => handleItemChange(index, "productId", value)}
                            >
                              <SelectTrigger className="h-7 text-[11px] w-full">
                                <SelectValue placeholder="Selecionar..." />
                              </SelectTrigger>
                              <SelectContent>
                                {products?.map((product) => (
                                  <SelectItem key={product.id} value={product.id} className="text-xs">
                                    {product.sku ? `${product.sku} - ${product.name}` : product.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {selectedProduct && (
                              <div className="mt-0.5 space-y-0">
                                {selectedProduct.sku && (
                                  <div className="text-[10px] font-semibold text-muted-foreground leading-tight">
                                    {selectedProduct.sku}
                                  </div>
                                )}
                                <div className="text-[10px] text-foreground leading-tight line-clamp-2">
                                  {selectedProduct.name}
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center p-2">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                              className="h-7 text-sm text-center font-semibold w-20 mx-auto"
                              min="1"
                            />
                          </TableCell>
                          <TableCell className="text-right p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.unitPriceUSD}
                              onChange={(e) => handleItemChange(index, "unitPriceUSD", e.target.value)}
                              className="h-7 text-[11px] text-right w-24 ml-auto"
                            />
                          </TableCell>
                          <TableCell className="text-right p-2">
                            <span className="text-sm font-semibold">
                              ${costs.totalUSD.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right p-2">
                            <span className="text-[11px]">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(costs.unitCostBRL)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right p-2">
                            <span className="text-sm font-semibold">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(costs.totalCostBRL)}
                            </span>
                          </TableCell>
                          <TableCell className="p-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumo */}
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Resumo USD</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal Produtos:</span>
                  <span className="font-semibold">${totals.subtotalUSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frete:</span>
                  <span className="font-semibold">${(parseFloat(freightUSD) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5">
                  <span className="font-semibold">Total USD:</span>
                  <span className="font-bold text-lg text-primary">${totals.totalUSD.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Custo Final BRL</CardTitle>
            </CardHeader>
            <CardContent>
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
                  <span className="text-sm font-semibold">Custo Total:</span>
                  <span className="font-bold text-lg text-green-600">{formatCurrency(totals.totalCostBRL)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </DashboardLayout>
  );
}


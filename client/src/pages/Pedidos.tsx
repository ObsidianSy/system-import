import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrencyUSD } from "@/lib/currency";
import { useLocation } from "wouter";
import { Plus, Trash2, Printer } from "lucide-react";

export default function Pedidos() {
  const [, setLocation] = useLocation();
  const { data: products } = trpc.products.list.useQuery();
  const { data: suppliers } = trpc.suppliers.list.useQuery();

  const [supplierId, setSupplierId] = useState<string | undefined>(undefined);
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPriceUSD, setUnitPriceUSD] = useState<number>(0);
  const utils = trpc.useUtils();
  const { data: current } = trpc.orders.current.useQuery();
  const items = current?.items || [];
  const updateItem = trpc.orders.updateItem.useMutation({ onSuccess: () => utils.orders.current.invalidate() });
  const importOrderMutation = trpc.orders.import.useMutation({ onSuccess: () => utils.orders.current.invalidate() });
  const setSupplierMutation = trpc.orders.setSupplier.useMutation({ onSuccess: () => utils.orders.current.invalidate() });

  const addItemMutation = trpc.orders.addItem.useMutation({
    onSuccess: () => {
      utils.orders.current.invalidate();
      setSelectedProductId(undefined);
      setQuantity(1);
      setUnitPriceUSD(0);
    }
  });

  const lastImportPriceQuery = trpc.products.lastImportPrice.useQuery({ productId: selectedProductId || '' }, { enabled: false });

  const addItem = async () => {
    if (!selectedProductId) return;
    const product = products?.find((p: any) => p.id === selectedProductId);
    if (!product) return;
    addItemMutation.mutate({
      orderId: current?.order?.id || '',
      productId: product.id,
      quantity,
      unitPriceUSD: Math.round(unitPriceUSD * 100),
    });
    // Reset inputs
    setSelectedProductId(undefined);
    setQuantity(1);
    setUnitPriceUSD(0);
  };

  const removeItemMutation = trpc.orders.removeItem.useMutation({
    onSuccess: () => utils.orders.current.invalidate(),
  });

  const removeItem = (id: string) => {
    removeItemMutation.mutate({ id });
  };

  const totalUSD = items.reduce((s:any, it:any) => s + (it.quantity * it.unitPriceUSD), 0);

  const generateOrderHTML = () => {
    const supplier = suppliers?.find(s => s.id === supplierId);
    const rows = items.map((it:any) => `
      <tr>
  <td style="padding:8px;border:1px solid #ddd"><img src="${it.imageUrl || ''}" alt="${it.productName || it.name || ''}" style="width:96px;height:96px;object-fit:cover"/></td>
  <td style="padding:8px;border:1px solid #ddd">${it.sku || '-'}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${it.quantity}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatCurrencyUSD(it.unitPriceUSD)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatCurrencyUSD(it.quantity * it.unitPriceUSD)}</td>
      </tr>
    `).join('');

    return `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Pedido</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { margin-bottom: 8px }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; }
          th { background: #f7f7f7; }
          .topline { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px }
        </style>
      </head>
      <body>
        <div class="topline">
          <div>
            <h1>Pedido de Compra</h1>
            <p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>
            <p>Fornecedor: ${supplier?.name || '-'}</p>
          </div>
          <div>
            <p>Imprimir para envio ao fornecedor</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Imagem</th>
              <th>SKU</th>
              <!-- Product column removed to avoid showing undefined values -->
              <th>Quantidade</th>
              <th>Preço Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div style="margin-top: 16px; text-align: right; font-weight:bold">Total: ${formatCurrencyUSD(totalUSD)}</div>
      </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=900,height=800');
    if (!w) return;
    w.document.write(generateOrderHTML());
    w.document.close();
    w.onload = () => w.print();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>
            <p className="text-muted-foreground">Criar e imprimir pedidos para fornecedores</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Novo Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                {/** order supplier persisting */}
                <Select value={supplierId || ''} onValueChange={async val => {
                  setSupplierId(val || undefined);
                  if (!current?.order?.id) return;
                  await setSupplierMutation.mutateAsync({ orderId: current.order.id, supplierId: val || undefined });
                  utils.orders.current.invalidate();
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {(suppliers || []).map((s:any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Produto</Label>
                <Select value={selectedProductId || ''} onValueChange={val => setSelectedProductId(val || undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {(products || []).map((p:any) => (
                      <SelectItem key={p.id} value={p.id}>{p.sku || p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Prefill unit price from last import price when product changes */}
              <div>
                {selectedProductId && (
                  <button
                    className="text-sm text-muted-foreground"
                    onClick={async () => {
                      const res = await lastImportPriceQuery.refetch();
                      if (res?.data) setUnitPriceUSD(res.data / 100);
                    }}
                  >
                    Carregar preço último import (USD)
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input type="number" min={1} value={quantity} onChange={(e:any) => setQuantity(parseInt(e.target.value)||1)} />
              </div>

              <div className="space-y-2">
                <Label>Preço Unit. (USD)</Label>
                <Input type="number" step="0.01" value={unitPriceUSD} onChange={(e:any) => setUnitPriceUSD(parseFloat(e.target.value)||0)} />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar ao Pedido
              </Button>
              <Button variant="outline" onClick={async () => {
                const clearMutation = trpc.orders.clear.useMutation({ onSuccess: () => utils.orders.current.invalidate() });
                if (!current?.order?.id) return;
                await clearMutation.mutateAsync({ orderId: current.order.id });
                setSupplierId(undefined);
              }}>
                Limpar
              </Button>
            </div>

            <div className="mt-6">
              {items.length > 0 ? (
                <div>
                  <table className="w-full text-sm border-collapse border">
                    <thead>
                      <tr>
                        <th className="text-left p-2">Produto</th>
                        <th className="text-left p-2">SKU</th>
                        <th className="text-right p-2">Qtd</th>
                        <th className="text-right p-2">Unit</th>
                        <th className="text-right p-2">Subtotal</th>
                        <th className="p-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it:any, idx:number) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              {it.imageUrl ? <img src={it.imageUrl} className="h-10 w-10 object-cover rounded" /> : null}
                              <div>{it.productName || it.name}</div>
                            </div>
                          </td>
                          <td className="p-2">{it.sku || '-'}</td>
                          <td className="p-2 text-right">
                            <Input type="number" value={it.quantity} onChange={(e:any)=> updateItem.mutate({ id: it.id, quantity: parseInt(e.target.value) || 1 })} className="w-20 ml-auto" />
                          </td>
                          <td className="p-2 text-right">
                            <Input type="number" step="0.01" value={it.unitPriceUSD} onChange={(e:any)=> updateItem.mutate({ id: it.id, unitPriceUSD: Math.round(parseFloat(e.target.value) || 0) })} className="w-28 ml-auto" />
                          </td>
                          <td className="p-2 text-right">{formatCurrencyUSD(it.quantity*it.unitPriceUSD)}</td>
                          <td className="p-2 text-right"><Button variant="ghost" onClick={() => removeItem(it.id)}><Trash2 /></Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex items-center justify-between mt-4">
                    <div className="text-muted-foreground">{items.length} produtos</div>
                    <div className="text-lg font-semibold">Total: {formatCurrencyUSD(totalUSD)}</div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button onClick={handlePrint}>
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimir Pedido
                    </Button>
                    <Button onClick={async () => {
                      if (!current?.order?.id) return;
                      const res = await importOrderMutation.mutateAsync({ orderId: current.order.id });
                      if (res?.importationId) setLocation(`/importacoes/${res.importationId}`);
                    }}>
                      Importar para Importação
                    </Button>
                    <Button variant="outline" onClick={() => window.alert('Enviar para fornecedor (não implementado)')}>
                      Enviar por E-mail
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Nenhum produto no pedido</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrencyUSD } from "@/lib/currency";
import { useLocation } from "wouter";
import { Plus, Trash2, Printer, ShoppingCart, ArrowRight, Mail, FileDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";

export default function Pedidos() {
  const [location, setLocation] = useLocation();
  const { data: products } = trpc.products.list.useQuery();
  const { data: suppliers } = trpc.suppliers.list.useQuery();

  const [supplierId, setSupplierId] = useState<string | undefined>(undefined);
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPriceUSD, setUnitPriceUSD] = useState<number>(0);
  const [freightCostUSD, setFreightCostUSD] = useState<number>(0);
  const utils = trpc.useUtils();
  const { data: current } = trpc.orders.current.useQuery();
  const items = current?.items || [];
  
  const updateItem = trpc.orders.updateItem.useMutation({ 
    onSuccess: () => utils.orders.current.invalidate() 
  });
  
  const importOrderMutation = trpc.orders.import.useMutation({ 
    onSuccess: () => utils.orders.current.invalidate() 
  });
  
  const setSupplierMutation = trpc.orders.setSupplier.useMutation({ 
    onSuccess: () => utils.orders.current.invalidate() 
  });

  const updateFreightMutation = trpc.orders.updateFreight.useMutation({
    onSuccess: () => {
      utils.orders.current.invalidate();
      toast.success("Frete atualizado");
    }
  });

  const clearOrderMutation = trpc.orders.clear.useMutation({ 
    onSuccess: () => {
      utils.orders.current.invalidate();
      setSupplierId(undefined);
      toast.success("Pedido limpo com sucesso");
    }
  });

  const addItemMutation = trpc.orders.addItem.useMutation({
    onSuccess: () => {
      utils.orders.current.invalidate();
      setSelectedProductId(undefined);
      setQuantity(1);
      setUnitPriceUSD(0);
    }
  });

  // Ref para controlar se os produtos da URL já foram adicionados
  const hasAddedFromUrl = useRef(false);

  // Adicionar produtos da URL quando a página carregar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const itemsParam = params.get('items');
    
    if (itemsParam && products && products.length > 0 && current?.order?.id && !hasAddedFromUrl.current) {
      hasAddedFromUrl.current = true;
      const itemsList = itemsParam.split(',');
      let addedCount = 0;
      
      itemsList.forEach(item => {
        const [productId, qty] = item.split(':');
        const quantity = parseInt(qty) || 1;
        const product = products.find((p: any) => p.id === productId);
        
        if (product) {
          addItemMutation.mutate({
            orderId: current.order.id,
            productId: product.id,
            quantity,
            unitPriceUSD: product.lastImportUnitPriceUSD || 0,
          });
          addedCount++;
        }
      });
      
      if (addedCount > 0) {
        toast.success(`${addedCount} produto(s) adicionado(s) ao pedido`);
        // Limpar a URL
        setTimeout(() => {
          window.history.replaceState({}, '', '/pedidos');
        }, 100);
      }
    }
  }, [products, current?.order?.id]);

  const addItem = () => {
    if (!selectedProductId) {
      toast.error("Selecione um produto");
      return;
    }
    const product = products?.find((p: any) => p.id === selectedProductId);
    if (!product) return;
    
    addItemMutation.mutate({
      orderId: current?.order?.id || '',
      productId: product.id,
      quantity,
      unitPriceUSD: Math.round(unitPriceUSD * 100),
    });
    toast.success("Produto adicionado ao pedido");
  };

  const removeItemMutation = trpc.orders.removeItem.useMutation({
    onSuccess: () => {
      utils.orders.current.invalidate();
      toast.success("Item removido");
    },
  });

  const removeItem = (id: string) => {
    removeItemMutation.mutate({ id });
  };

  const totalProductsUSD = items.reduce((s:any, it:any) => s + (it.quantity * it.unitPriceUSD), 0);
  const freightUSD = current?.order?.freightCostUSD || 0;
  const totalUSD = totalProductsUSD + freightUSD;

  const generateOrderHTML = () => {
    const supplier = suppliers?.find(s => s.id === supplierId);
    const rows = items.map((it:any) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd">
          ${it.imageUrl ? `<img src="${it.imageUrl}" alt="${it.productName}" style="width:64px;height:64px;object-fit:cover"/>` : ''}
        </td>
        <td style="padding:8px;border:1px solid #ddd">${it.sku || '-'}</td>
        <td style="padding:8px;border:1px solid #ddd">${it.productName || it.name || '-'}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${it.quantity}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatCurrencyUSD(it.unitPriceUSD / 100)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatCurrencyUSD((it.quantity * it.unitPriceUSD) / 100)}</td>
      </tr>
    `).join('');

    return `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Pedido de Compra</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { margin-bottom: 8px; color: #333; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background: #f7f7f7; font-weight: bold; }
          .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
          .supplier-info { margin-bottom: 20px; }
          .total { margin-top: 20px; text-align: right; font-size: 1.2em; font-weight:bold; }
          .footer { margin-top: 40px; font-size: 0.8em; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Pedido de Compra</h1>
            <p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>
          <div style="text-align: right;">
            <strong>Status:</strong> Rascunho<br>
            <strong>ID:</strong> #${current?.order?.id?.slice(0, 8) || 'NOVO'}
          </div>
        </div>

        <div class="supplier-info">
          <h3>Fornecedor</h3>
          <p>${supplier?.name || 'Não selecionado'}</p>
          ${supplier?.email ? `<p>Email: ${supplier.email}</p>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 80px">Imagem</th>
              <th>SKU</th>
              <th>Produto</th>
              <th style="text-align:right">Qtd</th>
              <th style="text-align:right">Preço Unit.</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="total">Total: ${formatCurrencyUSD(totalUSD / 100)}</div>
        
        <div class="footer">
          <p>Documento gerado automaticamente pelo Sistema de Importação</p>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=900,height=800');
    if (!w) return;
    w.document.write(generateOrderHTML());
    w.document.close();
    // Use setTimeout to ensure content is rendered before printing
    setTimeout(() => w.print(), 300);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Pedidos de Compra"
          description="Crie pedidos para enviar aos seus fornecedores"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Coluna da Esquerda: Formulário de Adição */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuração do Pedido</CardTitle>
                <CardDescription>Selecione o fornecedor e adicione itens</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  <Select 
                    value={supplierId || ''} 
                    onValueChange={async val => {
                      setSupplierId(val || undefined);
                      if (!current?.order?.id) return;
                      await setSupplierMutation.mutateAsync({ orderId: current.order.id, supplierId: val || undefined });
                      utils.orders.current.invalidate();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {(suppliers || []).map((s:any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Custo do Frete (USD)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={freightCostUSD / 100}
                      onChange={(e) => setFreightCostUSD(Math.round((parseFloat(e.target.value) || 0) * 100))}
                      onBlur={() => {
                        if (current?.order?.id) {
                          updateFreightMutation.mutate({
                            orderId: current.order.id,
                            freightCostUSD
                          });
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Custo estimado do frete internacional
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Produto</Label>
                  <Select value={selectedProductId || ''} onValueChange={val => setSelectedProductId(val || undefined)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {(products || []).map((p:any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.sku ? `[${p.sku}] ` : ''}{p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProductId && (
                  <div className="p-3 bg-muted/50 rounded-md text-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-muted-foreground">Último Preço:</span>
                      <span className="font-medium">
                        {(() => {
                          const p = products?.find((p: any) => p.id === selectedProductId);
                          return p?.lastImportUnitPriceUSD ? formatCurrencyUSD(p.lastImportUnitPriceUSD / 100) : '-';
                        })()}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={() => {
                        const product = products?.find((p: any) => p.id === selectedProductId);
                        if (product?.lastImportUnitPriceUSD) {
                          setUnitPriceUSD(product.lastImportUnitPriceUSD / 100);
                        }
                      }}
                    >
                      Usar este preço
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input 
                      type="number" 
                      min={1} 
                      value={quantity} 
                      onChange={(e:any) => setQuantity(parseInt(e.target.value)||1)} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Preço Unit. (USD)</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={unitPriceUSD} 
                      onChange={(e:any) => setUnitPriceUSD(parseFloat(e.target.value)||0)} 
                    />
                  </div>
                </div>

                <Button onClick={addItem} className="w-full" disabled={!selectedProductId}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={handlePrint}
                  disabled={items.length === 0}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir Pedido
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled
                  title="Em breve"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar por Email (em breve)
                </Button>

                <Button 
                  className="w-full justify-start"
                  onClick={async () => {
                    if (!current?.order?.id) return;
                    const res = await importOrderMutation.mutateAsync({ orderId: current.order.id });
                    if (res?.importationId) {
                      toast.success("Pedido convertido em importação!");
                      setLocation(`/importacoes/${res.importationId}`);
                    }
                  }}
                  disabled={items.length === 0}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Gerar Importação
                </Button>

                <Separator className="my-2" />

                <Button 
                  variant="destructive" 
                  className="w-full justify-start"
                  onClick={() => {
                    if (window.confirm("Tem certeza que deseja limpar todo o pedido?")) {
                      if (!current?.order?.id) return;
                      clearOrderMutation.mutate({ orderId: current.order.id });
                    }
                  }}
                  disabled={items.length === 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpar Pedido
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Coluna da Direita: Lista de Itens */}
          <div className="lg:col-span-2">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Itens do Pedido</CardTitle>
                    <CardDescription>
                      {items.length} {items.length === 1 ? 'item adicionado' : 'itens adicionados'}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground mb-1">
                      <div className="flex justify-between gap-4">
                        <span>Produtos:</span>
                        <span>{formatCurrencyUSD(totalProductsUSD / 100)}</span>
                      </div>
                      {freightUSD > 0 && (
                        <div className="flex justify-between gap-4">
                          <span>Frete:</span>
                          <span>{formatCurrencyUSD(freightUSD / 100)}</span>
                        </div>
                      )}
                    </div>
                    <Separator className="my-2" />
                    <div className="text-sm text-muted-foreground mb-1">Total Estimado</div>
                    <div className="text-2xl font-bold text-primary">{formatCurrencyUSD(totalUSD / 100)}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                {items.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right w-[100px]">Qtd</TableHead>
                        <TableHead className="text-right w-[120px]">Preço (USD)</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((it:any) => (
                        <TableRow key={it.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {it.imageUrl ? (
                                <img 
                                  src={it.imageUrl} 
                                  alt={it.productName} 
                                  className="h-10 w-10 object-cover rounded border" 
                                />
                              ) : (
                                <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="font-medium line-clamp-1" title={it.productName || it.name}>
                                {it.productName || it.name}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{it.sku || '-'}</TableCell>
                          <TableCell className="text-right">
                            <Input 
                              type="number" 
                              min="1"
                              value={it.quantity} 
                              onChange={(e:any)=> updateItem.mutate({ id: it.id, quantity: parseInt(e.target.value) || 1 })} 
                              className="w-20 ml-auto h-8" 
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input 
                              type="number" 
                              step="0.01" 
                              value={it.unitPriceUSD / 100} 
                              onChange={(e:any)=> updateItem.mutate({ id: it.id, unitPriceUSD: Math.round((parseFloat(e.target.value) || 0) * 100) })} 
                              className="w-24 ml-auto h-8" 
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrencyUSD((it.quantity * it.unitPriceUSD) / 100)}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive/90"
                              onClick={() => removeItem(it.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState
                    icon={ShoppingCart}
                    title="Seu pedido está vazio"
                    description="Selecione um fornecedor e adicione produtos usando o formulário ao lado."
                  />
                )}
              </CardContent>
              {items.length > 0 && (
                <CardFooter className="bg-muted/20 border-t p-4">
                  <div className="w-full flex items-center justify-between text-sm text-muted-foreground">
                    <div>
                      * Os valores são estimados e podem variar na importação final.
                    </div>
                  </div>
                </CardFooter>
              )}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

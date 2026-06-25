import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { ImportStatusBadge } from "@/components/ImportStatusBadge";
import { trpc } from "@/lib/trpc";
import { Plus, FileText, Package, DollarSign, FileSpreadsheet, Search, Filter, X, TrendingUp, ShoppingCart, Clock, ListPlus, Printer } from "lucide-react";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocation } from "wouter";
import { usePermissions } from "@/hooks/usePermissions";
import { useExternalStock } from "@/_core/hooks/useExternalStock";
import { Checkbox } from "@/components/ui/checkbox";

const statusLabels: Record<string, string> = {
  all: "Todos os Status",
  pending: "Pendente",
  in_transit: "Em Trânsito",
  customs: "Na Alfândega",
  delivered: "Entregue",
  cancelled: "Cancelada",
};


export default function Importacoes() {
  const [, setLocation] = useLocation();
  const { data: importations, isLoading } = trpc.importations.list.useQuery();
  const { data: productsWithAggregates, isLoading: isLoadingProducts } = trpc.products.listWithAggregates.useQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [orderQuantities, setOrderQuantities] = useState<Map<string, number>>(new Map());
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printType, setPrintType] = useState<"purchase" | "internal">("purchase");
  const [selectedImportation, setSelectedImportation] = useState<any>(null);
  const { canViewCostUSD, canViewCostBRL, canEditImportations } = usePermissions();

  // Buscar estoque real da API externa para todos os produtos
  const skus = useMemo(() => 
    productsWithAggregates?.map(p => p.sku).filter(Boolean) as string[] || [], 
    [productsWithAggregates]
  );
  const { getStock } = useExternalStock(skus, { enabled: skus.length > 0 });

  // Gerenciar seleção de produtos
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
        // Remove a quantidade quando deseleciona
        setOrderQuantities(prevQty => {
          const newQty = new Map(prevQty);
          newQty.delete(productId);
          return newQty;
        });
      } else {
        newSet.add(productId);
        // Define quantidade inicial como 1 quando seleciona
        setOrderQuantities(prevQty => {
          const newQty = new Map(prevQty);
          newQty.set(productId, 1);
          return newQty;
        });
      }
      return newSet;
    });
  };

  const toggleAllProducts = () => {
    if (selectedProducts.size === productsWithAggregates?.length) {
      setSelectedProducts(new Set());
      setOrderQuantities(new Map());
    } else {
      const allIds = productsWithAggregates?.map(p => p.id) || [];
      setSelectedProducts(new Set(allIds));
      // Define quantidade inicial como 1 para todos
      const newQuantities = new Map();
      allIds.forEach(id => newQuantities.set(id, 1));
      setOrderQuantities(newQuantities);
    }
  };

  const updateOrderQuantity = (productId: string, quantity: number) => {
    if (quantity > 0) {
      setOrderQuantities(prev => {
        const newQty = new Map(prev);
        newQty.set(productId, quantity);
        return newQty;
      });
    }
  };

  const handleCreateOrder = () => {
    if (selectedProducts.size > 0) {
      // Criar query string com produtos e quantidades
      const items = Array.from(selectedProducts).map(id => {
        const qty = orderQuantities.get(id) || 1;
        return `${id}:${qty}`;
      }).join(',');
      setLocation(`/pedidos?items=${items}`);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const handleQuickPrint = (e: React.MouseEvent, importation: any) => {
    e.stopPropagation();
    setSelectedImportation(importation);
    setShowPrintDialog(true);
  };

  const executePrint = () => {
    if (!selectedImportation) return;
    setShowPrintDialog(false);

    if (printType === "purchase") {
      handlePrintPurchaseOrder(selectedImportation);
    } else {
      handlePrintInternal(selectedImportation);
    }
  };

  const handlePrintPurchaseOrder = (importation: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const statusLabel = statusLabels[importation.status] || importation.status;
    
    // Gerar HTML dos itens com foto e SKU
    const itemsHTML = importation.items.map((item: any) => {
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; width: 80px;">
            ${item.imageUrl ? `
              <img 
                src="${item.imageUrl}" 
                alt="${item.productName}"
                style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;"
              />
            ` : `
              <div style="width: 60px; height: 60px; background-color: #f5f5f5; border-radius: 4px; display: flex; align-items: center; justify-content: center; border: 1px solid #ddd; margin: 0 auto;">
                <span style="color: #999; font-size: 9px;">Sem foto</span>
              </div>
            `}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">
            ${item.sku ? `<div style="font-size: 11px; color: #666; font-weight: bold; margin-bottom: 3px;">${item.sku}</div>` : ''}
            <div style="font-weight: bold;">${item.productName}</div>
            ${item.productDescription ? `<div style="font-size: 10px; color: #666; margin-top: 2px;">${item.productDescription}</div>` : ''}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; font-weight: bold;">${item.quantity}</td>
          ${canViewCostUSD ? `<td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">US$ ${item.unitPriceUSD.toFixed(2)}</td>` : ''}
          ${canViewCostUSD ? `<td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">US$ ${item.totalUSD.toFixed(2)}</td>` : ''}
        </tr>
      `;
    }).join('');
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Pedido de Compra - ${importation.invoiceNumber || importation.id}</title>
          <style>
            @media print {
              @page { margin: 1cm; }
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px;
              font-size: 12px;
              line-height: 1.4;
            }
            .header {
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .header h1 {
              font-size: 24px;
              margin-bottom: 5px;
            }
            .header .subtitle {
              color: #666;
              font-size: 14px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              padding: 10px;
              background: #f9f9f9;
              border-radius: 4px;
            }
            .info-item {
              flex: 1;
            }
            .info-item h3 {
              font-size: 10px;
              color: #666;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .info-item p {
              font-size: 13px;
              font-weight: bold;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th {
              background-color: #333;
              color: white;
              padding: 10px 8px;
              text-align: left;
              font-size: 11px;
              text-transform: uppercase;
            }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .summary {
              margin-top: 20px;
              text-align: right;
              padding: 15px;
              background: #f9f9f9;
              border-radius: 4px;
            }
            .summary-row {
              display: flex;
              justify-content: flex-end;
              gap: 50px;
              padding: 5px 0;
              font-size: 13px;
            }
            .summary-row.total {
              border-top: 2px solid #333;
              margin-top: 10px;
              padding-top: 10px;
              font-size: 16px;
              font-weight: bold;
            }
            .badge {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: bold;
            }
            .badge-pending { background-color: #fef3c7; color: #92400e; }
            .badge-in_transit { background-color: #dbeafe; color: #1e40af; }
            .badge-customs { background-color: #e0e7ff; color: #3730a3; }
            .badge-delivered { background-color: #d1fae5; color: #065f46; }
            .badge-cancelled { background-color: #fee2e2; color: #991b1b; }
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #ddd;
              text-align: center;
              color: #666;
              font-size: 10px;
            }
            .supplier-info {
              margin-bottom: 20px;
              padding: 15px;
              background: #f0f0f0;
              border-radius: 4px;
            }
            .supplier-info h3 {
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
              margin-bottom: 8px;
            }
            .supplier-info p {
              font-size: 14px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Pedido de Compra</h1>
            <p class="subtitle">
              ${importation.invoiceNumber || 'Sem Fatura'} - 
              <span class="badge badge-${importation.status}">${statusLabel}</span>
            </p>
          </div>

          <div class="info-row">
            <div class="info-item">
              <h3>Data</h3>
              <p>${formatDate(importation.importDate)}</p>
            </div>
            <div class="info-item">
              <h3>ID</h3>
              <p>#${importation.id.substring(0, 8)}</p>
            </div>
          </div>

          ${importation.supplier ? `
          <div class="supplier-info">
            <h3>Fornecedor</h3>
            <p>${importation.supplier.name || 'Não especificado'}</p>
            ${importation.supplier.email ? `<p style="font-size: 12px; font-weight: normal; margin-top: 4px;">Email: ${importation.supplier.email}</p>` : ''}
          </div>
          ` : `
          <div class="supplier-info">
            <h3>Fornecedor</h3>
            <p>Não selecionado</p>
          </div>
          `}

          <table>
            <thead>
              <tr>
                <th style="width: 80px; text-align: center;">Imagem</th>
                <th>SKU / Produto</th>
                <th style="width: 80px; text-align: center;">Qtd</th>
                ${canViewCostUSD ? '<th style="width: 100px; text-align: right;">Preço Unit.</th>' : ''}
                ${canViewCostUSD ? '<th style="width: 100px; text-align: right;">Total</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          ${canViewCostUSD ? `
          <div class="summary">
            <div class="summary-row total">
              <span>Total:</span>
              <span>US$ ${importation.totalUSD.toFixed(2)}</span>
            </div>
            <div class="summary-row" style="font-size: 11px; color: #666; margin-top: 10px;">
              <span>Total de Itens:</span>
              <span>${importation.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} unidades</span>
            </div>
          </div>
          ` : ''}

          <div class="footer">
            <p>Documento gerado automaticamente pelo Sistema de Importação - ${new Date().toLocaleString('pt-BR')}</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrintInternal = async (importation: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const statusLabel = statusLabels[importation.status] || importation.status;
    
    // Gerar HTML dos itens (sem buscar dados adicionais, usar o que já está na importation)
    const itemsHTML = importation.items.map((item: any) => {
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; width: 100px;">
            ${item.imageUrl ? `
              <img 
                src="${item.imageUrl}" 
                alt="${item.productName}"
                style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;"
              />
            ` : `
              <div style="width: 80px; height: 80px; background-color: #f5f5f5; border-radius: 4px; display: flex; align-items: center; justify-content: center; border: 1px solid #ddd;">
                <span style="color: #999; font-size: 10px;">Sem foto</span>
              </div>
            `}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">
            <div style="font-weight: bold; margin-bottom: 4px;">${item.productName}</div>
            ${item.sku ? `<div style="font-size: 11px; color: #666; margin-bottom: 2px;">SKU: ${item.sku}</div>` : ''}
            ${item.productDescription ? `<div style="font-size: 11px; color: #666;">${item.productDescription}</div>` : ''}
            ${item.color || item.size ? `<div style="font-size: 11px; color: #666; margin-top: 2px;">${[item.color, item.size].filter(Boolean).join(' - ')}</div>` : ''}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; font-weight: bold;">${item.quantity}</td>
          ${canViewCostUSD ? `<td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.unitPriceUSD.toFixed(2)}</td>` : ''}
          ${canViewCostUSD ? `<td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">$${item.totalUSD.toFixed(2)}</td>` : ''}
          ${canViewCostBRL ? `<td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.unitCostBRL)}</td>` : ''}
          ${canViewCostBRL ? `<td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${formatCurrency(item.totalCostBRL)}</td>` : ''}
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Importação ${importation.invoiceNumber || importation.id} - Controle Interno</title>
          <style>
            @media print {
              @page { margin: 1cm; }
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px;
              font-size: 12px;
              line-height: 1.4;
            }
            .header {
              border-bottom: 3px solid #333;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .header h1 {
              font-size: 26px;
              margin-bottom: 5px;
            }
            .header .subtitle {
              color: #666;
              font-size: 14px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              margin-bottom: 20px;
              background: #f9f9f9;
              padding: 15px;
              border-radius: 4px;
            }
            .info-item {
              padding: 8px;
            }
            .info-item h3 {
              font-size: 10px;
              color: #666;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .info-item p {
              font-size: 13px;
              font-weight: bold;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th {
              background-color: #333;
              color: white;
              padding: 10px 8px;
              text-align: left;
              font-size: 11px;
              text-transform: uppercase;
            }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .summary {
              margin-top: 30px;
              padding: 15px;
              background: #f9f9f9;
              border-radius: 4px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              font-size: 13px;
            }
            .summary-row.total {
              border-top: 2px solid #333;
              margin-top: 10px;
              padding-top: 10px;
              font-size: 16px;
              font-weight: bold;
            }
            .badge {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: bold;
            }
            .badge-pending { background-color: #fef3c7; color: #92400e; }
            .badge-in_transit { background-color: #dbeafe; color: #1e40af; }
            .badge-customs { background-color: #e0e7ff; color: #3730a3; }
            .badge-delivered { background-color: #d1fae5; color: #065f46; }
            .badge-cancelled { background-color: #fee2e2; color: #991b1b; }
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #ddd;
              text-align: center;
              color: #666;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Controle Interno de Importação</h1>
            <p class="subtitle">
              ${importation.invoiceNumber || 'Sem Fatura'} - 
              <span class="badge badge-${importation.status}">${statusLabel}</span>
            </p>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <h3>Data</h3>
              <p>${formatDate(importation.importDate)}</p>
            </div>
            <div class="info-item">
              <h3>Status</h3>
              <p>${statusLabel}</p>
            </div>
            <div class="info-item">
              <h3>Total de Itens</h3>
              <p>${importation.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} unidades</p>
            </div>
            ${canViewCostUSD ? `
            <div class="info-item">
              <h3>Taxa de Câmbio</h3>
              <p>R$ ${importation.exchangeRate.toFixed(4)}</p>
            </div>
            ` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 100px; text-align: center;">Imagem</th>
                <th>Produto / SKU</th>
                <th style="width: 80px; text-align: center;">Qtd</th>
                ${canViewCostUSD ? '<th style="width: 100px; text-align: right;">Preço Unit.</th>' : ''}
                ${canViewCostUSD ? '<th style="width: 100px; text-align: right;">Total USD</th>' : ''}
                ${canViewCostBRL ? '<th style="width: 110px; text-align: right;">Custo Unit. BRL</th>' : ''}
                ${canViewCostBRL ? '<th style="width: 120px; text-align: right;">Total BRL</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          ${canViewCostBRL || canViewCostUSD ? `
          <div class="summary">
            <h3 style="margin-bottom: 10px; font-size: 14px;">Resumo Financeiro</h3>
            ${canViewCostUSD ? `
            <div class="summary-row">
              <span>Subtotal Produtos (USD):</span>
              <span>$${importation.subtotalUSD.toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span>Frete (USD):</span>
              <span>$${importation.freightUSD.toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span><strong>Total USD:</strong></span>
              <span><strong>$${importation.totalUSD.toFixed(2)}</strong></span>
            </div>
            ` : ''}
            ${canViewCostBRL ? `
            <div class="summary-row total">
              <span>CUSTO TOTAL (BRL):</span>
              <span>${formatCurrency(importation.totalCostBRL)}</span>
            </div>
            ` : ''}
          </div>
          ` : ''}

          <div class="footer">
            <p>Documento para controle interno - Gerado em ${new Date().toLocaleString('pt-BR')}</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const filteredImportations = useMemo(() => {
    if (!importations) return [];
    return importations.filter((imp) => {
      const matchesSearch = 
        (imp.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (imp.supplierId?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false); // Ideally search by supplier name
      
      const matchesStatus = statusFilter === "all" || imp.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [importations, searchTerm, statusFilter]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    if (!importations) return { totalUSD: 0, totalBRL: 0, totalImports: 0, activeImports: 0 };
    
    const totalUSD = importations.reduce((sum, imp) => sum + imp.totalUSD, 0);
    const totalBRL = importations.reduce((sum, imp) => sum + imp.totalCostBRL, 0);
    const activeImports = importations.filter(imp => 
      imp.status === 'pending' || imp.status === 'in_transit' || imp.status === 'customs'
    ).length;

    return {
      totalUSD,
      totalBRL,
      totalImports: importations.length,
      activeImports
    };
  }, [importations]);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <PageHeader
          title="Importações"
          description="Gerencie todas as suas importações"
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/importacoes/importar-excel")}
                disabled={!canEditImportations}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Importar Excel
              </Button>
              <Button
                size="sm"
                onClick={() => setLocation("/importacoes/nova")}
                disabled={!canEditImportations}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Importação
              </Button>
            </>
          }
        />

        {/* Cards de Estatísticas */}
        {isLoading ? (
          <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
            {canViewCostUSD && (
              <StatCard
                label="Total USD"
                value={`$${stats.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                icon={DollarSign}
              />
            )}
            {canViewCostBRL && (
              <StatCard
                label="Total BRL"
                value={formatCurrency(stats.totalBRL)}
                icon={TrendingUp}
                tone="success"
              />
            )}
            <StatCard label="Importações" value={stats.totalImports} icon={ShoppingCart} />
            <StatCard label="Em Andamento" value={stats.activeImports} icon={Clock} tone="info" />
          </div>
        )}

        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <CardTitle className="text-sm">Lista de Importações</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por fatura..."
                    className="pl-8 h-9 w-full sm:w-[200px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-full sm:w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(searchTerm || statusFilter !== "all") && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}
                    title="Limpar filtros"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredImportations.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fatura</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      {canViewCostUSD && <TableHead className="text-right">Total USD</TableHead>}
                      {canViewCostBRL && <TableHead className="text-right">Total BRL</TableHead>}
                      {canViewCostBRL && <TableHead className="text-right">Taxa Câmbio</TableHead>}
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredImportations.map((importation) => (
                      <TableRow
                        key={importation.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setLocation(`/importacoes/${importation.id}`)}
                      >
                        <TableCell className="font-medium">
                          {importation.invoiceNumber || "-"}
                        </TableCell>
                        <TableCell>{formatDate(importation.importDate)}</TableCell>
                        <TableCell>
                          <ImportStatusBadge status={importation.status} />
                        </TableCell>
                        {canViewCostUSD && (
                          <TableCell className="text-right">
                            ${importation.totalUSD.toFixed(2)}
                          </TableCell>
                        )}
                        {canViewCostBRL && (
                          <TableCell className="text-right">
                            {formatCurrency(importation.totalCostBRL)}
                          </TableCell>
                        )}
                        {canViewCostBRL && (
                          <TableCell className="text-right">
                            R$ {importation.exchangeRate.toFixed(2)}
                          </TableCell>
                        )}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => handleQuickPrint(e, importation)}
                            title="Imprimir importação"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma importação encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== "all" 
                    ? "Tente ajustar seus filtros de busca" 
                    : "Comece criando sua primeira importação"}
                </p>
                {searchTerm || statusFilter !== "all" ? (
                  <Button variant="outline" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}>
                    Limpar Filtros
                  </Button>
                ) : (
                  <Button onClick={() => setLocation("/importacoes/nova")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Importação
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seção de Produtos */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Produtos</CardTitle>
              {selectedProducts.size > 0 && (
                <Button 
                  size="sm" 
                  onClick={handleCreateOrder}
                  className="h-8"
                >
                  <ListPlus className="h-4 w-4 mr-2" />
                  Criar Pedido ({selectedProducts.size})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingProducts ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : productsWithAggregates && productsWithAggregates.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedProducts.size === productsWithAggregates.length && productsWithAggregates.length > 0}
                          onCheckedChange={toggleAllProducts}
                        />
                      </TableHead>
                      <TableHead className="w-20">Foto</TableHead>
                      <TableHead className="min-w-[200px]">Produto</TableHead>
                      <TableHead className="text-center w-32">Total Importado</TableHead>
                      <TableHead className="text-center w-28">Estoque Real</TableHead>
                      <TableHead className="text-center w-24">Em Trânsito</TableHead>
                      <TableHead className="text-center w-24">Pendente</TableHead>
                      <TableHead className="text-center w-24">Em Pedido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsWithAggregates.map((product) => {
                      const realStock = product.sku ? getStock(product.sku) : 0;
                      const isSelected = selectedProducts.has(product.id);
                      return (
                      <TableRow
                        key={product.id}
                        className={`cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-muted/30' : ''}`}
                        onClick={() => setLocation(`/produtos/${product.id}`)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()} className="py-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleProductSelection(product.id)}
                          />
                        </TableCell>
                        <TableCell className="py-3">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-14 h-14 object-cover rounded"
                            />
                          ) : (
                            <div className="w-14 h-14 bg-muted rounded flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="font-medium text-sm mb-1">{product.sku || "-"}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[250px]">
                            {product.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-3">
                          <span className="text-muted-foreground text-base">
                            {product.currentStock}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-3">
                          <span className={realStock <= (product.minStock || 0) ? "text-red-600 font-bold text-base" : "font-semibold text-base"}>
                            {realStock}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-3">
                          {product.totalInTransit > 0 ? (
                            <span className="text-blue-600 font-semibold text-base">{product.totalInTransit}</span>
                          ) : (
                            <span className="text-muted-foreground text-base">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center py-3">
                          {product.totalPending > 0 ? (
                            <span className="text-orange-600 font-semibold text-base">{product.totalPending}</span>
                          ) : (
                            <span className="text-muted-foreground text-base">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center py-3">
                          {product.totalInOrders > 0 && !selectedProducts.has(product.id) ? (
                            <span className="text-yellow-600 font-semibold text-base">{product.totalInOrders}</span>
                          ) : selectedProducts.has(product.id) ? (
                            <div onClick={(e) => e.stopPropagation()}>
                              <Input
                                type="number"
                                min="1"
                                value={orderQuantities.get(product.id) || 1}
                                onChange={(e) => updateOrderQuantity(product.id, parseInt(e.target.value) || 1)}
                                className="w-20 h-8 text-center mx-auto"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-base">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  Comece cadastrando produtos no sistema
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

      {/* Dialog de Opções de Impressão */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Opções de Impressão</DialogTitle>
            <DialogDescription>
              Escolha o tipo de impressão que deseja gerar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <RadioGroup value={printType} onValueChange={(value: any) => setPrintType(value)}>
              <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="purchase" id="purchase-list" />
                <Label htmlFor="purchase-list" className="flex-1 cursor-pointer">
                  <div className="font-semibold mb-1">Pedido de Compra</div>
                  <div className="text-sm text-muted-foreground">
                    Com fotos e SKUs. Ideal para enviar ao fornecedor e fazer pedidos.
                  </div>
                </Label>
              </div>
              <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="internal" id="internal-list" />
                <Label htmlFor="internal-list" className="flex-1 cursor-pointer">
                  <div className="font-semibold mb-1">Relatório Completo</div>
                  <div className="text-sm text-muted-foreground">
                    Relatório detalhado com todos os custos, impostos e taxas para análise interna.
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowPrintDialog(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button onClick={executePrint} className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}


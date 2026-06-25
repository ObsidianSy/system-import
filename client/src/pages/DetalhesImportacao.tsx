import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { ImportStatusBadge } from "@/components/ImportStatusBadge";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Package, DollarSign, TrendingUp, Calendar, Truck, FileText, Edit, Edit2, CheckCircle, Printer } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  in_transit: "Em Trânsito",
  customs: "Na Alfândega",
  delivered: "Entregue",
  cancelled: "Cancelada",
};


export default function DetalhesImportacao() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/importacoes/:id");
  const importationId = params?.id;
  const { canViewCostUSD, canViewCostBRL, canViewImportTaxes, canEditImportations } = usePermissions();
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printType, setPrintType] = useState<"purchase" | "internal">("purchase");

  const { data: importation, isLoading } = trpc.importations.get.useQuery(
    { id: importationId! },
    { enabled: !!importationId }
  );

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

  const handlePrintPurchaseOrder = () => {
    if (!importation) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const statusLabel = statusLabels[importation.status] || importation.status;
    
    // Gerar HTML dos itens com foto e SKU
    const itemsHTML = importation.items.map((item) => {
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

  const handlePrintInternal = async () => {
    if (!importation) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const statusLabel = statusLabels[importation.status] || importation.status;
    
    // Buscar dados dos produtos para incluir SKU e imagem
    const itemsHTML = await Promise.all(importation.items.map(async (item) => {
      // Se tem productId, buscar o produto completo
      let product = null;
      if (item.productId) {
        try {
          const response = await fetch(`/api/trpc/products.get?input=${encodeURIComponent(JSON.stringify({ id: item.productId }))}`);
          if (response.ok) {
            const data = await response.json();
            product = data.result?.data;
          }
        } catch (e) {
          console.error('Erro ao buscar produto:', e);
        }
      }

      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; width: 100px;">
            ${product?.images?.[0] || product?.imageUrl ? `
              <img 
                src="${product.images?.[0] || product.imageUrl}" 
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
            ${product?.sku ? `<div style="font-size: 11px; color: #666; margin-bottom: 2px;">SKU: ${product.sku}</div>` : ''}
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
    }));

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
              <h3>Fornecedor</h3>
              <p>${importation.supplier?.name || '-'}</p>
            </div>
            <div class="info-item">
              <h3>Status</h3>
              <p>${statusLabel}</p>
            </div>
            ${importation.trackingNumber ? `
            <div class="info-item">
              <h3>Rastreamento</h3>
              <p>${importation.trackingNumber}</p>
            </div>
            ` : ''}
            ${canViewCostUSD ? `
            <div class="info-item">
              <h3>Taxa de Câmbio</h3>
              <p>R$ ${importation.exchangeRate.toFixed(4)}</p>
            </div>
            ` : ''}
            <div class="info-item">
              <h3>Total de Itens</h3>
              <p>${importation.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} unidades</p>
            </div>
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
              ${(await Promise.all(itemsHTML)).join('')}
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
            ${canViewCostBRL && canViewImportTaxes ? `
            <div class="summary-row" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
              <span>Total em BRL (produtos + frete):</span>
              <span>${formatCurrency(importation.subtotalBRL + importation.freightBRL)}</span>
            </div>
            <div class="summary-row">
              <span>Imposto de Importação:</span>
              <span>${formatCurrency(importation.importTax)}</span>
            </div>
            <div class="summary-row">
              <span>ICMS:</span>
              <span>${formatCurrency(importation.icms)}</span>
            </div>
            ${importation.otherTaxes > 0 ? `
            <div class="summary-row">
              <span>Outras Taxas:</span>
              <span>${formatCurrency(importation.otherTaxes)}</span>
            </div>
            ` : ''}
            ` : ''}
            ${canViewCostBRL ? `
            <div class="summary-row total">
              <span>CUSTO TOTAL (BRL):</span>
              <span>${formatCurrency(importation.totalCostBRL)}</span>
            </div>
            ` : ''}
          </div>
          ` : ''}

          ${importation.notes ? `
          <div style="margin-top: 20px; padding: 12px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
            <h3 style="font-size: 12px; margin-bottom: 6px; color: #856404;">Observações:</h3>
            <p style="font-size: 12px; color: #856404;">${importation.notes}</p>
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

  const handlePrint = () => {
    setShowPrintDialog(true);
  };

  const executePrint = () => {
    setShowPrintDialog(false);
    if (printType === "purchase") {
      handlePrintPurchaseOrder();
    } else {
      handlePrintInternal();
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-1.5">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
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
      <div className="space-y-1.5">
        <PageHeader
          title={importation.invoiceNumber || "Importação"}
          description={
            <span className="flex items-center gap-1.5">
              <ImportStatusBadge status={importation.status} />
              Importado em {formatDate(importation.importDate)}
            </span>
          }
          actions={
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setLocation("/importacoes")}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handlePrint}
              >
                <Printer className="h-3 w-3 mr-1" />
                Imprimir
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setLocation(`/importacoes/${importationId}/editar`)}
                disabled={!canEditImportations}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Gerenciar Status
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => setLocation(`/importacoes/${importationId}/editar-completa`)}
                disabled={!canEditImportations}
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Editar Valores
              </Button>
            </>
          }
        />

        {/* Cards de Resumo */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {canViewCostUSD && (
            <StatCard
              label="Total USD"
              value={`$${importation.totalUSD.toFixed(2)}`}
              icon={DollarSign}
              hint={`Prod $${importation.subtotalUSD.toFixed(2)} + Frete $${importation.freightUSD.toFixed(2)}`}
            />
          )}

          {canViewCostBRL && (
            <StatCard
              label="Custo Total BRL"
              value={formatCurrency(importation.totalCostBRL)}
              icon={TrendingUp}
              tone="success"
            />
          )}

          {canViewImportTaxes && (
            <StatCard
              label="Impostos"
              value={formatCurrency(importation.importTax + importation.icms)}
              icon={FileText}
            />
          )}

          <StatCard
            label="Produtos"
            value={importation.items?.length || 0}
            icon={Package}
            hint={`${importation.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0} unidades`}
          />
        </div>

        {/* Informações do Fornecedor e Envio lado a lado */}
        <div className="grid gap-1.5 md:grid-cols-2">
          {/* Fornecedor */}
          {importation.supplier && (
            <Card>
              <CardHeader className="pb-1 pt-1.5 px-2.5">
                <CardTitle className="text-[10px] font-semibold uppercase text-muted-foreground">Fornecedor</CardTitle>
              </CardHeader>
              <CardContent className="pt-1 px-2.5 pb-1.5">
                <div className="grid gap-1.5 grid-cols-2">
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">Nome</p>
                    <p className="text-xs font-medium">{importation.supplier.name}</p>
                  </div>
                  {importation.supplier.companyName && (
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Empresa</p>
                      <p className="text-xs font-medium">{importation.supplier.companyName}</p>
                    </div>
                  )}
                  {importation.supplier.country && (
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">País</p>
                      <p className="text-xs font-medium">{importation.supplier.country}</p>
                    </div>
                  )}
                  {importation.supplier.contactPerson && (
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Contato</p>
                      <p className="text-xs font-medium">{importation.supplier.contactPerson}</p>
                    </div>
                  )}
                  {importation.supplier.email && (
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Email</p>
                      <p className="text-xs font-medium truncate">{importation.supplier.email}</p>
                    </div>
                  )}
                  {importation.supplier.phone && (
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Telefone</p>
                      <p className="text-xs font-medium">{importation.supplier.phone}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informações de Envio */}
          <Card>
            <CardHeader className="pb-1 pt-1.5 px-2.5">
              <CardTitle className="flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
                <Truck className="h-2.5 w-2.5" />
                Informações de Envio
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1 px-2.5 pb-1.5">
              <div className="grid gap-1.5 grid-cols-2">
                {importation.shippingMethod && (
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">Método de Envio</p>
                    <p className="text-xs font-medium">{importation.shippingMethod}</p>
                  </div>
                )}
                {importation.trackingNumber && (
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">Rastreamento</p>
                    <p className="text-xs font-medium">{importation.trackingNumber}</p>
                  </div>
                )}
                {importation.estimatedDelivery && (
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">Previsão Entrega</p>
                    <p className="text-xs font-medium">{formatDate(importation.estimatedDelivery)}</p>
                  </div>
                )}
                {importation.actualDelivery && (
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">Data Entrega</p>
                    <p className="text-xs font-medium">{formatDate(importation.actualDelivery)}</p>
                  </div>
                )}
                {importation.paymentMethod && (
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">Pagamento</p>
                    <p className="text-xs font-medium">{importation.paymentMethod}</p>
                  </div>
                )}
                {importation.transactionNumber && (
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">Nº Transação</p>
                    <p className="text-[10px] font-medium truncate">{importation.transactionNumber}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Produtos da Importação */}
        <Card>
          <CardHeader className="pb-1 pt-1.5 px-2.5">
            <CardTitle className="text-[10px] font-semibold uppercase text-muted-foreground">Produtos Importados</CardTitle>
          </CardHeader>
          <CardContent className="pt-1 px-2.5 pb-1.5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Foto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  {canViewCostUSD && <TableHead className="text-right">Preço Unit. (USD)</TableHead>}
                  {canViewCostUSD && <TableHead className="text-right">Total (USD)</TableHead>}
                  {canViewCostBRL && <TableHead className="text-right">Custo Unit. (BRL)</TableHead>}
                  {canViewCostBRL && <TableHead className="text-right">Custo Total (BRL)</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {importation.items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.productName}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-xs">{item.sku || "-"}</div>
                      <div className="text-[10px] text-muted-foreground">{item.productName}</div>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    {canViewCostUSD && <TableCell className="text-right">${item.unitPriceUSD.toFixed(2)}</TableCell>}
                    {canViewCostUSD && <TableCell className="text-right font-medium">${item.totalUSD.toFixed(2)}</TableCell>}
                    {canViewCostBRL && <TableCell className="text-right">{formatCurrency(item.unitCostBRL)}</TableCell>}
                    {canViewCostBRL && (
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.totalCostBRL)}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Observações */}
        {importation.notes && (
          <Card>
            <CardHeader className="pb-1 pt-1.5 px-2.5">
              <CardTitle className="text-[10px] font-semibold uppercase text-muted-foreground">Observações</CardTitle>
            </CardHeader>
            <CardContent className="pt-1 px-2.5 pb-1.5">
              <p className="text-[10px] whitespace-pre-wrap leading-relaxed">{importation.notes}</p>
            </CardContent>
          </Card>
        )}
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
                <RadioGroupItem value="purchase" id="purchase" />
                <Label htmlFor="purchase" className="flex-1 cursor-pointer">
                  <div className="font-semibold mb-1">Pedido de Compra</div>
                  <div className="text-sm text-muted-foreground">
                    Com fotos e SKUs. Ideal para enviar ao fornecedor e fazer pedidos.
                  </div>
                </Label>
              </div>
              <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="internal" id="internal" />
                <Label htmlFor="internal" className="flex-1 cursor-pointer">
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


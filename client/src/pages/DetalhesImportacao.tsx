import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Package, DollarSign, TrendingUp, Calendar, Truck, FileText, Edit, Edit2, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  in_transit: "Em Trânsito",
  customs: "Na Alfândega",
  delivered: "Entregue",
  cancelled: "Cancelada",
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  in_transit: "default",
  customs: "outline",
  delivered: "default",
  cancelled: "destructive",
};

export default function DetalhesImportacao() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/importacoes/:id");
  const importationId = params?.id;

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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-1.5">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-1.5 grid-cols-2 md:grid-cols-4">
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
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setLocation("/importacoes")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-bold">
                {importation.invoiceNumber || "Importação"}
              </h1>
              <Badge variant={statusColors[importation.status]} className="text-[10px] px-1.5 py-0">
                {statusLabels[importation.status]}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Importado em {formatDate(importation.importDate)}
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setLocation(`/importacoes/${importationId}/editar`)}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Gerenciar Status
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={() => setLocation(`/importacoes/${importationId}/editar-completa`)}>
              <Edit2 className="h-3 w-3 mr-1" />
              Editar Valores
            </Button>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid gap-1.5 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Total USD</p>
                  <p className="text-base font-bold">${importation.totalUSD.toFixed(2)}</p>
                  <p className="text-[9px] text-muted-foreground truncate">
                    Prod ${importation.subtotalUSD.toFixed(2)} + Frete ${importation.freightUSD.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Custo Total BRL</p>
                  <p className="text-sm font-bold text-green-600">{formatCurrency(importation.totalCostBRL)}</p>
                  <p className="text-[9px] text-muted-foreground">
                    Câmbio R$ {importation.exchangeRate.toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="h-4 w-4 text-green-600 shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Impostos</p>
                  <p className="text-sm font-bold">
                    {formatCurrency(importation.importTax + importation.icms)}
                  </p>
                  <p className="text-[9px] text-muted-foreground truncate">
                    II R$ {(importation.importTax/1000).toFixed(1)}k + ICMS R$ {(importation.icms/1000).toFixed(1)}k
                  </p>
                </div>
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Produtos</p>
                  <p className="text-base font-bold">{importation.items?.length || 0}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {importation.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} unidades
                  </p>
                </div>
                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </CardContent>
          </Card>
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
                  <TableHead>Produto</TableHead>
                  <TableHead>Variação</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Preço Unit. (USD)</TableHead>
                  <TableHead className="text-right">Total (USD)</TableHead>
                  <TableHead className="text-right">Custo Unit. (BRL)</TableHead>
                  <TableHead className="text-right">Custo Total (BRL)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importation.items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.productName}</div>
                        {item.productDescription && (
                          <div className="text-sm text-muted-foreground">
                            {item.productDescription}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.color || item.size ? (
                        <div className="text-sm">
                          {item.color && <div>{item.color}</div>}
                          {item.size && <div>{item.size}</div>}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">${item.unitPriceUSD.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">${item.totalUSD.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitCostBRL)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.totalCostBRL)}
                    </TableCell>
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
    </DashboardLayout>
  );
}


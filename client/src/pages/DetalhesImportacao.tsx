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
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
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
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/importacoes")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {importation.invoiceNumber || "Importação"}
              </h1>
              <Badge variant={statusColors[importation.status]}>
                {statusLabels[importation.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Importado em {formatDate(importation.importDate)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setLocation(`/importacoes/${importationId}/editar`)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Gerenciar Status
            </Button>
            <Button onClick={() => setLocation(`/importacoes/${importationId}/editar-completa`)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Editar Valores
            </Button>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total USD</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${importation.totalUSD.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Produtos: ${importation.subtotalUSD.toFixed(2)} + Frete: ${importation.freightUSD.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custo Total BRL</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(importation.totalCostBRL)}</div>
              <p className="text-xs text-muted-foreground">
                Câmbio: R$ {importation.exchangeRate.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Impostos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(importation.importTax + importation.icms)}
              </div>
              <p className="text-xs text-muted-foreground">
                II: {formatCurrency(importation.importTax)} + ICMS: {formatCurrency(importation.icms)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produtos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{importation.items?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                {importation.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} unidades
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Informações do Fornecedor */}
        {importation.supplier && (
          <Card>
            <CardHeader>
              <CardTitle>Fornecedor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{importation.supplier.name}</p>
                </div>
                {importation.supplier.companyName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Empresa</p>
                    <p className="font-medium">{importation.supplier.companyName}</p>
                  </div>
                )}
                {importation.supplier.country && (
                  <div>
                    <p className="text-sm text-muted-foreground">País</p>
                    <p className="font-medium">{importation.supplier.country}</p>
                  </div>
                )}
                {importation.supplier.contactPerson && (
                  <div>
                    <p className="text-sm text-muted-foreground">Contato</p>
                    <p className="font-medium">{importation.supplier.contactPerson}</p>
                  </div>
                )}
                {importation.supplier.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{importation.supplier.email}</p>
                  </div>
                )}
                {importation.supplier.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{importation.supplier.phone}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Informações de Envio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Informações de Envio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {importation.shippingMethod && (
                <div>
                  <p className="text-sm text-muted-foreground">Método de Envio</p>
                  <p className="font-medium">{importation.shippingMethod}</p>
                </div>
              )}
              {importation.trackingNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">Rastreamento</p>
                  <p className="font-medium">{importation.trackingNumber}</p>
                </div>
              )}
              {importation.estimatedDelivery && (
                <div>
                  <p className="text-sm text-muted-foreground">Previsão de Entrega</p>
                  <p className="font-medium">{formatDate(importation.estimatedDelivery)}</p>
                </div>
              )}
              {importation.actualDelivery && (
                <div>
                  <p className="text-sm text-muted-foreground">Data de Entrega</p>
                  <p className="font-medium">{formatDate(importation.actualDelivery)}</p>
                </div>
              )}
              {importation.paymentMethod && (
                <div>
                  <p className="text-sm text-muted-foreground">Método de Pagamento</p>
                  <p className="font-medium">{importation.paymentMethod}</p>
                </div>
              )}
              {importation.transactionNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">Nº da Transação</p>
                  <p className="font-medium text-xs">{importation.transactionNumber}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Produtos da Importação */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos Importados</CardTitle>
          </CardHeader>
          <CardContent>
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
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{importation.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}


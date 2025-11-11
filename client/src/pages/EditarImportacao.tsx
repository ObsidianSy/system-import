import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Save, Package, CheckCircle, Truck, AlertCircle, XCircle, Edit2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
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

const statusIcons: Record<string, any> = {
  pending: AlertCircle,
  in_transit: Truck,
  customs: Package,
  delivered: CheckCircle,
  cancelled: XCircle,
};

export default function EditarImportacao() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/importacoes/:id/editar");
  const importationId = params?.id;

  const { data: importation, isLoading } = trpc.importations.get.useQuery(
    { id: importationId! },
    { enabled: !!importationId }
  );

  const { data: products } = trpc.products.list.useQuery();
  const utils = trpc.useUtils();

  const updateStatus = trpc.importations.update.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado com sucesso!");
      utils.importations.get.invalidate({ id: importationId! });
      utils.importations.list.invalidate();
      utils.products.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar status: " + error.message);
    },
  });

  const linkProduct = trpc.importations.linkItemToProduct.useMutation({
    onSuccess: () => {
      toast.success("Produto vinculado com sucesso!");
      utils.importations.get.invalidate({ id: importationId! });
    },
    onError: (error) => {
      toast.error("Erro ao vincular produto: " + error.message);
    },
  });

  const handleStatusChange = (newStatus: string) => {
    if (!importationId) return;

    const confirmMessage = newStatus === "delivered"
      ? "Ao marcar como 'Entregue', o estoque será atualizado automaticamente. Confirmar?"
      : "Deseja alterar o status desta importação?";

    if (window.confirm(confirmMessage)) {
      updateStatus.mutate({
        id: importationId,
        status: newStatus as any,
      });
    }
  };

  const handleLinkProduct = (itemId: string, productId: string) => {
    console.log('Vinculando produto:', { itemId, productId });
    linkProduct.mutate({ itemId, productId });
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

  const StatusIcon = statusIcons[importation.status];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(`/importacoes/${importationId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Gerenciar Status</h1>
            <p className="text-muted-foreground">
              Fatura: {importation.invoiceNumber || "Sem número"}
            </p>
          </div>
          <Button
            onClick={() => setLocation(`/importacoes/${importationId}/editar-completa`)}
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Editar Valores e Produtos
          </Button>
        </div>

        {/* Status da Importação */}
        <Card>
          <CardHeader>
            <CardTitle>Status da Importação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <StatusIcon className="h-5 w-5" />
                  <span className="text-sm text-muted-foreground">Status Atual:</span>
                </div>
                <Badge variant={statusColors[importation.status]} className="text-base px-4 py-1">
                  {statusLabels[importation.status]}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {Object.entries(statusLabels).map(([status, label]) => {
                  const Icon = statusIcons[status];
                  const isActive = importation.status === status;
                  
                  return (
                    <Button
                      key={status}
                      variant={isActive ? "default" : "outline"}
                      onClick={() => handleStatusChange(status)}
                      disabled={updateStatus.isPending || isActive}
                      className="flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Button>
                  );
                })}
              </div>

              {importation.status === "delivered" && importation.actualDelivery && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 inline mr-1 text-green-600" />
                    Entregue em: {formatDate(importation.actualDelivery)}
                  </p>
                </div>
              )}

              {importation.status !== "delivered" && (
                <div className="pt-3 border-t bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>⚠️ Importante:</strong> O estoque só será atualizado quando o status for alterado para <strong>"Entregue"</strong>.
                    Ao marcar como entregue, o sistema irá:
                  </p>
                  <ul className="text-sm mt-2 ml-4 space-y-1 list-disc">
                    <li>Adicionar as quantidades ao estoque dos produtos vinculados</li>
                    <li>Calcular o custo médio ponderado de cada produto</li>
                    <li>Registrar as movimentações no histórico</li>
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Produtos da Importação */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos da Importação</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Vincular a Produto</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Preço Unit. USD</TableHead>
                  <TableHead className="text-right">Custo Unit. BRL</TableHead>
                  <TableHead className="text-right">Total BRL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importation.items?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        {item.productDescription && (
                          <p className="text-sm text-muted-foreground">{item.productDescription}</p>
                        )}
                        {(item.color || item.size) && (
                          <p className="text-xs text-muted-foreground">
                            {item.color} {item.size}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.productId || ""}
                        onValueChange={(value) => handleLinkProduct(item.id, value)}
                        disabled={linkProduct.isPending}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Selecione o produto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products?.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.sku || product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {item.productId && (
                        <Badge variant="outline" className="mt-1">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Vinculado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">${item.unitPriceUSD.toFixed(2)}</TableCell>
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

        {/* Resumo Financeiro */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal USD:</span>
                  <span className="font-medium">${importation.subtotalUSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frete USD:</span>
                  <span className="font-medium">${importation.freightUSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="font-semibold">Total USD:</span>
                  <span className="font-bold">${importation.totalUSD.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa de Câmbio:</span>
                  <span className="font-medium">R$ {importation.exchangeRate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Imposto de Importação:</span>
                  <span className="font-medium">{formatCurrency(importation.importTax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ICMS:</span>
                  <span className="font-medium">{formatCurrency(importation.icms)}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="font-semibold">Custo Total BRL:</span>
                  <span className="font-bold text-lg">{formatCurrency(importation.totalCostBRL)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


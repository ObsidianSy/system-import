import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Mail, Phone, MapPin, User, Edit, Building } from "lucide-react";
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

export default function DetalhesFornecedor() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/fornecedores/:id");
  const supplierId = params?.id;

  const { data: supplier, isLoading } = trpc.suppliers.get.useQuery(
    { id: supplierId! },
    { enabled: !!supplierId }
  );

  const { data: importations } = trpc.importations.list.useQuery();

  const supplierImportations = importations?.filter(imp => imp.supplierId === supplierId) || [];
  const totalImported = supplierImportations.reduce((sum, imp) => sum + imp.totalCostBRL, 0);

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
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  if (!supplier) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">Fornecedor não encontrado</h3>
          <Button onClick={() => setLocation("/fornecedores")}>
            Voltar para Fornecedores
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
            onClick={() => setLocation("/fornecedores")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{supplier.name}</h1>
            {supplier.companyName && (
              <p className="text-muted-foreground">{supplier.companyName}</p>
            )}
          </div>
          <Button variant="outline" onClick={() => setLocation(`/fornecedores/${supplier.id}/editar`)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Importado</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalImported)}</div>
              <p className="text-xs text-muted-foreground">
                Em todas as importações
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Importações</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{supplierImportations.length}</div>
              <p className="text-xs text-muted-foreground">
                Total de importações
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {supplierImportations.length > 0 
                  ? formatCurrency(totalImported / supplierImportations.length)
                  : formatCurrency(0)
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Valor médio por importação
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Informações de Contato */}
        <Card>
          <CardHeader>
            <CardTitle>Informações de Contato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {supplier.contactPerson && (
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pessoa de Contato</p>
                    <p className="font-medium">{supplier.contactPerson}</p>
                  </div>
                </div>
              )}

              {supplier.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <a href={`mailto:${supplier.email}`} className="font-medium hover:underline">
                      {supplier.email}
                    </a>
                  </div>
                </div>
              )}

              {supplier.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <a href={`tel:${supplier.phone}`} className="font-medium hover:underline">
                      {supplier.phone}
                    </a>
                  </div>
                </div>
              )}

              {supplier.whatsapp && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">WhatsApp</p>
                    <a 
                      href={`https://wa.me/${supplier.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline"
                    >
                      {supplier.whatsapp}
                    </a>
                  </div>
                </div>
              )}

              {supplier.country && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">País</p>
                    <p className="font-medium">{supplier.country}</p>
                  </div>
                </div>
              )}

              {supplier.address && (
                <div className="flex items-start gap-3 md:col-span-2">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Endereço</p>
                    <p className="font-medium">{supplier.address}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Histórico de Importações */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Importações</CardTitle>
          </CardHeader>
          <CardContent>
            {supplierImportations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Fatura</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total USD</TableHead>
                    <TableHead className="text-right">Câmbio</TableHead>
                    <TableHead className="text-right">Custo BRL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierImportations.map((importation) => (
                    <TableRow
                      key={importation.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setLocation(`/importacoes/${importation.id}`)}
                    >
                      <TableCell>{formatDate(importation.importDate)}</TableCell>
                      <TableCell className="font-medium">
                        {importation.invoiceNumber || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[importation.status]}>
                          {statusLabels[importation.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        ${importation.totalUSD.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {importation.exchangeRate.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(importation.totalCostBRL)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma importação registrada com este fornecedor
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Plus, FileText, Package, DollarSign, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocation } from "wouter";

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

export default function Importacoes() {
  const [, setLocation] = useLocation();
  const { data: importations, isLoading } = trpc.importations.list.useQuery();

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Importações</h1>
            <p className="text-muted-foreground">
              Gerencie todas as suas importações
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation("/importacoes/importar-excel")}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Importar Excel
            </Button>
            <Button onClick={() => setLocation("/importacoes/nova")}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Importação
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Importações</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : importations && importations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fatura</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total USD</TableHead>
                    <TableHead className="text-right">Total BRL</TableHead>
                    <TableHead className="text-right">Taxa Câmbio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importations.map((importation) => (
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
                        <Badge variant={statusColors[importation.status]}>
                          {statusLabels[importation.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        ${importation.totalUSD.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(importation.totalCostBRL)}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {importation.exchangeRate.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma importação encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  Comece criando sua primeira importação
                </p>
                <Button onClick={() => setLocation("/importacoes/nova")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Importação
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


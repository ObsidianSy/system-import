import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Plus, FileText, Package, DollarSign, FileSpreadsheet, Search, Filter, X } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocation } from "wouter";

const statusLabels: Record<string, string> = {
  all: "Todos os Status",
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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Lista de Importações</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por fatura..."
                    className="pl-8 w-full sm:w-[250px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filtrar por status" />
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
                    size="icon" 
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
                      <TableHead className="text-right">Total USD</TableHead>
                      <TableHead className="text-right">Total BRL</TableHead>
                      <TableHead className="text-right">Taxa Câmbio</TableHead>
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
      </div>
    </DashboardLayout>
  );
}


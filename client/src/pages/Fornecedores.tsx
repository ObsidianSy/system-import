import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Plus, Users, Mail, Phone, Filter, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Fornecedores() {
  const [, setLocation] = useLocation();
  const { data: suppliers, isLoading } = trpc.suppliers.list.useQuery();

  // Estados dos filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Extrair países únicos
  const countries = useMemo(() => {
    if (!suppliers) return [];
    const uniqueCountries = Array.from(new Set(suppliers.map(s => s.country).filter(Boolean)));
    return uniqueCountries.sort();
  }, [suppliers]);

  // Aplicar filtros
  const filteredSuppliers = useMemo(() => {
    if (!suppliers) return [];

    return suppliers.filter(supplier => {
      // Filtro de busca
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          supplier.name.toLowerCase().includes(search) ||
          supplier.companyName?.toLowerCase().includes(search) ||
          supplier.contactPerson?.toLowerCase().includes(search) ||
          supplier.email?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Filtro de país
      if (countryFilter !== "all" && supplier.country !== countryFilter) {
        return false;
      }

      return true;
    });
  }, [suppliers, searchTerm, countryFilter]);

  const clearFilters = () => {
    setSearchTerm("");
    setCountryFilter("all");
  };

  const hasActiveFilters = searchTerm || countryFilter !== "all";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fornecedores</h1>
            <p className="text-muted-foreground">
              Gerencie seus fornecedores e exportadores
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {[searchTerm, countryFilter !== "all"].filter(Boolean).length}
                </Badge>
              )}
            </Button>
            <Button onClick={() => setLocation("/fornecedores/novo")}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Fornecedor
            </Button>
          </div>
        </div>

        {/* Painel de Filtros */}
        {showFilters && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Filtros</CardTitle>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Buscar</Label>
                  <Input
                    id="search"
                    placeholder="Nome, empresa, contato..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger id="country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os países</SelectItem>
                      {countries.map((country) => (
                        <SelectItem key={country} value={country!}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                Exibindo {filteredSuppliers.length} de {suppliers?.length || 0} fornecedores
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Lista de Fornecedores</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : suppliers && suppliers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>País</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow
                      key={supplier.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setLocation(`/fornecedores/${supplier.id}`)}
                    >
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>{supplier.companyName || "-"}</TableCell>
                      <TableCell>{supplier.country || "-"}</TableCell>
                      <TableCell>{supplier.contactPerson || "-"}</TableCell>
                      <TableCell>
                        {supplier.email ? (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{supplier.email}</span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {supplier.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{supplier.phone}</span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum fornecedor encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  Comece criando seu primeiro fornecedor
                </p>
                <Button onClick={() => setLocation("/fornecedores/novo")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Fornecedor
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


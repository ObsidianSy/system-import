import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export default function EditarFornecedor() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/fornecedores/:id/editar");
  const supplierId = params?.id;

  const { data: supplier, isLoading } = trpc.suppliers.get.useQuery(
    { id: supplierId! },
    { enabled: !!supplierId }
  );

  const utils = trpc.useUtils();

  // Form state
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");

  // Populate form when data loads
  useEffect(() => {
    if (supplier) {
      setName(supplier.name);
      setCompanyName(supplier.companyName || "");
      setContactPerson(supplier.contactPerson || "");
      setEmail(supplier.email || "");
      setPhone(supplier.phone || "");
      setWhatsapp(supplier.whatsapp || "");
      setAddress(supplier.address || "");
      setCountry(supplier.country || "");
    }
  }, [supplier]);

  const updateSupplier = trpc.suppliers.update.useMutation({
    onSuccess: () => {
      toast.success("Fornecedor atualizado com sucesso!");
      utils.suppliers.list.invalidate();
      utils.suppliers.get.invalidate({ id: supplierId! });
      setLocation(`/fornecedores/${supplierId}`);
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar fornecedor: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Nome do fornecedor é obrigatório");
      return;
    }

    updateSupplier.mutate({
      id: supplierId!,
      name: name.trim(),
      companyName: companyName.trim() || undefined,
      contactPerson: contactPerson.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      whatsapp: whatsapp.trim() || undefined,
      address: address.trim() || undefined,
      country: country.trim() || undefined,
    });
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
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setLocation(`/fornecedores/${supplierId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Editar Fornecedor</h1>
            <p className="text-muted-foreground">
              Atualize as informações do fornecedor
            </p>
          </div>
          <Button type="submit" disabled={updateSupplier.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name">Nome do Fornecedor *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: New Seven Import"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Nome da Empresa</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Nome oficial da empresa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Pessoa de Contato</Label>
                  <Input
                    id="contactPerson"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Nome do contato"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@fornecedor.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Endereço Completo</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, número, complemento"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Ex: China"
                />
              </div>
            </CardContent>
          </Card>


        </div>
      </form>
    </DashboardLayout>
  );
}


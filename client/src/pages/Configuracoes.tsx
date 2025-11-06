import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Configuracoes() {
  const { data: taxConfig, isLoading } = trpc.taxConfig.getActive.useQuery();
  const utils = trpc.useUtils();
  
  const [name, setName] = useState("");
  const [importTaxRate, setImportTaxRate] = useState("");
  const [icmsRate, setIcmsRate] = useState("");

  const createTaxConfig = trpc.taxConfig.create.useMutation({
    onSuccess: () => {
      toast.success("Configuração de impostos criada com sucesso!");
      utils.taxConfig.getActive.invalidate();
      setName("");
      setImportTaxRate("");
      setIcmsRate("");
    },
    onError: (error) => {
      toast.error("Erro ao criar configuração: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !importTaxRate || !icmsRate) {
      toast.error("Preencha todos os campos");
      return;
    }

    createTaxConfig.mutate({
      name,
      importTaxRate: parseFloat(importTaxRate),
      icmsRate: parseFloat(icmsRate),
      isActive: true,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Configure as taxas de importação e impostos
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Configuração Ativa</CardTitle>
              <CardDescription>
                Taxas atualmente em uso para cálculo de importações
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : taxConfig ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Nome da Configuração</Label>
                      <Badge>Ativa</Badge>
                    </div>
                    <div className="text-lg font-medium">{taxConfig.name}</div>
                  </div>
                  <div>
                    <Label>Taxa de Importação</Label>
                    <div className="text-2xl font-bold text-primary">
                      {taxConfig.importTaxRate.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <Label>Taxa ICMS</Label>
                    <div className="text-2xl font-bold text-primary">
                      {taxConfig.icmsRate.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  Nenhuma configuração ativa. Crie uma nova configuração ao lado.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nova Configuração</CardTitle>
              <CardDescription>
                Criar uma nova configuração de taxas (substituirá a atual)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Configuração</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Configuração 2025"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="importTax">Taxa de Importação (%)</Label>
                  <Input
                    id="importTax"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 60.00"
                    value={importTaxRate}
                    onChange={(e) => setImportTaxRate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Imposto de importação aplicado sobre o valor CIF
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="icms">Taxa ICMS (%)</Label>
                  <Input
                    id="icms"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 18.00"
                    value={icmsRate}
                    onChange={(e) => setIcmsRate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    ICMS aplicado sobre o valor da importação
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createTaxConfig.isPending}
                >
                  {createTaxConfig.isPending ? "Salvando..." : "Salvar Configuração"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações sobre Cálculo de Impostos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-medium mb-1">Como funciona o cálculo?</h4>
              <p className="text-sm text-muted-foreground">
                O sistema calcula automaticamente todos os custos de importação, incluindo:
              </p>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Conversão de USD para BRL usando a taxa de câmbio informada</li>
              <li>Aplicação da taxa de importação sobre o valor total (produtos + frete)</li>
              <li>Aplicação do ICMS sobre o valor total</li>
              <li>Rateio proporcional de impostos e frete entre os produtos</li>
              <li>Cálculo do custo unitário final em BRL para cada produto</li>
            </ul>
            <div className="pt-3 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>Nota:</strong> As taxas configuradas aqui serão usadas como padrão 
                ao criar novas importações, mas podem ser ajustadas individualmente em cada importação.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


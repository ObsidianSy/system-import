import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import * as XLSX from 'xlsx';
import { trpc } from "@/lib/trpc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ParsedProduct {
  quantity: number;
  name: string;
  description?: string;
  color?: string;
  size?: string;
  unitPriceUSD: number;
}

interface ParsedData {
  invoiceNumber?: string;
  importDate?: string;
  exchangeRate?: number;
  freightUSD?: number;
  shippingMethod?: string;
  trackingNumber?: string;
  transactionNumber?: string;
  paymentMethod?: string;
  products: ParsedProduct[];
}

export default function ImportarExcel() {
  const [, setLocation] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [supplierId, setSupplierId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: suppliers } = trpc.suppliers.list.useQuery();
  const createImportation = trpc.importations.create.useMutation({
    onSuccess: () => {
      toast.success("Importação registrada com sucesso!");
      setLocation("/importacoes");
    },
    onError: (error) => {
      toast.error("Erro ao registrar importação: " + error.message);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseExcelFile(selectedFile);
    }
  };

  const parseExcelFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Tentar extrair dados da fatura
      const parsed: ParsedData = {
        products: []
      };

      // Procurar por campos conhecidos
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        // Tentar encontrar número da fatura
        if (row[0]?.toString().toLowerCase().includes('invoice')) {
          parsed.invoiceNumber = row[1]?.toString();
        }

        // Tentar encontrar data
        if (row[0]?.toString().toLowerCase().includes('date')) {
          parsed.importDate = row[1]?.toString();
        }

        // Tentar encontrar método de envio
        if (row[0]?.toString().toLowerCase().includes('shipping')) {
          parsed.shippingMethod = row[1]?.toString();
        }

        // Tentar encontrar produtos (linhas com quantidade numérica)
        if (typeof row[0] === 'number' && row[0] > 0) {
          const product: ParsedProduct = {
            quantity: row[0],
            name: row[2]?.toString() || row[1]?.toString() || 'Produto sem nome',
            unitPriceUSD: parseFloat(row[10]?.toString() || row[9]?.toString() || '0'),
          };

          // Tentar extrair descrição, cor, tamanho
          if (row[3]) product.description = row[3].toString();
          if (row[4]) product.color = row[4].toString();
          if (row[5]) product.size = row[5].toString();

          if (product.name && product.quantity > 0) {
            parsed.products.push(product);
          }
        }
      }

      // Valores padrão
      if (!parsed.exchangeRate) parsed.exchangeRate = 5.46;
      if (!parsed.freightUSD) parsed.freightUSD = 0;

      setParsedData(parsed);
      toast.success(`Arquivo processado! ${parsed.products.length} produtos encontrados.`);
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error("Erro ao processar arquivo Excel. Verifique o formato.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = () => {
    if (!parsedData || parsedData.products.length === 0) {
      toast.error("Nenhum produto encontrado no arquivo");
      return;
    }

    if (!supplierId) {
      toast.error("Selecione um fornecedor");
      return;
    }

    const subtotalUSD = parsedData.products.reduce((sum, p) => sum + (p.quantity * p.unitPriceUSD), 0);

    createImportation.mutate({
      invoiceNumber: parsedData.invoiceNumber || "",
      supplierId,
      importDate: parsedData.importDate ? new Date(parsedData.importDate) : new Date(),
      status: "pending" as const,
      exchangeRate: parsedData.exchangeRate || 5.46,
      freightUSD: parsedData.freightUSD || 0,
      importTaxRate: 60,
      icmsRate: 18,
      otherTaxes: 0,
      shippingMethod: parsedData.shippingMethod || "",
      trackingNumber: parsedData.trackingNumber || "",
      transactionNumber: parsedData.transactionNumber || "",
      paymentMethod: parsedData.paymentMethod || "",
      notes: `Importado via Excel: ${file?.name}`,
      subtotalUSD,
      items: parsedData.products.map(p => ({
        productName: p.name,
        quantity: p.quantity,
        unitPriceUSD: p.unitPriceUSD,
        productDescription: p.description,
        color: p.color,
        size: p.size,
      })),
    });
  };

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
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Importar do Excel</h1>
            <p className="text-muted-foreground">
              Importe dados de fatura comercial a partir de arquivo Excel
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Upload de Arquivo */}
          <Card>
            <CardHeader>
              <CardTitle>1. Selecione o Arquivo Excel</CardTitle>
              <CardDescription>
                Faça upload da fatura comercial em formato Excel (.xlsx, .xls)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">Arquivo Excel</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                />
              </div>

              {file && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  {parsedData && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                </div>
              )}

              {isProcessing && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Processando arquivo...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configurações */}
          <Card>
            <CardHeader>
              <CardTitle>2. Configure a Importação</CardTitle>
              <CardDescription>
                Selecione o fornecedor e revise os dados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Fornecedor *</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {parsedData && (
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="font-semibold text-sm">Dados Extraídos:</h4>
                  
                  {parsedData.invoiceNumber && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Fatura: </span>
                      <span className="font-medium">{parsedData.invoiceNumber}</span>
                    </div>
                  )}

                  {parsedData.shippingMethod && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Envio: </span>
                      <span className="font-medium">{parsedData.shippingMethod}</span>
                    </div>
                  )}

                  <div className="text-sm">
                    <span className="text-muted-foreground">Produtos: </span>
                    <span className="font-medium">{parsedData.products.length}</span>
                  </div>

                  <div className="text-sm">
                    <span className="text-muted-foreground">Total: </span>
                    <span className="font-medium">
                      ${parsedData.products.reduce((sum, p) => sum + (p.quantity * p.unitPriceUSD), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Produtos Encontrados */}
        {parsedData && parsedData.products.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>3. Produtos Encontrados ({parsedData.products.length})</CardTitle>
              <CardDescription>
                Revise os produtos que serão importados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {parsedData.products.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      {product.description && (
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                      )}
                      {(product.color || product.size) && (
                        <p className="text-xs text-muted-foreground">
                          {product.color} {product.size}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{product.quantity}x</p>
                      <p className="text-sm text-muted-foreground">
                        ${product.unitPriceUSD.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botões de Ação */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => setLocation("/importacoes")}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parsedData || parsedData.products.length === 0 || !supplierId || createImportation.isPending}
          >
            <Upload className="h-4 w-4 mr-2" />
            {createImportation.isPending ? "Importando..." : "Importar Dados"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}


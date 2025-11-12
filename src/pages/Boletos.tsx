import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign, CheckCircle2, XCircle, Upload, Download } from "lucide-react";
import { useBoletos } from "@/hooks/useBoletos";
import { BoletoDialog } from "@/components/boletos/BoletoDialog";
import { BoletosTable } from "@/components/boletos/BoletosTable";
import { BoletoStatsCard } from "@/components/boletos/BoletoStatsCard";
import { BoletoFormData, BoletoWithClient } from "@/types/boleto";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImportDialog } from "@/components/dashboard/ImportDialog";
import { exportBoletosToXLSX, importBoletosFromXLSX, downloadBoletoTemplate } from "@/utils/boletoExportImport";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Boletos = () => {
  const { boletos, isLoading, createBoleto, updateBoleto, deleteBoleto, markAsPaid, markAsUnpaid } = useBoletos();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBoleto, setEditingBoleto] = useState<BoletoWithClient | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const handleEdit = (boleto: BoletoWithClient) => {
    setEditingBoleto(boleto);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja deletar este boleto?")) {
      deleteBoleto.mutate(id);
    }
  };

  const handleSubmit = (data: BoletoFormData) => {
    if (editingBoleto) {
      updateBoleto.mutate({ id: editingBoleto.id, data });
    } else {
      createBoleto.mutate(data);
    }
    setEditingBoleto(null);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingBoleto(null);
    }
  };

  // Filtrar boletos por mês
  const filteredBoletos = boletos?.filter((boleto) => {
    if (selectedMonth === "all") return true;
    const boletoMonth = boleto.competencia;
    return boletoMonth === selectedMonth;
  }) || [];

  // Calcular estatísticas
  const totalValue = filteredBoletos.reduce((sum, boleto) => sum + Number(boleto.valor), 0);
  const paidValue = filteredBoletos
    .filter((b) => b.status === "pago")
    .reduce((sum, boleto) => sum + Number(boleto.valor), 0);
  const unpaidValue = filteredBoletos
    .filter((b) => b.status === "não pago")
    .reduce((sum, boleto) => sum + Number(boleto.valor), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Gerar lista de meses a partir de 11/2025 para frente (próximos 12 meses)
  const getMonthOptions = () => {
    const months = [];
    const startDate = new Date(2025, 10, 1); // 11/2025 (mês 10 = novembro)
    for (let i = 0; i < 12; i++) {
      const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const monthStr = date.toISOString().slice(0, 7);
      months.push(monthStr);
    }
    return months;
  };

  const handleExport = () => {
    if (!boletos || boletos.length === 0) {
      toast({
        title: "Nenhum boleto",
        description: "Não há boletos para exportar.",
        variant: "destructive",
      });
      return;
    }
    exportBoletosToXLSX(filteredBoletos);
    toast({
      title: "Dados exportados",
      description: "Os boletos foram exportados para XLSX com sucesso.",
    });
  };

  const handleImport = async (file: File) => {
    try {
      const importedBoletos = await importBoletosFromXLSX(file);
      
      // Buscar clientes para mapear CNPJ -> client_id
      const { data: clients } = await supabase.from("clients").select("id, cnpj");
      
      for (const boleto of importedBoletos) {
        const client = clients?.find(c => c.cnpj === boleto.client_cnpj);
        if (client) {
          await createBoleto.mutateAsync({
            client_id: client.id,
            categoria: boleto.categoria,
            competencia: boleto.competencia,
            vencimento: boleto.vencimento,
            valor: boleto.valor,
            status: boleto.status as "pago" | "não pago",
            data_pagamento: boleto.data_pagamento,
          });
        }
      }
      
      toast({
        title: "Dados importados",
        description: `${importedBoletos.length} boletos foram importados com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao importar",
        description: "Ocorreu um erro ao importar os boletos.",
        variant: "destructive",
      });
    }
  };

  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    return `${month}/${year}`;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <p>Carregando...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Boletos</h1>
            <p className="text-muted-foreground">Gerencie os boletos dos clientes</p>
          </div>
          <div className="flex gap-4 items-center">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos os meses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {getMonthOptions().map((month) => (
                  <SelectItem key={month} value={month}>
                    {formatMonthDisplay(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(true)}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Importar
            </Button>
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Boleto
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <BoletoStatsCard
            title="Total a Receber"
            value={formatCurrency(totalValue)}
            icon={DollarSign}
            iconColor="text-blue-500"
          />
          <BoletoStatsCard
            title="Recebido"
            value={formatCurrency(paidValue)}
            icon={CheckCircle2}
            iconColor="text-green-500"
          />
          <BoletoStatsCard
            title="Pendente"
            value={formatCurrency(unpaidValue)}
            icon={XCircle}
            iconColor="text-red-500"
          />
        </div>

        <BoletosTable
          boletos={filteredBoletos}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onMarkAsPaid={(id) => markAsPaid.mutate(id)}
          onMarkAsUnpaid={(id) => markAsUnpaid.mutate(id)}
        />

        <BoletoDialog
          open={dialogOpen}
          onOpenChange={handleDialogChange}
          onSubmit={handleSubmit}
          initialData={editingBoleto || undefined}
        />

        <ImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onImport={handleImport}
          onDownloadTemplate={downloadBoletoTemplate}
          title="Importar Boletos"
          description="Baixe o modelo XLSX, preencha com os dados dos boletos e importe o arquivo."
        />
      </div>
    </MainLayout>
  );
};

export default Boletos;

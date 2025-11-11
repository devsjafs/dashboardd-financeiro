import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign, CheckCircle2, XCircle } from "lucide-react";
import { useBoletos } from "@/hooks/useBoletos";
import { BoletoDialog } from "@/components/boletos/BoletoDialog";
import { BoletosTable } from "@/components/boletos/BoletosTable";
import { BoletoStatsCard } from "@/components/boletos/BoletoStatsCard";
import { BoletoFormData, BoletoWithClient } from "@/types/boleto";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Boletos = () => {
  const { boletos, isLoading, createBoleto, updateBoleto, deleteBoleto, markAsPaid, markAsUnpaid } = useBoletos();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBoleto, setEditingBoleto] = useState<BoletoWithClient | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

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

  // Gerar lista de meses dos últimos 12 meses
  const getMonthOptions = () => {
    const months = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStr = date.toISOString().slice(0, 7);
      months.push(monthStr);
    }
    return months;
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
      </div>
    </MainLayout>
  );
};

export default Boletos;

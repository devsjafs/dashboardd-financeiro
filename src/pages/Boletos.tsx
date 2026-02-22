import { useState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, DollarSign, CheckCircle2, XCircle, Upload, Download, CloudDownload, RefreshCw, MoreHorizontal, Trash2 } from "lucide-react";
import { useBoletos } from "@/hooks/useBoletos";
import { useBillingImport } from "@/hooks/useBillingImport";
import { useBillingSync } from "@/hooks/useBillingSync";
import { useDeleteAllBoletos } from "@/hooks/useDeleteAllBoletos";
import { useActiveBillingProvider } from "@/hooks/useActiveBillingProvider";
import { useAuth } from "@/contexts/AuthContext";
import { BoletoDialog } from "@/components/boletos/BoletoDialog";
import { BoletosTable } from "@/components/boletos/BoletosTable";
import { BoletoStatsCard } from "@/components/boletos/BoletoStatsCard";
import { BoletoDeleteAllDialog } from "@/components/boletos/BoletoDeleteAllDialog";
import { BoletoFormData, BoletoWithClient } from "@/types/boleto";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImportDialog } from "@/components/dashboard/ImportDialog";
import { BillingImportDialog } from "@/components/boletos/BillingImportDialog";
import { exportBoletosToXLSX, importBoletosFromXLSX, downloadBoletoTemplate } from "@/utils/boletoExportImport";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Boletos = () => {
  const { boletos, isLoading, createBoleto, updateBoleto, deleteBoleto, markAsPaid, markAsUnpaid } = useBoletos();
  const { activeProvider, activeConfig, isImplemented } = useActiveBillingProvider();
  const { importBoletos, importing, progress, importLog, clearLog } = useBillingImport(activeProvider);
  const { syncStatus, syncing } = useBillingSync(activeProvider);
  const { deleteAll, isDeleting } = useDeleteAllBoletos();
  const { userRole } = useAuth();
  const { toast } = useToast();
  const hasSynced = useRef(false);

  // Auto-sync on first page load (only if provider is implemented)
  useEffect(() => {
    if (!hasSynced.current && isImplemented) {
      hasSynced.current = true;
      syncStatus(true);
    }
  }, [isImplemented]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBoleto, setEditingBoleto] = useState<BoletoWithClient | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllScope, setDeleteAllScope] = useState<"month" | "all">("all");

  const getCurrentMonth = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`;
  };
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [billingDialogOpen, setBillingDialogOpen] = useState(false);

  const canDeleteAll = userRole === "owner" || userRole === "admin";

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
    if (!open) setEditingBoleto(null);
  };

  const handleDeleteAllClick = (scope: "month" | "all") => {
    setDeleteAllScope(scope);
    setDeleteAllOpen(true);
  };

  const handleDeleteAllConfirm = async () => {
    const monthFilter = deleteAllScope === "month" && selectedMonth !== "all" ? selectedMonth : null;
    await deleteAll(monthFilter);
  };

  // Filter boletos by selected month
  const filteredBoletos = (boletos?.filter((boleto) => {
    if ((boleto as any).deleted_at) return false; // exclude soft-deleted
    if (selectedMonth === "all") return true;
    const boletoMonth = boleto.vencimento?.slice(0, 7);
    return boletoMonth === selectedMonth;
  }) || []) as BoletoWithClient[];

  // Stats (exclude cancelled)
  const activeBoletos = filteredBoletos.filter(b => (b.status as string) !== "cancelado");
  const totalValue = activeBoletos.reduce((sum, b) => sum + Number(b.valor), 0);
  const paidValue = activeBoletos.filter(b => b.status === "pago").reduce((sum, b) => sum + Number(b.valor), 0);
  const unpaidValue = activeBoletos.filter(b => b.status === "não pago").reduce((sum, b) => sum + Number(b.valor), 0);

  // Count for delete dialog
  const deleteTargetBoletos = deleteAllScope === "month" && selectedMonth !== "all"
    ? filteredBoletos
    : (boletos?.filter(b => !(b as any).deleted_at) || []) as BoletoWithClient[];
  const deleteTargetPaidCount = deleteTargetBoletos.filter(b => b.status === "pago").length;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const getMonthOptions = () => {
    const months = [];
    const now = new Date();
    for (let i = -12; i <= 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      months.push(`${yyyy}-${mm}`);
    }
    return months;
  };

  const handleExport = () => {
    if (!filteredBoletos || filteredBoletos.length === 0) {
      toast({ title: "Nenhum boleto", description: "Não há boletos para exportar.", variant: "destructive" });
      return;
    }
    exportBoletosToXLSX(filteredBoletos);
    toast({ title: "Dados exportados", description: "Os boletos foram exportados para XLSX com sucesso." });
  };

  const handleImport = async (file: File) => {
    try {
      const importedBoletos = await importBoletosFromXLSX(file);
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
      toast({ title: "Dados importados", description: `${importedBoletos.length} boletos foram importados com sucesso.` });
    } catch {
      toast({ title: "Erro ao importar", description: "Ocorreu um erro ao importar os boletos.", variant: "destructive" });
    }
  };

  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    return `${month}/${year}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Boletos</h1>
            <p className="text-muted-foreground">Gerencie os boletos dos clientes</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap justify-end">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[150px]">
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
              onClick={() => syncStatus(false)}
              disabled={syncing || importing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sincronizando..." : `Sincronizar ${activeConfig.label}`}
            </Button>

            <Button
              variant="outline"
              onClick={() => setBillingDialogOpen(true)}
              disabled={importing}
              className="gap-2"
            >
              <CloudDownload className="w-4 h-4" />
              {importing ? "Importando..." : `Importar ${activeConfig.label}`}
            </Button>

            <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="gap-2">
              <Upload className="w-4 h-4" />
              Importar XLSX
            </Button>

            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>

            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>

            {canDeleteAll && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {selectedMonth !== "all" && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive gap-2"
                      onClick={() => handleDeleteAllClick("month")}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir boletos de {formatMonthDisplay(selectedMonth)}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive gap-2"
                    onClick={() => handleDeleteAllClick("all")}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir todos os boletos
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <BoletoStatsCard title="Total a Receber" value={formatCurrency(totalValue)} icon={DollarSign} iconColor="text-blue-500" />
          <BoletoStatsCard title="Recebido" value={formatCurrency(paidValue)} icon={CheckCircle2} iconColor="text-green-500" />
          <BoletoStatsCard title="Pendente" value={formatCurrency(unpaidValue)} icon={XCircle} iconColor="text-red-500" />
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

        <BillingImportDialog
          open={billingDialogOpen}
          onOpenChange={setBillingDialogOpen}
          onImport={(connId) => { importBoletos(connId); }}
          importing={importing}
          progress={progress}
          importLog={importLog}
          onClearLog={clearLog}
          provider={activeProvider}
          providerLabel={activeConfig.label}
        />

        <BoletoDeleteAllDialog
          open={deleteAllOpen}
          onOpenChange={setDeleteAllOpen}
          onConfirm={handleDeleteAllConfirm}
          totalCount={deleteTargetBoletos.length}
          paidCount={deleteTargetPaidCount}
          monthFilter={deleteAllScope === "month" && selectedMonth !== "all" ? selectedMonth : null}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
};

export default Boletos;

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCommissions } from "@/hooks/useCommissions";
import { CommissionsTable } from "@/components/commissions/CommissionsTable";
import { CommissionDialog } from "@/components/commissions/CommissionDialog";
import { CommissionStatsCard } from "@/components/commissions/CommissionStatsCard";

export default function Commissions() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCommissionId, setEditingCommissionId] = useState<string | null>(null);
  const { commissions, payments, isLoading } = useCommissions();

  const handleEdit = (id: string) => {
    setEditingCommissionId(id);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingCommissionId(null);
  };

  // Calcular estatísticas
  const totalComissoes = commissions.reduce((sum, c) => {
    const numTrimestres = c.duracao_meses / 3;
    return sum + (c.valor_base * c.percentual_comissao / 100) * numTrimestres;
  }, 0);

  const pagoComissoes = payments
    .filter(p => p.pago)
    .reduce((sum, p) => sum + Number(p.preco), 0);

  const pendenteComissoes = payments
    .filter(p => !p.pago)
    .reduce((sum, p) => sum + Number(p.preco), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Comissões</h1>
          <p className="text-muted-foreground">
            Gerencie as comissões e pagamentos trimestrais
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Comissão
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <CommissionStatsCard
          title="Total de Comissões"
          value={totalComissoes}
          type="total"
        />
        <CommissionStatsCard
          title="Comissões Pagas"
          value={pagoComissoes}
          type="paid"
        />
        <CommissionStatsCard
          title="Comissões Pendentes"
          value={pendenteComissoes}
          type="pending"
        />
      </div>

      <CommissionsTable
        commissions={commissions}
        payments={payments}
        onEdit={handleEdit}
      />

      <CommissionDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        commissionId={editingCommissionId}
      />
    </div>
  );
}

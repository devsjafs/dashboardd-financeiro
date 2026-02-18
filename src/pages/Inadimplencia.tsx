import { useBoletos } from "@/hooks/useBoletos";
import { DebtSummaryCards } from "@/components/inadimplencia/DebtSummaryCards";
import { InadimplenciaChart } from "@/components/inadimplencia/InadimplenciaChart";
import { TopDebtorsTable } from "@/components/inadimplencia/TopDebtorsTable";
import { OverdueBoletosTable } from "@/components/inadimplencia/OverdueBoletosTable";

export default function Inadimplencia() {
  const { boletos, isLoading, markAsPaid } = useBoletos();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const boletosData = (boletos as any[]) || [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inadimplência & Resumo Financeiro</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão consolidada de boletos em aberto, vencidos e taxa de inadimplência.
        </p>
      </div>

      <DebtSummaryCards boletos={boletosData} />
      <InadimplenciaChart boletos={boletosData} />

      <TopDebtorsTable boletos={boletosData} />

      <OverdueBoletosTable
        boletos={boletosData}
        onMarkAsPaid={(id) => markAsPaid.mutateAsync(id)}
        isMarkingPaid={markAsPaid.isPending}
      />
    </div>
  );
}

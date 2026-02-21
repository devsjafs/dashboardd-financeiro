import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { BoletoCheckSummary } from "@/hooks/useMonthlyBoletoCheck";

interface MonthlyBoletoCardProps {
  summary: BoletoCheckSummary | null;
  loading: boolean;
  onCheck: () => void;
}

const formatCompetencia = (comp: string) => {
  const [y, m] = comp.split("-");
  return `${m}/${y}`;
};

export function MonthlyBoletoCard({ summary, loading, onCheck }: MonthlyBoletoCardProps) {
  const percentage = summary ? Math.round((summary.ok / Math.max(summary.total, 1)) * 100) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">
          Boletos {summary ? formatCompetencia(summary.competencia) : "do Mês"} no Nibo
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onCheck}
          disabled={loading}
          className="gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Verificar
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && !summary && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {summary && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {summary.ok} de {summary.total} clientes com boletos emitidos
                </span>
                <span className="font-medium">{percentage}%</span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>

            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>{summary.ok} OK</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>{summary.parcial} Parcial</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <XCircle className="h-4 w-4 text-destructive" />
                <span>{summary.pendente} Pendente</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

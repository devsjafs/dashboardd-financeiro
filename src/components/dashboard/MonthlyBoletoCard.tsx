import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useMonthlyBoletoCheck } from "@/hooks/useMonthlyBoletoCheck";
import { ScrollArea } from "@/components/ui/scroll-area";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatCompetencia = (comp: string) => {
  const [y, m] = comp.split("-");
  return `${m}/${y}`;
};

const serviceLabels: Record<string, string> = {
  smart: "Smart",
  apoio: "Apoio",
  contabilidade: "Contábil",
  personalite: "Personalite",
};

export function MonthlyBoletoCard() {
  const { check, loading, summary, results } = useMonthlyBoletoCheck();

  useEffect(() => {
    check();
  }, []);

  const percentage = summary ? Math.round((summary.ok / Math.max(summary.total, 1)) * 100) : 0;
  const pendentes = results.filter((r) => r.status !== "ok");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">
          Boletos {summary ? formatCompetencia(summary.competencia) : "do Mês"} no Nibo
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => check()}
          disabled={loading}
          className="gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Verificar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !summary && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              <Progress value={percentage} className="h-3" />
            </div>

            <div className="flex gap-3">
              <div className="flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{summary.ok} OK</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span>{summary.parcial} Parcial</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <XCircle className="h-4 w-4 text-red-500" />
                <span>{summary.pendente} Pendente</span>
              </div>
            </div>

            {pendentes.length > 0 && (
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {pendentes.map((r) => (
                    <div
                      key={r.clientId}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{r.nomeFantasia}</p>
                        <div className="flex flex-wrap gap-1">
                          {r.expectedBoletos.map((eb) => {
                            const found = r.foundBoletos.some(
                              (fb) => Math.abs(fb.valor - eb.valor) <= 0.05
                            );
                            return (
                              <Badge
                                key={eb.service}
                                variant={found ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {serviceLabels[eb.service] || eb.service} {formatCurrency(eb.valor)}{" "}
                                {found ? "✓" : "✗"}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                      <Badge
                        variant={r.status === "parcial" ? "outline" : "destructive"}
                        className="shrink-0"
                      >
                        {r.status === "parcial" ? "Parcial" : "Pendente"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {pendentes.length === 0 && summary.total > 0 && (
              <div className="flex items-center gap-2 text-sm text-green-600 py-2">
                <CheckCircle2 className="h-5 w-5" />
                <span>Todos os boletos do mês estão emitidos no Nibo!</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, ExternalLink } from "lucide-react";
import type { BoletoCheckResult } from "@/hooks/useMonthlyBoletoCheck";

interface NiboStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  result: BoletoCheckResult | null;
}

const serviceLabels: Record<string, string> = {
  smart: "Smart",
  apoio: "Apoio",
  contabilidade: "Contábil",
  personalite: "Personalite",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  const d = dateStr.substring(0, 10);
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

export function NiboStatusDialog({ open, onOpenChange, clientName, result }: NiboStatusDialogProps) {
  if (!result) return null;

  const statusConfig = {
    ok: { label: "Emitido", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
    parcial: { label: "Parcial", icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
    pendente: { label: "Pendente", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
  };

  const config = statusConfig[result.status];
  const StatusIcon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${config.color}`} />
            {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status Nibo:</span>
            <Badge variant="outline" className={config.bg}>
              {config.label}
            </Badge>
          </div>

          {/* Expected boletos */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Boletos Esperados</h4>
            <div className="space-y-1.5">
              {result.expectedBoletos.map((exp, i) => {
                // Check if this expected boleto was found
                const tolerance = Math.max(5, exp.valor * 0.025);
                const found = result.foundBoletos.find(
                  (fb) => Math.abs(fb.valor - exp.valor) <= tolerance
                );
                const diff = found ? found.valor - exp.valor : 0;
                const hasJuros = found && diff > 1;
                const hasDesconto = found && diff < -1;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      {found ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <span className="text-sm font-medium">
                        {serviceLabels[exp.service] || exp.service}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{formatCurrency(exp.valor)}</span>
                      {found ? (
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-emerald-500">
                            Venc. {formatDate(found.dueDate)}
                          </span>
                          {hasJuros && (
                            <span className="text-xs text-amber-500">
                              Juros: +{formatCurrency(diff)} ({formatCurrency(found.valor)})
                            </span>
                          )}
                          {hasDesconto && (
                            <span className="text-xs text-blue-400">
                              Desconto: {formatCurrency(diff)} ({formatCurrency(found.valor)})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-destructive">Não encontrado</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Found boletos in Nibo that didn't match */}
          {result.foundBoletos.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">
                Boletos Encontrados no Nibo ({result.foundBoletos.length})
              </h4>
              <div className="space-y-1.5">
                {result.foundBoletos.map((fb, i) => {
                  const matched = result.expectedBoletos.some(
                    (exp) => {
                      const tolerance = Math.max(5, exp.valor * 0.025);
                      return Math.abs(fb.valor - exp.valor) <= tolerance;
                    }
                  );
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        {matched ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                        <span className="text-sm">
                          {formatCurrency(fb.valor)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Venc. {formatDate(fb.dueDate)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {result.foundBoletos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Nenhum boleto encontrado no Nibo para este CNPJ no mês.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

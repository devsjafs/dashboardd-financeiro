import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useClientHistory } from "@/hooks/useClientHistory";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";

interface ClientHistoryDialogProps {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fieldNameMap: Record<string, string> = {
  valor_smart: "Valor Smart",
  valor_apoio: "Valor Apoio",
  valor_contabilidade: "Valor Contábil",
  valor_personalite: "Valor Personalite",
  status: "Status",
  situacao: "Situação",
};

export const ClientHistoryDialog = ({
  clientId,
  clientName,
  open,
  onOpenChange,
}: ClientHistoryDialogProps) => {
  const { data: history = [], isLoading } = useClientHistory(clientId);

  const formatValue = (fieldName: string, value: string) => {
    if (fieldName.startsWith("valor_")) {
      return `R$ ${parseFloat(value).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    return value;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Alterações - {clientName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma alteração registrada ainda.
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-2">
                      {fieldNameMap[entry.fieldName] || entry.fieldName}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Valor anterior:</span>
                        <p className="font-medium text-destructive">
                          {formatValue(entry.fieldName, entry.oldValue)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Novo valor:</span>
                        <p className="font-medium text-green-600">
                          {formatValue(entry.fieldName, entry.newValue)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(entry.changedAt), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

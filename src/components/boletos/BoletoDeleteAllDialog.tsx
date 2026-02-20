import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Trash2 } from "lucide-react";

interface BoletoDeleteAllDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  totalCount: number;
  paidCount: number;
  monthFilter: string | null; // 'YYYY-MM' or null for all
  isDeleting: boolean;
}

export const BoletoDeleteAllDialog = ({
  open,
  onOpenChange,
  onConfirm,
  totalCount,
  paidCount,
  monthFilter,
  isDeleting,
}: BoletoDeleteAllDialogProps) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState("");

  const CONFIRM_WORD = "EXCLUIR";
  const isConfirmValid = confirmText === CONFIRM_WORD;

  const monthLabel = monthFilter
    ? `do mês ${monthFilter.split("-").reverse().join("/")}`
    : "de todos os períodos";

  const handleClose = () => {
    setStep(1);
    setConfirmText("");
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (!isConfirmValid) return;
    await onConfirm();
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Ação Irreversível
              </DialogTitle>
              <DialogDescription className="sr-only">
                Confirmação para excluir todos os boletos
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                <p className="text-sm font-medium">
                  Você está prestes a excluir <span className="font-bold text-destructive">{totalCount} boletos</span> {monthLabel}.
                </p>
                <p className="text-sm text-muted-foreground">
                  Esta ação <strong>não pode ser desfeita</strong>.
                </p>
                {paidCount > 0 && (
                  <div className="flex items-start gap-2 rounded-md bg-warning/10 border border-warning/30 p-3">
                    <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      <strong>{paidCount} boletos pagos</strong> serão arquivados (não excluídos permanentemente) para manter o histórico financeiro.
                    </p>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {totalCount - paidCount} boletos não pagos serão excluídos permanentemente.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={() => setStep(2)}>
                Continuar →
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Confirme a exclusão
              </DialogTitle>
              <DialogDescription className="sr-only">
                Digite EXCLUIR para confirmar
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Para confirmar, digite <span className="font-mono font-bold text-foreground">{CONFIRM_WORD}</span> no campo abaixo:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Digite EXCLUIR para confirmar"
                className={isConfirmValid ? "border-destructive ring-1 ring-destructive" : ""}
                disabled={isDeleting}
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter" && isConfirmValid) handleConfirm(); }}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setStep(1); setConfirmText(""); }} disabled={isDeleting}>
                Voltar
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={!isConfirmValid || isDeleting}
              >
                {isDeleting ? "Excluindo..." : "Excluir Permanentemente"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

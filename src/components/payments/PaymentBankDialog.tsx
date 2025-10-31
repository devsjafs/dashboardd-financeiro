import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PaymentBankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (banco: string) => void;
}

export function PaymentBankDialog({
  open,
  onOpenChange,
  onConfirm,
}: PaymentBankDialogProps) {
  const [banco, setBanco] = useState("");

  const handleConfirm = () => {
    onConfirm(banco);
    setBanco("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Marcar como pago</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="banco">Banco</Label>
            <Input
              id="banco"
              placeholder="Ex: Banco do Brasil"
              value={banco}
              onChange={(e) => setBanco(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>Confirmar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

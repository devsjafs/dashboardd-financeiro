import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Payment, PaymentFormData } from "@/types/payment";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: Payment;
  onSave: (data: PaymentFormData) => Promise<void>;
}

export const PaymentDialog = ({
  open,
  onOpenChange,
  payment,
  onSave,
}: PaymentDialogProps) => {
  const [formData, setFormData] = useState<PaymentFormData>({
    descricao: "",
    vencimento: "",
    valor: 0,
    status: "não pago",
    data_pagamento: null,
    recorrente: false,
    intervalo_recorrencia: null,
  });

  useEffect(() => {
    if (payment) {
      setFormData({
        descricao: payment.descricao,
        vencimento: payment.vencimento,
        valor: payment.valor,
        status: payment.status,
        data_pagamento: payment.data_pagamento,
        recorrente: payment.recorrente,
        intervalo_recorrencia: payment.intervalo_recorrencia,
      });
    } else {
      setFormData({
        descricao: "",
        vencimento: "",
        valor: 0,
        status: "não pago",
        data_pagamento: null,
        recorrente: false,
        intervalo_recorrencia: null,
      });
    }
  }, [payment, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {payment ? "Editar Despesa" : "Nova Despesa"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              placeholder="Ex: Conta de luz"
              value={formData.descricao}
              onChange={(e) =>
                setFormData({ ...formData, descricao: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vencimento">Vencimento</Label>
            <Input
              id="vencimento"
              type="date"
              value={formData.vencimento}
              onChange={(e) =>
                setFormData({ ...formData, vencimento: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={formData.valor}
              onChange={(e) =>
                setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })
              }
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="recorrente"
              checked={formData.recorrente}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  recorrente: checked,
                  intervalo_recorrencia: checked ? "mensal" : null,
                })
              }
            />
            <Label htmlFor="recorrente">Despesa recorrente</Label>
          </div>

          {formData.recorrente && (
            <div className="space-y-2">
              <Label htmlFor="intervalo">Intervalo de recorrência</Label>
              <Select
                value={formData.intervalo_recorrencia || "mensal"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    intervalo_recorrencia: value as any,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o intervalo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

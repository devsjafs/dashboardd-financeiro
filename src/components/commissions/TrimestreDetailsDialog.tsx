import { useState } from "react";
import { formatMonthYear } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CommissionPayment } from "@/types/commission";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface TrimestreDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: CommissionPayment | null;
}

export function TrimestreDetailsDialog({
  open,
  onOpenChange,
  payment,
}: TrimestreDetailsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mes1, setMes1] = useState("");
  const [mes2, setMes2] = useState("");
  const [mes3, setMes3] = useState("");
  const [metodo, setMetodo] = useState<string>("");
  const [documento, setDocumento] = useState("");

  const handleSave = async () => {
    if (!payment) return;

    try {
      const { error } = await supabase
        .from("commission_payments")
        .update({
          mes1_vencimento: mes1 || null,
          mes2_vencimento: mes2 || null,
          mes3_vencimento: mes3 || null,
          metodo_pagamento: metodo || null,
          documento: documento || null,
        })
        .eq("id", payment.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["commission-payments"] });
      toast({
        title: "Dados salvos",
        description: "Os detalhes do trimestre foram atualizados.",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar os dados.",
        variant: "destructive",
      });
    }
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Detalhes do {payment.trimestre_numero}º Trimestre
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Período: {formatMonthYear(payment.inicio_trimestre)} - {formatMonthYear(payment.fim_trimestre)}
          </div>

          <div className="space-y-2">
            <Label>Vencimento Mês 1</Label>
            <Input
              type="date"
              value={mes1}
              onChange={(e) => setMes1(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Vencimento Mês 2</Label>
            <Input
              type="date"
              value={mes2}
              onChange={(e) => setMes2(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Vencimento Mês 3</Label>
            <Input
              type="date"
              value={mes3}
              onChange={(e) => setMes3(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Método de Recebimento</Label>
            <Select value={metodo} onValueChange={setMetodo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
                <SelectItem value="desconto">Desconto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Número do Documento</Label>
            <Input
              placeholder="Ex: 123456"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

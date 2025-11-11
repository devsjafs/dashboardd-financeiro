import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BoletoFormData } from "@/types/boleto";
import { useClients } from "@/hooks/useClients";

interface BoletoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: BoletoFormData) => void;
  initialData?: BoletoFormData & { id: string };
}

const categorias = [
  "Smart",
  "Apoio",
  "Contabilidade",
  "Personalite",
  "Outros"
];

export const BoletoDialog = ({ open, onOpenChange, onSubmit, initialData }: BoletoDialogProps) => {
  const { clients } = useClients();
  const [formData, setFormData] = useState<BoletoFormData>({
    client_id: "",
    valor: 0,
    vencimento: "",
    competencia: "",
    categoria: "",
    status: "não pago",
    data_pagamento: null,
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        client_id: "",
        valor: 0,
        vencimento: "",
        competencia: "",
        categoria: "",
        status: "não pago",
        data_pagamento: null,
      });
    }
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Boleto" : "Novo Boleto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client_id">Cliente</Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => setFormData({ ...formData, client_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.nomeFantasia}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              value={formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vencimento">Vencimento</Label>
            <Input
              id="vencimento"
              type="date"
              value={formData.vencimento}
              onChange={(e) => setFormData({ ...formData, vencimento: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="competencia">Competência</Label>
            <Input
              id="competencia"
              type="month"
              value={formData.competencia}
              onChange={(e) => setFormData({ ...formData, competencia: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria">Categoria</Label>
            <Select
              value={formData.categoria}
              onValueChange={(value) => setFormData({ ...formData, categoria: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2">
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

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addMonths, format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCommissions } from "@/hooks/useCommissions";
import { useClients } from "@/hooks/useClients";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  client_id: z.string().min(1, "Cliente é obrigatório"),
  vendedor: z.string().min(1, "Vendedor é obrigatório"),
  inicio_periodo: z.string().min(1, "Data de início é obrigatória"),
  duracao_meses: z.enum(["12", "24"]),
  percentual_comissao: z.string().min(1, "Percentual é obrigatório"),
  valor_base: z.string().min(1, "Valor base é obrigatório"),
  dia_vencimento: z.string().min(1, "Dia de vencimento é obrigatório"),
});

interface CommissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commissionId: string | null;
}

export function CommissionDialog({ open, onOpenChange, commissionId }: CommissionDialogProps) {
  const { createCommission, updateCommission, commissions } = useCommissions();
  const { clients } = useClients();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: "",
      vendedor: "",
      inicio_periodo: "",
      duracao_meses: "12",
      percentual_comissao: "10",
      valor_base: "",
      dia_vencimento: "20",
    },
  });

  useEffect(() => {
    if (commissionId && open) {
      const commission = commissions.find((c) => c.id === commissionId);
      if (commission) {
        form.reset({
          client_id: commission.client_id,
          vendedor: commission.vendedor,
          inicio_periodo: commission.inicio_periodo,
          duracao_meses: String(commission.duracao_meses) as "12" | "24",
          percentual_comissao: String(commission.percentual_comissao),
          valor_base: String(commission.valor_base),
          dia_vencimento: "20",
        });
      }
    } else if (!open) {
      form.reset();
    }
  }, [commissionId, open, commissions, form]);

  const createQuarterlyPayments = async (commissionId: string, values: z.infer<typeof formSchema>) => {
    const numTrimestres = parseInt(values.duracao_meses) / 3;
    // Valor base é a mensalidade, então multiplicar por 3 (3 meses) e depois aplicar %
    const valorComissao = (parseFloat(values.valor_base) * 3 * parseFloat(values.percentual_comissao)) / 100;
    const diaVencimento = parseInt(values.dia_vencimento);
    
    const payments = [];
    for (let i = 0; i < numTrimestres; i++) {
      const inicioTrimestre = addMonths(new Date(values.inicio_periodo), i * 3);
      const fimTrimestre = addMonths(inicioTrimestre, 2);
      
      // Calcular vencimento (último mês do trimestre, no dia especificado)
      const vencimento = new Date(fimTrimestre);
      vencimento.setDate(diaVencimento);
      
      payments.push({
        commission_id: commissionId,
        trimestre_numero: i + 1,
        inicio_trimestre: format(inicioTrimestre, "yyyy-MM-dd"),
        fim_trimestre: format(fimTrimestre, "yyyy-MM-dd"),
        data_vencimento: format(vencimento, "yyyy-MM-dd"),
        preco: valorComissao,
        pago: false,
        data_pagamento: null,
      });
    }

    const { error } = await supabase
      .from("commission_payments")
      .insert(payments);

    if (error) throw error;
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const commissionData = {
        client_id: values.client_id,
        vendedor: values.vendedor,
        inicio_periodo: values.inicio_periodo,
        duracao_meses: parseInt(values.duracao_meses) as 12 | 24,
        percentual_comissao: parseFloat(values.percentual_comissao),
        valor_base: parseFloat(values.valor_base),
      };

      if (commissionId) {
        await updateCommission.mutateAsync({ id: commissionId, ...commissionData });
      } else {
        const newCommission = await createCommission.mutateAsync(commissionData);
        await createQuarterlyPayments(newCommission.id, values);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar comissão:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {commissionId ? "Editar Comissão" : "Nova Comissão"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.codigo} - {client.nomeFantasia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vendedor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendedor</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome do vendedor" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="inicio_periodo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início do Período</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duracao_meses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="12">12 meses (4 trimestres)</SelectItem>
                        <SelectItem value="24">24 meses (8 trimestres)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dia_vencimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia do Vencimento</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="1" max="31" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="percentual_comissao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>% Comissão</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valor_base"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Base (Mensalidade)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

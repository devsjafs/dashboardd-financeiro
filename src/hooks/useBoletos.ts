import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BoletoFormData } from "@/types/boleto";
import { getLocalDateString } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export const useBoletos = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  const { data: boletos, isLoading } = useQuery({
    queryKey: ["boletos", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boletos")
        .select(`
          *,
          clients (
            nome_fantasia,
            cnpj,
            email
          )
        `)
        .order("vencimento", { ascending: false });

      if (error) throw error;
      return data as any;
    },
    enabled: !!organizationId,
  });

  const createBoleto = useMutation({
    mutationFn: async (formData: BoletoFormData) => {
      const { error } = await supabase.from("boletos").insert([{ ...formData, organization_id: organizationId }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boletos"] });
      toast({ title: "Sucesso", description: "Boleto criado com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: `Erro ao criar boleto: ${error.message}`, variant: "destructive" });
    },
  });

  const updateBoleto = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BoletoFormData> }) => {
      const { error } = await supabase.from("boletos").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boletos"] });
      toast({ title: "Sucesso", description: "Boleto atualizado com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: `Erro ao atualizar boleto: ${error.message}`, variant: "destructive" });
    },
  });

  const deleteBoleto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("boletos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boletos"] });
      toast({ title: "Sucesso", description: "Boleto deletado com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: `Erro ao deletar boleto: ${error.message}`, variant: "destructive" });
    },
  });

  const markAsPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("boletos")
        .update({ status: "pago", data_pagamento: getLocalDateString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boletos"] });
      toast({ title: "Sucesso", description: "Boleto marcado como pago" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: `Erro ao marcar boleto como pago: ${error.message}`, variant: "destructive" });
    },
  });

  const markAsUnpaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("boletos")
        .update({ status: "não pago", data_pagamento: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boletos"] });
      toast({ title: "Sucesso", description: "Boleto marcado como não pago" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: `Erro ao marcar boleto como não pago: ${error.message}`, variant: "destructive" });
    },
  });

  return { boletos, isLoading, createBoleto, updateBoleto, deleteBoleto, markAsPaid, markAsUnpaid };
};

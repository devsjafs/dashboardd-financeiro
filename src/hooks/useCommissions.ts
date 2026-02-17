import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Commission, CommissionPayment } from "@/types/commission";
import { useAuth } from "@/contexts/AuthContext";

export const useCommissions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ["commissions", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commissions")
        .select(`*, clients (nome_fantasia, codigo)`)
        .order("inicio_periodo", { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!organizationId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["commission-payments", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_payments")
        .select("*")
        .order("inicio_trimestre", { ascending: true });

      if (error) throw error;
      return data as CommissionPayment[];
    },
    enabled: !!organizationId,
  });

  const createCommission = useMutation({
    mutationFn: async (commission: Omit<Commission, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("commissions")
        .insert({ ...commission, organization_id: organizationId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      toast({ title: "Comissão criada", description: "A comissão foi criada com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível criar a comissão.", variant: "destructive" });
    },
  });

  const updateCommission = useMutation({
    mutationFn: async ({ id, ...commission }: Partial<Commission> & { id: string }) => {
      const { data, error } = await supabase
        .from("commissions")
        .update(commission)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      toast({ title: "Comissão atualizada", description: "A comissão foi atualizada com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar a comissão.", variant: "destructive" });
    },
  });

  const deleteCommission = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("commissions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      toast({ title: "Comissão deletada", description: "A comissão foi deletada com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível deletar a comissão.", variant: "destructive" });
    },
  });

  const markPaymentAsPaid = useMutation({
    mutationFn: async ({ id, data_pagamento }: { id: string; data_pagamento: string }) => {
      const { data, error } = await supabase
        .from("commission_payments")
        .update({ pago: true, data_pagamento })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commission-payments"] });
      toast({ title: "Pagamento registrado", description: "O pagamento foi marcado como pago." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar o pagamento.", variant: "destructive" });
    },
  });

  const markPaymentAsUnpaid = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("commission_payments")
        .update({ pago: false, data_pagamento: null })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commission-payments"] });
      toast({ title: "Pagamento revertido", description: "O pagamento foi marcado como não pago." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar o pagamento.", variant: "destructive" });
    },
  });

  return {
    commissions, payments, isLoading,
    createCommission, updateCommission, deleteCommission,
    markPaymentAsPaid, markPaymentAsUnpaid,
  };
};

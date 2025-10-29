import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Payment, PaymentFormData } from "@/types/payment";
import { useToast } from "@/hooks/use-toast";

export const usePayments = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("vencimento", { ascending: true });

      if (error) throw error;
      return data as Payment[];
    },
  });

  const createPayment = useMutation({
    mutationFn: async (payment: PaymentFormData) => {
      const { data, error } = await supabase
        .from("payments")
        .insert([payment])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({
        title: "Pagamento criado",
        description: "O pagamento foi criado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o pagamento.",
        variant: "destructive",
      });
    },
  });

  const updatePayment = useMutation({
    mutationFn: async (payment: Payment) => {
      const { data, error } = await supabase
        .from("payments")
        .update(payment)
        .eq("id", payment.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({
        title: "Pagamento atualizado",
        description: "O pagamento foi atualizado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o pagamento.",
        variant: "destructive",
      });
    },
  });

  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({
        title: "Pagamento excluído",
        description: "O pagamento foi excluído com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o pagamento.",
        variant: "destructive",
      });
    },
  });

  const markAsPaid = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("payments")
        .update({
          status: "pago",
          data_pagamento: new Date().toISOString().split("T")[0],
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({
        title: "Pagamento confirmado",
        description: "O pagamento foi marcado como pago.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o pagamento.",
        variant: "destructive",
      });
    },
  });

  return {
    payments,
    isLoading,
    createPayment,
    updatePayment,
    deletePayment,
    markAsPaid,
  };
};

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/types/client";
import { toast } from "@/hooks/use-toast";

export const useClients = () => {
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("codigo", { ascending: true });

      if (error) throw error;

      return data.map((client: any) => ({
        id: client.id,
        codigo: client.codigo,
        nomeFantasia: client.nome_fantasia,
        razaoSocial: client.razao_social,
        cnpj: client.cnpj,
        documentType: client.document_type || 'cnpj',
        valorMensalidade: {
          smart: Number(client.valor_smart),
          apoio: Number(client.valor_apoio),
          contabilidade: Number(client.valor_contabilidade),
          personalite: Number(client.valor_personalite),
        },
        vencimento: client.vencimento,
        inicioCompetencia: client.inicio_competencia,
        ultimaCompetencia: client.ultima_competencia,
        services: client.services,
        situacao: client.situacao,
        status: client.status,
        grupo: client.grupo,
        ultimoReajuste: client.ultimo_reajuste,
        periodoReajusteMeses: client.periodo_reajuste_meses ?? 12,
        createdAt: client.created_at,
        updatedAt: client.updated_at,
      })) as Client[];
    },
  });

  const createClient = useMutation({
    mutationFn: async (client: Omit<Client, "id" | "createdAt" | "updatedAt">) => {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          codigo: client.codigo,
          nome_fantasia: client.nomeFantasia,
          razao_social: client.razaoSocial,
          cnpj: client.cnpj,
          document_type: client.documentType,
          valor_smart: client.valorMensalidade.smart,
          valor_apoio: client.valorMensalidade.apoio,
          valor_contabilidade: client.valorMensalidade.contabilidade,
          valor_personalite: client.valorMensalidade.personalite,
          vencimento: client.vencimento,
          inicio_competencia: client.inicioCompetencia,
          ultima_competencia: client.ultimaCompetencia,
          services: client.services,
          situacao: client.situacao,
          status: client.status,
          grupo: client.grupo,
          ultimo_reajuste: (client as any).ultimoReajuste || null,
          periodo_reajuste_meses: (client as any).periodoReajusteMeses ?? 12,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: "Cliente criado",
        description: "Cliente adicionado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateClient = useMutation({
    mutationFn: async (client: Client) => {
      const { data, error } = await supabase
        .from("clients")
        .update({
          codigo: client.codigo,
          nome_fantasia: client.nomeFantasia,
          razao_social: client.razaoSocial,
          cnpj: client.cnpj,
          document_type: client.documentType,
          valor_smart: client.valorMensalidade.smart,
          valor_apoio: client.valorMensalidade.apoio,
          valor_contabilidade: client.valorMensalidade.contabilidade,
          valor_personalite: client.valorMensalidade.personalite,
          vencimento: client.vencimento,
          inicio_competencia: client.inicioCompetencia,
          ultima_competencia: client.ultimaCompetencia,
          services: client.services,
          situacao: client.situacao,
          status: client.status,
          grupo: client.grupo,
          ultimo_reajuste: client.ultimoReajuste || null,
          periodo_reajuste_meses: client.periodoReajusteMeses ?? 12,
        })
        .eq("id", client.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: "Cliente atualizado",
        description: "Cliente atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: "Cliente excluído",
        description: "Cliente removido com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    clients,
    isLoading,
    createClient,
    updateClient,
    deleteClient,
  };
};

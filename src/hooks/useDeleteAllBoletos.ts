import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export const useDeleteAllBoletos = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteAll = async (monthFilter: string | null) => {
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-all-boletos", {
        body: { month_filter: monthFilter },
      });

      if (error) {
        toast({
          title: "Erro ao excluir",
          description: error.message || "Erro ao excluir boletos.",
          variant: "destructive",
        });
        return false;
      }

      if (data?.error) {
        toast({
          title: "Erro ao excluir",
          description: data.error,
          variant: "destructive",
        });
        return false;
      }

      const { hard_deleted = 0, soft_deleted = 0, errors = [] } = data || {};
      const total = hard_deleted + soft_deleted;

      queryClient.invalidateQueries({ queryKey: ["boletos"] });

      if (errors.length > 0) {
        toast({
          title: "Exclusão parcial",
          description: `${total} boletos excluídos com ${errors.length} erro(s). Verifique os logs.`,
          variant: "destructive",
        });
      } else {
        const parts = [];
        if (hard_deleted > 0) parts.push(`${hard_deleted} excluído(s)`);
        if (soft_deleted > 0) parts.push(`${soft_deleted} arquivado(s) (pagos)`);
        toast({
          title: "Exclusão concluída",
          description: parts.join(", ") + ".",
        });
      }

      return true;
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Erro inesperado ao excluir boletos.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteAll, isDeleting };
};

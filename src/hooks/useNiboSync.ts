import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export const useNiboSync = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const syncStatus = useCallback(async (silent = false) => {
    if (syncing) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-nibo-status");

      if (error) {
        if (!silent) toast({ title: "Erro", description: error.message || "Erro ao sincronizar.", variant: "destructive" });
        return;
      }

      if (data?.error) {
        if (!silent) toast({ title: "Erro", description: data.error, variant: "destructive" });
        return;
      }

      const { updated = 0, unchanged = 0, dueDateUpdated = 0, message } = data || {};

      const anyChange = updated > 0 || dueDateUpdated > 0;

      if (anyChange) {
        queryClient.invalidateQueries({ queryKey: ["boletos"] });
      }

      if (!silent) {
        if (message) {
          toast({ title: "Sincronização", description: message });
        } else {
          const parts = [];
          if (updated > 0) parts.push(`${updated} marcado(s) como pago`);
          if (dueDateUpdated > 0) parts.push(`${dueDateUpdated} vencimento(s) atualizado(s)`);
          if (parts.length === 0) parts.push(`${unchanged} sem alteração`);
          toast({
            title: "Sincronização concluída",
            description: parts.join(", ") + ".",
          });
        }
      }
    } catch (err: any) {
      if (!silent) toast({ title: "Erro", description: err.message || "Erro ao sincronizar.", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }, [syncing, toast, queryClient]);

  return { syncStatus, syncing };
};


import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { BillingProvider } from "@/hooks/useActiveBillingProvider";

const SYNC_FUNCTION_MAP: Record<BillingProvider, string> = {
  nibo: "sync-nibo-status",
  safe2pay: "sync-safe2pay-status",
  asaas: "sync-asaas-status",
  contaazul: "sync-contaazul-status",
};

export const useBillingSync = (provider: BillingProvider) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const syncStatus = useCallback(async (silent = false) => {
    if (syncing) return;
    setSyncing(true);
    try {
      const functionName = SYNC_FUNCTION_MAP[provider];
      const { data, error } = await supabase.functions.invoke(functionName);

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
          toast({ title: "Sincronização concluída", description: parts.join(", ") + "." });
        }
      }
    } catch (err: any) {
      if (!silent) toast({ title: "Erro", description: err.message || "Erro ao sincronizar.", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }, [syncing, toast, queryClient, provider]);

  return { syncStatus, syncing };
};

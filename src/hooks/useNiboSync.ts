import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export const useNiboSync = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const syncStatus = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-nibo-status");

      if (error) {
        toast({ title: "Erro", description: error.message || "Erro ao sincronizar.", variant: "destructive" });
        return;
      }

      if (data?.error) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
        return;
      }

      const { updated = 0, unchanged = 0, message } = data || {};

      if (message) {
        toast({ title: "Sincronização", description: message });
      } else {
        toast({
          title: "Sincronização concluída",
          description: `${updated} boleto(s) marcado(s) como pago, ${unchanged} sem alteração.`,
        });
      }

      if (updated > 0) {
        queryClient.invalidateQueries({ queryKey: ["boletos"] });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao sincronizar.", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  return { syncStatus, syncing };
};

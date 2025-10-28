import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientHistoryEntry {
  id: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  changedAt: string;
}

export const useClientHistory = (clientId: string) => {
  return useQuery({
    queryKey: ["client-history", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_history")
        .select("*")
        .eq("client_id", clientId)
        .order("changed_at", { ascending: false });

      if (error) throw error;

      return data.map((entry: any) => ({
        id: entry.id,
        fieldName: entry.field_name,
        oldValue: entry.old_value,
        newValue: entry.new_value,
        changedAt: entry.changed_at,
      })) as ClientHistoryEntry[];
    },
    enabled: !!clientId,
  });
};

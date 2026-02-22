import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface EconomicIndices {
  ipca: {
    monthly: Array<{ date: string; value: number }>;
    accumulated12m: number;
  };
  igpm: {
    monthly: Array<{ date: string; value: number }>;
    accumulated12m: number;
  };
  fetchedAt: string;
}

export const useEconomicIndices = () => {
  const { toast } = useToast();
  const [indices, setIndices] = useState<EconomicIndices | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchIndices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-economic-indices");

      if (error) {
        toast({ title: "Erro", description: error.message || "Erro ao buscar índices.", variant: "destructive" });
        return;
      }

      if (data?.error) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
        return;
      }

      setIndices(data as EconomicIndices);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao buscar índices.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return { indices, loading, fetchIndices };
};

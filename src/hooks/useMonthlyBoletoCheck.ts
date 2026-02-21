import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BoletoCheckResult {
  clientId: string;
  nomeFantasia: string;
  cnpj: string;
  expectedBoletos: { service: string; valor: number }[];
  foundBoletos: { valor: number; niboScheduleId: string | null; dueDate: string }[];
  status: "ok" | "parcial" | "pendente";
}

export interface BoletoCheckSummary {
  competencia: string;
  total: number;
  ok: number;
  parcial: number;
  pendente: number;
}

export const useMonthlyBoletoCheck = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<BoletoCheckSummary | null>(null);
  const [results, setResults] = useState<BoletoCheckResult[]>([]);

  const check = useCallback(async (competencia?: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-monthly-boletos", {
        body: competencia ? { competencia } : {},
      });

      if (error) {
        toast({ title: "Erro", description: error.message || "Erro ao verificar boletos.", variant: "destructive" });
        return;
      }

      if (data?.error) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
        return;
      }

      setSummary(data.summary);
      setResults(data.results || []);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao verificar.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [loading, toast]);

  return { check, loading, summary, results };
};

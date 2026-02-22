import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type BillingProvider = "nibo" | "safe2pay" | "asaas" | "contaazul";

export interface ProviderConfig {
  id: BillingProvider;
  label: string;
  implemented: boolean;
}

export const BILLING_PROVIDERS: ProviderConfig[] = [
  { id: "nibo", label: "Nibo", implemented: true },
  { id: "safe2pay", label: "Safe2Pay", implemented: true },
  { id: "asaas", label: "Asaas", implemented: true },
  { id: "contaazul", label: "Conta Azul", implemented: true },
];

export const useActiveBillingProvider = () => {
  const { organizationId } = useAuth();
  const { toast } = useToast();
  const [activeProvider, setActiveProvider] = useState<BillingProvider>("nibo");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;
    const load = async () => {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "active_billing_provider")
        .maybeSingle();
      if (data?.value) {
        setActiveProvider(data.value as BillingProvider);
      }
      setLoading(false);
    };
    load();
  }, [organizationId]);

  const setProvider = useCallback(async (provider: BillingProvider) => {
    setActiveProvider(provider);
    try {
      const { data: existing } = await supabase
        .from("settings")
        .select("id")
        .eq("key", "active_billing_provider")
        .maybeSingle();

      if (existing) {
        await supabase.from("settings").update({ value: provider }).eq("key", "active_billing_provider");
      } else {
        await supabase.from("settings").insert({
          key: "active_billing_provider",
          value: provider,
          organization_id: organizationId,
        });
      }

      const config = BILLING_PROVIDERS.find(p => p.id === provider);
      toast({ title: "Provedor atualizado", description: `${config?.label} definido como provedor ativo.` });
    } catch {
      toast({ title: "Erro", description: "Erro ao salvar provedor.", variant: "destructive" });
    }
  }, [organizationId, toast]);

  const activeConfig = BILLING_PROVIDERS.find(p => p.id === activeProvider)!;
  const isImplemented = activeConfig.implemented;

  return { activeProvider, activeConfig, isImplemented, setProvider, loading, providers: BILLING_PROVIDERS };
};

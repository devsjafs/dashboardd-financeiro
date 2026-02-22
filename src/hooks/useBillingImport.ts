import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { BillingProvider } from "@/hooks/useActiveBillingProvider";

export interface ImportLogEntry {
  stakeholderName: string;
  stakeholderDoc: string;
  value: number;
  dueDate: string;
  status: "imported" | "skipped";
  reason?: string;
}

interface ImportProgress {
  current: number;
  total: number;
  imported: number;
  skipped: number;
}

const FETCH_FUNCTION_MAP: Record<BillingProvider, string> = {
  nibo: "fetch-nibo-boletos",
  safe2pay: "fetch-safe2pay-boletos",
  asaas: "fetch-asaas-boletos",
  contaazul: "fetch-contaazul-boletos",
};

export const useBillingImport = (provider: BillingProvider) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [importLog, setImportLog] = useState<ImportLogEntry[]>([]);

  const importBoletos = async (connectionId?: string) => {
    setImporting(true);
    setProgress({ current: 0, total: 0, imported: 0, skipped: 0 });
    setImportLog([]);
    try {
      const functionName = FETCH_FUNCTION_MAP[provider];
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { connection_id: connectionId || null },
      });

      if (error) {
        toast({ title: "Erro", description: error.message || "Erro ao buscar boletos.", variant: "destructive" });
        setImporting(false);
        setProgress(null);
        return;
      }

      if (data?.error) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
        setImporting(false);
        setProgress(null);
        return;
      }

      const items = data?.items || [];
      if (!Array.isArray(items) || items.length === 0) {
        toast({ title: "Nenhum boleto encontrado", description: "Não há recebimentos pendentes." });
        setImporting(false);
        setProgress(null);
        return;
      }

      const { data: clients } = await supabase.from("clients").select("id, nome_fantasia, cnpj, razao_social");

      let imported = 0;
      let skipped = 0;
      const total = items.length;
      const logs: ImportLogEntry[] = [];

      setProgress({ current: 0, total, imported: 0, skipped: 0 });

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const stakeholderName = item.stakeholder?.name || item.stakeholderName || "Desconhecido";
        const stakeholderDoc = (
          item.stakeholder?.document ||
          item.stakeholder?.cpfCnpj ||
          item.stakeholder?.taxNumber ||
          item.stakeholderDocument ||
          ""
        ).replace(/\D/g, "");

        const dueDate = item.dueDate?.split("T")[0] || "";
        const value = item.value || 0;

        const client = clients?.find(
          (c) => c.cnpj?.replace(/\D/g, "") === stakeholderDoc && stakeholderDoc !== ""
        );

        let matchedClient = client;

        if (!matchedClient && stakeholderDoc !== "") {
          const codigo = `${provider.toUpperCase()}-${stakeholderDoc}`;

          const { data: existingClient } = await supabase
            .from("clients")
            .select("id, nome_fantasia, cnpj, razao_social")
            .eq("codigo", codigo)
            .limit(1);

          if (existingClient && existingClient.length > 0) {
            matchedClient = existingClient[0];
            clients?.push(matchedClient);
          } else {
            const { data: newClient, error: createError } = await supabase
              .from("clients")
              .insert({
                cnpj: stakeholderDoc,
                nome_fantasia: stakeholderName,
                razao_social: stakeholderName,
                codigo,
                inicio_competencia: dueDate ? dueDate.substring(0, 7) : new Date().toISOString().substring(0, 7),
                situacao: "mes-corrente",
                status: "ativo",
                vencimento: 10,
                services: [],
                organization_id: organizationId,
              })
              .select("id")
              .single();

            if (newClient && !createError) {
              matchedClient = { id: newClient.id, nome_fantasia: stakeholderName, cnpj: stakeholderDoc, razao_social: stakeholderName };
              clients?.push(matchedClient);
              logs.push({ stakeholderName, stakeholderDoc, value, dueDate, status: "imported", reason: "Cliente criado automaticamente" });
            }
          }
        }

        if (!matchedClient) {
          const reason = stakeholderDoc === ""
            ? "Sem CNPJ/CPF"
            : `Não foi possível criar cliente (CNPJ: ${stakeholderDoc})`;
          skipped++;
          logs.push({ stakeholderName, stakeholderDoc, value, dueDate, status: "skipped", reason });
          setProgress({ current: i + 1, total, imported, skipped });
          setImportLog([...logs]);
          continue;
        }

        const competencia = dueDate ? dueDate.substring(0, 7) : "";

        const { data: existing } = await supabase
          .from("boletos")
          .select("id, nibo_schedule_id")
          .eq("client_id", matchedClient.id)
          .eq("vencimento", dueDate)
          .eq("valor", value)
          .limit(1);

        const scheduleId = item.scheduleId || item.id || item.scheduleID || null;

        if (existing && existing.length > 0) {
          const existingBoleto = existing[0];
          if (!existingBoleto.nibo_schedule_id && scheduleId) {
            await supabase
              .from("boletos")
              .update({ nibo_schedule_id: String(scheduleId) })
              .eq("id", existingBoleto.id);
            skipped++;
            logs.push({ stakeholderName, stakeholderDoc, value, dueDate, status: "skipped", reason: "ID atualizado no boleto existente" });
          } else {
            skipped++;
            logs.push({ stakeholderName, stakeholderDoc, value, dueDate, status: "skipped", reason: "Boleto duplicado (já existe)" });
          }
          setProgress({ current: i + 1, total, imported, skipped });
          setImportLog([...logs]);
          continue;
        }

        await supabase.from("boletos").insert({
          client_id: matchedClient.id,
          valor: value,
          vencimento: dueDate,
          competencia,
          categoria: item.categoryName || item.category?.name || provider.charAt(0).toUpperCase() + provider.slice(1),
          status: "não pago",
          organization_id: organizationId,
          nibo_schedule_id: scheduleId ? String(scheduleId) : null,
        } as any);
        imported++;
        logs.push({ stakeholderName, stakeholderDoc, value, dueDate, status: "imported" });
        setProgress({ current: i + 1, total, imported, skipped });
        setImportLog([...logs]);
      }

      queryClient.invalidateQueries({ queryKey: ["boletos"] });
      toast({
        title: "Importação concluída",
        description: `${imported} boletos importados, ${skipped} ignorados.`,
      });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao importar boletos.", variant: "destructive" });
    }
    setImporting(false);
  };

  const clearLog = () => {
    setImportLog([]);
    setProgress(null);
  };

  return { importBoletos, importing, progress, importLog, clearLog };
};

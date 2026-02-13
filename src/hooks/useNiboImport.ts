import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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

export const useNiboImport = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [importLog, setImportLog] = useState<ImportLogEntry[]>([]);

  const importFromNibo = async (connectionId?: string) => {
    setImporting(true);
    setProgress({ current: 0, total: 0, imported: 0, skipped: 0 });
    setImportLog([]);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-nibo-boletos", {
        body: { connection_id: connectionId || null },
      });

      if (error) {
        toast({ title: "Erro", description: error.message || "Erro ao buscar boletos do Nibo.", variant: "destructive" });
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
        toast({ title: "Nenhum boleto encontrado", description: "Não há recebimentos vencidos no Nibo." });
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
          // Auto-create client from Nibo stakeholder data
          const { data: newClient, error: createError } = await supabase
            .from("clients")
            .insert({
              cnpj: stakeholderDoc,
              nome_fantasia: stakeholderName,
              razao_social: stakeholderName,
              codigo: stakeholderDoc.substring(0, 10),
              inicio_competencia: dueDate ? dueDate.substring(0, 7) : new Date().toISOString().substring(0, 7),
              situacao: "Ativa",
              status: "Ativo",
              vencimento: 10,
              services: [],
            })
            .select("id")
            .single();

          if (newClient && !createError) {
            matchedClient = { id: newClient.id, nome_fantasia: stakeholderName, cnpj: stakeholderDoc, razao_social: stakeholderName };
            // Add to local clients array so subsequent items match
            clients?.push(matchedClient);
          }
        }

        if (!matchedClient) {
          const reason = stakeholderDoc === "" 
            ? "Sem CNPJ/CPF no Nibo" 
            : `Erro ao criar cliente para CNPJ ${stakeholderDoc}`;
          skipped++;
          logs.push({ stakeholderName, stakeholderDoc, value, dueDate, status: "skipped", reason });
          setProgress({ current: i + 1, total, imported, skipped });
          setImportLog([...logs]);
          continue;
        }

        const competencia = dueDate ? dueDate.substring(0, 7) : "";

        const { data: existing } = await supabase
          .from("boletos")
          .select("id")
          .eq("client_id", matchedClient.id)
          .eq("vencimento", dueDate)
          .eq("valor", value)
          .limit(1);

        if (existing && existing.length > 0) {
          skipped++;
          logs.push({ stakeholderName, stakeholderDoc, value, dueDate, status: "skipped", reason: "Boleto duplicado (já existe)" });
          setProgress({ current: i + 1, total, imported, skipped });
          setImportLog([...logs]);
          continue;
        }

        await supabase.from("boletos").insert({
          client_id: matchedClient.id,
          valor: value,
          vencimento: dueDate,
          competencia,
          categoria: item.categoryName || item.category?.name || "Nibo",
          status: "não pago",
        });
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
      toast({ title: "Erro", description: err.message || "Erro ao importar boletos do Nibo.", variant: "destructive" });
    }
    setImporting(false);
  };

  const clearLog = () => {
    setImportLog([]);
    setProgress(null);
  };

  return { importFromNibo, importing, progress, importLog, clearLog };
};

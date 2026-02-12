import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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

  const importFromNibo = async (connectionId?: string) => {
    setImporting(true);
    setProgress({ current: 0, total: 0, imported: 0, skipped: 0 });
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

      setProgress({ current: 0, total, imported: 0, skipped: 0 });

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        // Match by CNPJ/CPF (document) instead of name
        const stakeholderDoc = (
          item.stakeholder?.document || 
          item.stakeholder?.cpfCnpj || 
          item.stakeholder?.taxNumber || 
          item.stakeholderDocument || 
          ""
        ).replace(/\D/g, ""); // Remove formatting

        const client = clients?.find(
          (c) => c.cnpj?.replace(/\D/g, "") === stakeholderDoc && stakeholderDoc !== ""
        );

        if (!client) {
          skipped++;
          setProgress({ current: i + 1, total, imported, skipped });
          continue;
        }

        const dueDate = item.dueDate?.split("T")[0] || "";
        const competencia = dueDate ? dueDate.substring(0, 7) : "";

        const { data: existing } = await supabase
          .from("boletos")
          .select("id")
          .eq("client_id", client.id)
          .eq("vencimento", dueDate)
          .eq("valor", item.value || 0)
          .limit(1);

        if (existing && existing.length > 0) {
          skipped++;
          setProgress({ current: i + 1, total, imported, skipped });
          continue;
        }

        await supabase.from("boletos").insert({
          client_id: client.id,
          valor: item.value || 0,
          vencimento: dueDate,
          competencia,
          categoria: item.categoryName || item.category?.name || "Nibo",
          status: "não pago",
        });
        imported++;
        setProgress({ current: i + 1, total, imported, skipped });
      }

      queryClient.invalidateQueries({ queryKey: ["boletos"] });
      toast({
        title: "Importação concluída",
        description: `${imported} boletos importados, ${skipped} ignorados (sem cliente vinculado ou duplicado).`,
      });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao importar boletos do Nibo.", variant: "destructive" });
    }
    setImporting(false);
    setProgress(null);
  };

  return { importFromNibo, importing, progress };
};

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export const useNiboImport = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);

  const importFromNibo = async () => {
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-nibo-boletos");

      if (error) {
        toast({
          title: "Erro",
          description: error.message || "Erro ao buscar boletos do Nibo.",
          variant: "destructive",
        });
        setImporting(false);
        return;
      }

      if (data?.error) {
        toast({
          title: "Erro",
          description: data.error,
          variant: "destructive",
        });
        setImporting(false);
        return;
      }

      // Parse Nibo response - items array
      const items = data?.items || data || [];
      if (!Array.isArray(items) || items.length === 0) {
        toast({
          title: "Nenhum boleto encontrado",
          description: "Não há recebimentos vencidos no Nibo.",
        });
        setImporting(false);
        return;
      }

      // Get all clients to map by name/CNPJ
      const { data: clients } = await supabase.from("clients").select("id, nome_fantasia, cnpj, razao_social");

      let imported = 0;
      let skipped = 0;

      for (const item of items) {
        // Try to match client by stakeholder name
        const stakeholderName = item.stakeholder?.name || item.stakeholderName || "";
        const client = clients?.find(
          (c) =>
            c.nome_fantasia?.toLowerCase() === stakeholderName.toLowerCase() ||
            c.razao_social?.toLowerCase() === stakeholderName.toLowerCase()
        );

        if (!client) {
          skipped++;
          continue;
        }

        const dueDate = item.dueDate?.split("T")[0] || "";
        const competencia = dueDate ? dueDate.substring(0, 7) : "";

        // Check if boleto already exists (same client, due date, value)
        const { data: existing } = await supabase
          .from("boletos")
          .select("id")
          .eq("client_id", client.id)
          .eq("vencimento", dueDate)
          .eq("valor", item.value || 0)
          .limit(1);

        if (existing && existing.length > 0) {
          skipped++;
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
      }

      queryClient.invalidateQueries({ queryKey: ["boletos"] });

      toast({
        title: "Importação concluída",
        description: `${imported} boletos importados, ${skipped} ignorados (sem cliente vinculado ou duplicado).`,
      });
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Erro ao importar boletos do Nibo.",
        variant: "destructive",
      });
    }
    setImporting(false);
  };

  return { importFromNibo, importing };
};

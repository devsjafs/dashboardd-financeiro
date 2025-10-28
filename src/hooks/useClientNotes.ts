import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface ClientNote {
  id: string;
  clientId: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export const useClientNotes = (clientId: string) => {
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["client-notes", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_notes")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map((note: any) => ({
        id: note.id,
        clientId: note.client_id,
        note: note.note,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      })) as ClientNote[];
    },
    enabled: !!clientId,
  });

  const addNote = useMutation({
    mutationFn: async (note: string) => {
      const { data, error } = await supabase
        .from("client_notes")
        .insert({
          client_id: clientId,
          note,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-notes", clientId] });
      toast({
        title: "Anotação adicionada",
        description: "Anotação criada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar anotação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { data, error } = await supabase
        .from("client_notes")
        .update({ note })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-notes", clientId] });
      toast({
        title: "Anotação atualizada",
        description: "Anotação editada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar anotação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-notes", clientId] });
      toast({
        title: "Anotação excluída",
        description: "Anotação removida com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir anotação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    notes,
    isLoading,
    addNote,
    updateNote,
    deleteNote,
  };
};

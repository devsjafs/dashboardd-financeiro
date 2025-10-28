import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useClientNotes } from "@/hooks/useClientNotes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ClientNotesDialogProps {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ClientNotesDialog = ({
  clientId,
  clientName,
  open,
  onOpenChange,
}: ClientNotesDialogProps) => {
  const { notes, isLoading, addNote, updateNote, deleteNote } = useClientNotes(clientId);
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await addNote.mutateAsync(newNote);
    setNewNote("");
  };

  const handleUpdateNote = async () => {
    if (!editingId || !editingText.trim()) return;
    await updateNote.mutateAsync({ id: editingId, note: editingText });
    setEditingId(null);
    setEditingText("");
  };

  const handleDeleteNote = async () => {
    if (!deleteId) return;
    await deleteNote.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Anotações - {clientName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Escreva uma nova anotação..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
              />
              <Button
                onClick={handleAddNote}
                disabled={!newNote.trim() || addNote.isPending}
                className="w-full"
              >
                {addNote.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Adicionar Anotação
              </Button>
            </div>

            <div className="border-t pt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma anotação ainda.
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors"
                    >
                      {editingId === note.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleUpdateNote}
                              disabled={updateNote.isPending}
                            >
                              {updateNote.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Salvar"
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingId(null);
                                setEditingText("");
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-4">
                            <p className="text-sm flex-1 whitespace-pre-wrap">{note.note}</p>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingId(note.id);
                                  setEditingText(note.note);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setDeleteId(note.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            {format(new Date(note.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anotação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta anotação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNote}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

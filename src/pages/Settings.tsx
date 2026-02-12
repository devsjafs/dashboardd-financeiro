import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Eye, EyeOff, Plus, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface NiboConnection {
  id: string;
  nome: string;
  api_token: string;
  api_key: string;
}

const Settings = () => {
  const { toast } = useToast();
  const [connections, setConnections] = useState<NiboConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("nibo_connections")
      .select("*")
      .order("created_at");
    setConnections((data as NiboConnection[]) || []);
    setLoading(false);
  };

  const openAddDialog = () => {
    setEditingId(null);
    setNome("");
    setApiToken("");
    setApiKey("");
    setDialogOpen(true);
  };

  const openEditDialog = (conn: NiboConnection) => {
    setEditingId(conn.id);
    setNome(conn.nome);
    setApiToken(conn.api_token);
    setApiKey(conn.api_key);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim() || !apiToken.trim()) {
      toast({ title: "Erro", description: "Nome e API Token são obrigatórios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await supabase.from("nibo_connections").update({ nome, api_token: apiToken, api_key: apiKey }).eq("id", editingId);
      } else {
        await supabase.from("nibo_connections").insert({ nome, api_token: apiToken, api_key: apiKey });
      }
      toast({ title: "Sucesso", description: editingId ? "Conexão atualizada." : "Conexão adicionada." });
      setDialogOpen(false);
      loadConnections();
    } catch {
      toast({ title: "Erro", description: "Erro ao salvar conexão.", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta conexão?")) return;
    await supabase.from("nibo_connections").delete().eq("id", id);
    toast({ title: "Sucesso", description: "Conexão removida." });
    loadConnections();
  };

  const maskValue = (value: string) => {
    if (!value) return "";
    if (value.length <= 8) return "••••••••";
    return value.slice(0, 4) + "••••" + value.slice(-4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as integrações e configurações do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Integrações Nibo</CardTitle>
              <CardDescription>
                Gerencie suas conexões com a API do Nibo. O token pode ser encontrado em: Sua Empresa → Mais opções → Configurações → API.
              </CardDescription>
            </div>
            <Button onClick={openAddDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Conexão
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma conexão cadastrada. Clique em "Adicionar Conexão" para começar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>API Token</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map((conn) => (
                  <TableRow key={conn.id}>
                    <TableCell className="font-medium">{conn.nome}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {showTokens[conn.id] ? conn.api_token : maskValue(conn.api_token)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-1 h-6 w-6"
                        onClick={() => setShowTokens(prev => ({ ...prev, [conn.id]: !prev[conn.id] }))}
                      >
                        {showTokens[conn.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {conn.api_key ? (showTokens[conn.id] ? conn.api_key : maskValue(conn.api_key)) : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(conn)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(conn.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Conexão" : "Nova Conexão Nibo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Conexão</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Empresa Principal" />
            </div>
            <div className="space-y-2">
              <Label>API Token</Label>
              <Input value={apiToken} onChange={(e) => setApiToken(e.target.value)} placeholder="Cole o API Token do Nibo" />
            </div>
            <div className="space-y-2">
              <Label>API Key (opcional)</Label>
              <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Cole a API Key do Nibo" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Eye, EyeOff, Plus, Trash2, Pencil, CheckCircle2, XCircle, Globe, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
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

interface ThomsonReutersConfig {
  domain: string;
  username: string;
  token: string;
  connected: boolean;
}

const Settings = () => {
  const { toast } = useToast();

  // Nibo state
  const [connections, setConnections] = useState<NiboConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  // Thomson Reuters state
  const [trConfig, setTrConfig] = useState<ThomsonReutersConfig>({
    domain: "",
    username: "",
    token: "",
    connected: false,
  });
  const [trLoading, setTrLoading] = useState(true);
  const [trSaving, setTrSaving] = useState(false);
  const [trShowToken, setTrShowToken] = useState(false);
  const [trEditing, setTrEditing] = useState(false);

  useEffect(() => {
    loadConnections();
    loadThomsonReutersConfig();
  }, []);

  // ---- Nibo ----
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

  // ---- Thomson Reuters ----
  const loadThomsonReutersConfig = async () => {
    setTrLoading(true);
    const keys = ["tr_domain", "tr_username", "tr_token", "tr_connected"];
    const { data } = await supabase
      .from("settings")
      .select("*")
      .in("key", keys);

    if (data) {
      const map: Record<string, string> = {};
      data.forEach((row) => {
        map[row.key] = row.value;
      });
      setTrConfig({
        domain: map["tr_domain"] || "",
        username: map["tr_username"] || "",
        token: map["tr_token"] || "",
        connected: map["tr_connected"] === "true",
      });
      // If there's already data, don't start in editing mode
      if (map["tr_domain"]) {
        setTrEditing(false);
      } else {
        setTrEditing(true);
      }
    } else {
      setTrEditing(true);
    }
    setTrLoading(false);
  };

  const saveSetting = async (key: string, value: string) => {
    const { data: existing } = await supabase
      .from("settings")
      .select("id")
      .eq("key", key)
      .maybeSingle();

    if (existing) {
      await supabase.from("settings").update({ value }).eq("key", key);
    } else {
      await supabase.from("settings").insert({ key, value });
    }
  };

  const handleTrSave = async () => {
    if (!trConfig.domain.trim()) {
      toast({ title: "Erro", description: "O domínio é obrigatório.", variant: "destructive" });
      return;
    }
    if (!trConfig.username.trim()) {
      toast({ title: "Erro", description: "O usuário é obrigatório.", variant: "destructive" });
      return;
    }
    if (!trConfig.token.trim()) {
      toast({ title: "Erro", description: "O token/senha é obrigatório.", variant: "destructive" });
      return;
    }

    setTrSaving(true);
    try {
      await saveSetting("tr_domain", trConfig.domain.trim());
      await saveSetting("tr_username", trConfig.username.trim());
      await saveSetting("tr_token", trConfig.token.trim());
      await saveSetting("tr_connected", "true");

      setTrConfig((prev) => ({ ...prev, connected: true }));
      setTrEditing(false);
      toast({ title: "Sucesso", description: "Thomson Reuters conectado com sucesso." });
    } catch {
      toast({ title: "Erro", description: "Erro ao salvar configurações.", variant: "destructive" });
    }
    setTrSaving(false);
  };

  const handleTrDisconnect = async () => {
    if (!confirm("Tem certeza que deseja desconectar o Thomson Reuters?")) return;
    setTrSaving(true);
    try {
      const keys = ["tr_domain", "tr_username", "tr_token", "tr_connected"];
      await supabase.from("settings").delete().in("key", keys);
      setTrConfig({ domain: "", username: "", token: "", connected: false });
      setTrEditing(true);
      toast({ title: "Sucesso", description: "Thomson Reuters desconectado." });
    } catch {
      toast({ title: "Erro", description: "Erro ao desconectar.", variant: "destructive" });
    }
    setTrSaving(false);
  };

  if (loading || trLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as integrações e configurações do sistema</p>
      </div>

      {/* Thomson Reuters */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                <Globe className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Thomson Reuters
                  {trConfig.connected ? (
                    <Badge variant="default" className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Desconectado
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Conecte seu domínio Thomson Reuters para sincronização de dados.
                </CardDescription>
              </div>
            </div>
            {trConfig.connected && !trEditing && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setTrEditing(true)}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleTrDisconnect} disabled={trSaving}>
                  Desconectar
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {trConfig.connected && !trEditing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Domínio</Label>
                  <p className="text-sm font-medium">{trConfig.domain}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Usuário</Label>
                  <p className="text-sm font-medium">{trConfig.username}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Token</Label>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-mono">
                      {trShowToken ? trConfig.token : maskValue(trConfig.token)}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setTrShowToken(!trShowToken)}
                    >
                      {trShowToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Como conectar:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Acesse o painel administrativo do Thomson Reuters</li>
                  <li>Vá em <strong>Configurações → API / Integrações</strong></li>
                  <li>Copie o domínio, usuário e token de acesso</li>
                  <li>Cole os dados nos campos abaixo e clique em "Conectar"</li>
                </ol>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="tr-domain">Domínio *</Label>
                  <Input
                    id="tr-domain"
                    value={trConfig.domain}
                    onChange={(e) => setTrConfig((prev) => ({ ...prev, domain: e.target.value }))}
                    placeholder="Ex: suaempresa.thomsonreuters.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tr-username">Usuário *</Label>
                  <Input
                    id="tr-username"
                    value={trConfig.username}
                    onChange={(e) => setTrConfig((prev) => ({ ...prev, username: e.target.value }))}
                    placeholder="Seu usuário de acesso"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tr-token">Token / Senha de API *</Label>
                  <div className="relative">
                    <Input
                      id="tr-token"
                      type={trShowToken ? "text" : "password"}
                      value={trConfig.token}
                      onChange={(e) => setTrConfig((prev) => ({ ...prev, token: e.target.value }))}
                      placeholder="Cole seu token de acesso"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-10 w-10"
                      onClick={() => setTrShowToken(!trShowToken)}
                    >
                      {trShowToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                {trConfig.connected && (
                  <Button variant="outline" onClick={() => setTrEditing(false)}>
                    Cancelar
                  </Button>
                )}
                <Button onClick={handleTrSave} disabled={trSaving} className="gap-2">
                  {trSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {trConfig.connected ? "Salvar Alterações" : "Conectar"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nibo */}
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

      {/* Nibo Dialog */}
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

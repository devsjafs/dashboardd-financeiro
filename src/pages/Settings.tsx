import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Save, Eye, EyeOff, Plus, Trash2, Pencil, CheckCircle2, XCircle,
  Globe, Loader2, Upload, User, Palette, Plug, Sun, Moon, Building2, Users, Shield,
  Mail, Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useOrganization } from "@/hooks/useOrganization";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
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
  const { user, profile, refreshProfile, organizationId, userRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { organization, members, invites, inviteMember, cancelInvite, updateMemberRole, removeMember } = useOrganization();

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Profile state
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    domain: "", username: "", token: "", connected: false,
  });
  const [trLoading, setTrLoading] = useState(true);
  const [trSaving, setTrSaving] = useState(false);
  const [trShowToken, setTrShowToken] = useState(false);
  const [trEditing, setTrEditing] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  useEffect(() => {
    loadConnections();
    loadThomsonReutersConfig();
  }, []);

  // ---- Profile ----
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Erro", description: "A imagem deve ter no máximo 2MB.", variant: "destructive" });
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Erro", description: "Formato inválido. Use JPG, PNG ou WebP.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      const url = `${publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
      setAvatarUrl(url);
      await refreshProfile();
      toast({ title: "Sucesso", description: "Foto atualizada." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao fazer upload.", variant: "destructive" });
    }
    setUploading(false);
  };

  const handleProfileSave = async () => {
    if (!user) return;
    if (!displayName.trim()) {
      toast({ title: "Erro", description: "O nome não pode ficar vazio.", variant: "destructive" });
      return;
    }
    setProfileSaving(true);
    try {
      await supabase.from("profiles").update({ display_name: displayName.trim() }).eq("user_id", user.id);
      await refreshProfile();
      toast({ title: "Sucesso", description: "Perfil atualizado." });
    } catch {
      toast({ title: "Erro", description: "Erro ao salvar perfil.", variant: "destructive" });
    }
    setProfileSaving(false);
  };

  // ---- Nibo ----
  const loadConnections = async () => {
    setLoading(true);
    const { data } = await supabase.from("nibo_connections").select("*").order("created_at");
    setConnections((data as NiboConnection[]) || []);
    setLoading(false);
  };

  const openAddDialog = () => {
    setEditingId(null); setNome(""); setApiToken(""); setApiKey(""); setDialogOpen(true);
  };

  const openEditDialog = (conn: NiboConnection) => {
    setEditingId(conn.id); setNome(conn.nome); setApiToken(conn.api_token); setApiKey(conn.api_key); setDialogOpen(true);
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
        await supabase.from("nibo_connections").insert({ nome, api_token: apiToken, api_key: apiKey, organization_id: organizationId });
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
    const { data } = await supabase.from("settings").select("*").in("key", keys);
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((row) => { map[row.key] = row.value; });
      const config = {
        domain: map["tr_domain"] || "",
        username: map["tr_username"] || "",
        token: map["tr_token"] || "",
        connected: map["tr_connected"] === "true",
      };
      setTrConfig(config);
      setTrEditing(!config.domain);
    } else {
      setTrEditing(true);
    }
    setTrLoading(false);
  };

  const saveSetting = async (key: string, value: string) => {
    const { data: existing } = await supabase.from("settings").select("id").eq("key", key).maybeSingle();
    if (existing) {
      await supabase.from("settings").update({ value }).eq("key", key);
    } else {
      await supabase.from("settings").insert({ key, value, organization_id: organizationId });
    }
  };

  const handleTrSave = async () => {
    if (!trConfig.domain.trim() || !trConfig.username.trim() || !trConfig.token.trim()) {
      toast({ title: "Erro", description: "Todos os campos são obrigatórios.", variant: "destructive" });
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
      toast({ title: "Sucesso", description: "Thomson Reuters conectado." });
    } catch {
      toast({ title: "Erro", description: "Erro ao salvar.", variant: "destructive" });
    }
    setTrSaving(false);
  };

  const handleTrDisconnect = async () => {
    if (!confirm("Tem certeza que deseja desconectar?")) return;
    setTrSaving(true);
    try {
      await supabase.from("settings").delete().in("key", ["tr_domain", "tr_username", "tr_token", "tr_connected"]);
      setTrConfig({ domain: "", username: "", token: "", connected: false });
      setTrEditing(true);
      toast({ title: "Sucesso", description: "Thomson Reuters desconectado." });
    } catch {
      toast({ title: "Erro", description: "Erro ao desconectar.", variant: "destructive" });
    }
    setTrSaving(false);
  };

  const initial = profile?.display_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "?";

  if (loading || trLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie seu perfil, aparência e integrações</p>
      </div>

      <Tabs defaultValue="perfil" className="space-y-6">
        <TabsList>
          <TabsTrigger value="perfil" className="gap-2">
            <User className="h-4 w-4" /> Perfil
          </TabsTrigger>
          <TabsTrigger value="aparencia" className="gap-2">
            <Palette className="h-4 w-4" /> Aparência
          </TabsTrigger>
          {(userRole === "owner" || userRole === "admin") && (
            <TabsTrigger value="organizacao" className="gap-2">
              <Building2 className="h-4 w-4" /> Organização
            </TabsTrigger>
          )}
          <TabsTrigger value="integracoes" className="gap-2">
            <Plug className="h-4 w-4" /> Integrações
          </TabsTrigger>
        </TabsList>

        {/* ===== PERFIL ===== */}
        <TabsContent value="perfil">
          <Card>
            <CardHeader>
              <CardTitle>Perfil</CardTitle>
              <CardDescription>Atualize seu nome e foto de perfil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="gap-2"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading ? "Enviando..." : "Alterar foto"}
                  </Button>
                  <p className="text-xs text-muted-foreground">JPG, PNG ou WebP. Máximo 2MB.</p>
                </div>
              </div>

              <div className="grid gap-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Nome de exibição</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Seu nome"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ""} disabled className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">O email não pode ser alterado.</p>
                </div>
                <Button onClick={handleProfileSave} disabled={profileSaving} className="w-fit gap-2">
                  {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== APARÊNCIA ===== */}
        <TabsContent value="aparencia">
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
              <CardDescription>Personalize o visual do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between max-w-md">
                <div className="flex items-center gap-3">
                  {theme === "dark" ? (
                    <Moon className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Sun className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">Tema escuro</p>
                    <p className="text-sm text-muted-foreground">
                      {theme === "dark" ? "Ativado" : "Desativado"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={toggleTheme}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ORGANIZAÇÃO ===== */}
        {(userRole === "owner" || userRole === "admin") && (
          <TabsContent value="organizacao" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {organization?.name || "Organização"}
                </CardTitle>
                <CardDescription>Gerencie os membros e permissões da sua organização</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" /> Membros ({members.length})
                    </h3>
                    <Button size="sm" className="gap-2" onClick={() => setInviteDialogOpen(true)}>
                      <Plus className="h-4 w-4" /> Convidar
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Membro</TableHead>
                        <TableHead>Papel</TableHead>
                        {userRole === "owner" && <TableHead className="w-[100px]">Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {member.profiles?.avatar_url && (
                                <AvatarImage src={member.profiles.avatar_url} />
                              )}
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {member.profiles?.display_name?.charAt(0).toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {member.profiles?.display_name || "Sem nome"}
                              {member.user_id === user?.id && (
                                <Badge variant="outline" className="ml-2 text-xs">Você</Badge>
                              )}
                            </span>
                          </TableCell>
                          <TableCell>
                            {userRole === "owner" && member.user_id !== user?.id ? (
                              <Select
                                value={member.role}
                                onValueChange={(value) =>
                                  updateMemberRole.mutate({ memberId: member.id, role: value as any })
                                }
                              >
                                <SelectTrigger className="w-[130px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="member">Membro</SelectItem>
                                  <SelectItem value="viewer">Visualizador</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <Shield className="h-3 w-3" />
                                {member.role === "owner" ? "Dono" : 
                                 member.role === "admin" ? "Admin" : 
                                 member.role === "member" ? "Membro" : "Visualizador"}
                              </Badge>
                            )}
                          </TableCell>
                          {userRole === "owner" && (
                            <TableCell>
                              {member.user_id !== user?.id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => {
                                    if (confirm("Remover este membro da organização?")) {
                                      removeMember.mutate(member.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {/* Pending Invites */}
                  {invites.length > 0 && (
                    <div className="space-y-3 mt-6">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Convites pendentes ({invites.length})
                      </h3>
                      <div className="space-y-2">
                        {invites.map((invite) => (
                          <div key={invite.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                            <div className="flex items-center gap-3">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{invite.email}</p>
                                <p className="text-xs text-muted-foreground">
                                  {invite.role === "admin" ? "Admin" : invite.role === "member" ? "Membro" : "Visualizador"}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => cancelInvite.mutate(invite.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ===== INTEGRAÇÕES ===== */}
        <TabsContent value="integracoes" className="space-y-6">
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
                        <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Conectado
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" /> Desconectado
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>Conecte seu domínio Thomson Reuters.</CardDescription>
                  </div>
                </div>
                {trConfig.connected && !trEditing && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setTrEditing(true)}>
                      <Pencil className="h-4 w-4 mr-1" /> Editar
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
                      <p className="text-sm font-mono">{trShowToken ? trConfig.token : maskValue(trConfig.token)}</p>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setTrShowToken(!trShowToken)}>
                        {trShowToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
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
                      <li>Cole os dados abaixo e clique em "Conectar"</li>
                    </ol>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Domínio *</Label>
                      <Input value={trConfig.domain} onChange={(e) => setTrConfig(p => ({ ...p, domain: e.target.value }))} placeholder="Ex: suaempresa.thomsonreuters.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Usuário *</Label>
                      <Input value={trConfig.username} onChange={(e) => setTrConfig(p => ({ ...p, username: e.target.value }))} placeholder="Seu usuário de acesso" />
                    </div>
                    <div className="space-y-2">
                      <Label>Token / Senha de API *</Label>
                      <div className="relative">
                        <Input type={trShowToken ? "text" : "password"} value={trConfig.token} onChange={(e) => setTrConfig(p => ({ ...p, token: e.target.value }))} placeholder="Cole seu token" className="pr-10" />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-10 w-10" onClick={() => setTrShowToken(!trShowToken)}>
                          {trShowToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    {trConfig.connected && <Button variant="outline" onClick={() => setTrEditing(false)}>Cancelar</Button>}
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
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                    <Plug className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Nibo
                      {connections.length > 0 ? (
                        <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> {connections.length} conexão(ões)
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" /> Sem conexões
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Gerencie suas conexões com a API do Nibo.
                    </CardDescription>
                  </div>
                </div>
                <Button onClick={openAddDialog} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {connections.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma conexão cadastrada. Clique em "Adicionar" para começar.
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
                          <Button variant="ghost" size="icon" className="ml-1 h-6 w-6" onClick={() => setShowTokens(p => ({ ...p, [conn.id]: !p[conn.id] }))}>
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
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Membro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Membro</SelectItem>
                  <SelectItem value="viewer">Visualizador</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {inviteRole === "admin" && "Acesso total, exceto gerenciamento de membros."}
                {inviteRole === "member" && "Acesso a Dashboard, Pagamentos, Boletos e Emails."}
                {inviteRole === "viewer" && "Apenas visualização do Dashboard."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancelar</Button>
            <Button
              disabled={inviteMember.isPending || !inviteEmail.trim()}
              onClick={async () => {
                await inviteMember.mutateAsync({ email: inviteEmail, role: inviteRole });
                setInviteEmail("");
                setInviteDialogOpen(false);
              }}
              className="gap-2"
            >
              {inviteMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Enviar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


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

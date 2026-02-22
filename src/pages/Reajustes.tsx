import { useMemo, useState, useEffect } from "react";
import { useClients } from "@/hooks/useClients";
import { useEconomicIndices } from "@/hooks/useEconomicIndices";
import { useAuth } from "@/contexts/AuthContext";
import { Client } from "@/types/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle, CheckCircle, Clock, Search, TrendingUp, RefreshCw } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ReajusteStatus = "vencido" | "proximo" | "em-dia" | "sem-data";

function getReajusteInfo(client: Client): { status: ReajusteStatus; diasRestantes: number | null; proximoReajuste: string | null } {
  if (!client.ultimoReajuste) {
    return { status: "sem-data", diasRestantes: null, proximoReajuste: null };
  }
  const ultimo = new Date(client.ultimoReajuste + "T00:00:00");
  const proximo = new Date(ultimo);
  proximo.setMonth(proximo.getMonth() + (client.periodoReajusteMeses || 12));
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diffMs = proximo.getTime() - hoje.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const proximoStr = proximo.toISOString().substring(0, 10);

  if (diffDias < 0) return { status: "vencido", diasRestantes: diffDias, proximoReajuste: proximoStr };
  if (diffDias <= 30) return { status: "proximo", diasRestantes: diffDias, proximoReajuste: proximoStr };
  return { status: "em-dia", diasRestantes: diffDias, proximoReajuste: proximoStr };
}

function StatusBadge({ status, dias }: { status: ReajusteStatus; dias: number | null }) {
  switch (status) {
    case "vencido":
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Vencido ({Math.abs(dias!)} dias)</Badge>;
    case "proximo":
      return <Badge className="gap-1 bg-amber-500 hover:bg-amber-600"><Clock className="w-3 h-3" />{dias} dias restantes</Badge>;
    case "em-dia":
      return <Badge variant="secondary" className="gap-1"><CheckCircle className="w-3 h-3" />Em dia ({dias} dias)</Badge>;
    case "sem-data":
      return <Badge variant="outline" className="gap-1">Sem data de reajuste</Badge>;
  }
}

function getClientTotalValue(client: Client): number {
  return (client.valorMensalidade?.smart || 0) + (client.valorMensalidade?.apoio || 0) +
    (client.valorMensalidade?.contabilidade || 0) + (client.valorMensalidade?.personalite || 0);
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const Reajustes = () => {
  const { clients, isLoading, updateClient } = useClients();
  const { indices, loading: indicesLoading, fetchIndices } = useEconomicIndices();
  const { organizationId, user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"todos" | "vencido" | "proximo" | "sem-data">("todos");
  const [selectedIndex, setSelectedIndex] = useState<"ipca" | "igpm" | "manual">("ipca");
  const [manualPercent, setManualPercent] = useState<string>("5");
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmClient, setConfirmClient] = useState<Client | null>(null);
  const [applyingBatch, setApplyingBatch] = useState(false);

  useEffect(() => { fetchIndices(); }, []);

  const activeClients = clients.filter((c) => c.status === "ativo");

  const getPercent = (): number => {
    if (selectedIndex === "manual") return parseFloat(manualPercent) || 0;
    if (selectedIndex === "ipca") return indices?.ipca?.accumulated12m || 0;
    if (selectedIndex === "igpm") return indices?.igpm?.accumulated12m || 0;
    return 0;
  };

  const clientsWithInfo = useMemo(() => {
    return activeClients.map((c) => ({
      client: c,
      info: getReajusteInfo(c),
      totalValue: getClientTotalValue(c),
    })).sort((a, b) => {
      const order: Record<ReajusteStatus, number> = { vencido: 0, proximo: 1, "sem-data": 2, "em-dia": 3 };
      return order[a.info.status] - order[b.info.status];
    });
  }, [activeClients]);

  const filtered = clientsWithInfo.filter(({ client, info }) => {
    const matchSearch = search === "" ||
      client.nomeFantasia.toLowerCase().includes(search.toLowerCase()) ||
      client.cnpj.includes(search);
    const matchTab = activeTab === "todos" || info.status === activeTab;
    return matchSearch && matchTab;
  });

  const counts = useMemo(() => ({
    vencido: clientsWithInfo.filter((c) => c.info.status === "vencido").length,
    proximo: clientsWithInfo.filter((c) => c.info.status === "proximo").length,
    semData: clientsWithInfo.filter((c) => c.info.status === "sem-data").length,
  }), [clientsWithInfo]);

  const applyReajuste = async (client: Client) => {
    const percent = getPercent();
    const valorAnterior = {
      smart: client.valorMensalidade?.smart || 0,
      apoio: client.valorMensalidade?.apoio || 0,
      contabilidade: client.valorMensalidade?.contabilidade || 0,
      personalite: client.valorMensalidade?.personalite || 0,
    };
    const factor = 1 + percent / 100;
    const valorNovo = {
      smart: Math.round(valorAnterior.smart * factor * 100) / 100,
      apoio: Math.round(valorAnterior.apoio * factor * 100) / 100,
      contabilidade: Math.round(valorAnterior.contabilidade * factor * 100) / 100,
      personalite: Math.round(valorAnterior.personalite * factor * 100) / 100,
    };

    const hoje = new Date().toISOString().substring(0, 10);

    // Update client values
    await updateClient.mutateAsync({
      ...client,
      valorMensalidade: valorNovo,
      ultimoReajuste: hoje,
    });

    // Log to reajuste_history
    await supabase.from("reajuste_history" as any).insert({
      client_id: client.id,
      organization_id: organizationId,
      indice_usado: selectedIndex === "manual" ? "Manual" : selectedIndex.toUpperCase(),
      percentual_aplicado: percent,
      valor_anterior: valorAnterior,
      valor_novo: valorNovo,
      applied_by: user?.id,
    });

    return { valorAnterior, valorNovo };
  };

  const handleSingleReajuste = (client: Client) => {
    setConfirmClient(client);
    setConfirmDialogOpen(true);
  };

  const handleConfirmSingle = async () => {
    if (!confirmClient) return;
    try {
      await applyReajuste(confirmClient);
      toast({ title: "Reajuste aplicado", description: `Valores de ${confirmClient.nomeFantasia} atualizados.` });
    } catch {
      toast({ title: "Erro", description: "Erro ao aplicar reajuste.", variant: "destructive" });
    }
    setConfirmDialogOpen(false);
    setConfirmClient(null);
  };

  const handleBatchReajuste = async () => {
    if (selectedClients.size === 0) return;
    setApplyingBatch(true);
    let success = 0;
    for (const id of selectedClients) {
      const item = clientsWithInfo.find(c => c.client.id === id);
      if (!item) continue;
      try {
        await applyReajuste(item.client);
        success++;
      } catch { /* continue */ }
    }
    toast({ title: "Reajuste em lote", description: `${success} clientes atualizados.` });
    setSelectedClients(new Set());
    setApplyingBatch(false);
  };

  const toggleClient = (id: string) => {
    setSelectedClients(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const vencidos = filtered.filter(c => c.info.status === "vencido");
    if (selectedClients.size === vencidos.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(vencidos.map(c => c.client.id)));
    }
  };

  const percent = getPercent();
  const confirmTotal = confirmClient ? getClientTotalValue(confirmClient) : 0;
  const confirmNewTotal = Math.round(confirmTotal * (1 + percent / 100) * 100) / 100;

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Reajustes</h1>
        <p className="text-muted-foreground">Controle de reajustes dos clientes ativos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-5 h-5 text-destructive" /><span className="font-semibold text-destructive">Vencidos</span></div>
          <p className="text-3xl font-bold text-foreground">{counts.vencido}</p>
        </div>
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-1"><Clock className="w-5 h-5 text-amber-500" /><span className="font-semibold text-amber-500">Próximos (30 dias)</span></div>
          <p className="text-3xl font-bold text-foreground">{counts.proximo}</p>
        </div>
        <div className="p-4 rounded-xl border border-muted bg-muted/20">
          <div className="flex items-center gap-2 mb-1"><Clock className="w-5 h-5 text-muted-foreground" /><span className="font-semibold text-muted-foreground">Sem data</span></div>
          <p className="text-3xl font-bold text-foreground">{counts.semData}</p>
        </div>
      </div>

      {/* Index selector */}
      <div className="flex items-center gap-4 flex-wrap p-4 rounded-xl border bg-card">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <span className="font-semibold">Índice de reajuste:</span>
        </div>
        <Select value={selectedIndex} onValueChange={(v) => setSelectedIndex(v as any)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ipca">IPCA {indices ? `(${indices.ipca.accumulated12m.toFixed(2)}%)` : ""}</SelectItem>
            <SelectItem value="igpm">IGP-M {indices ? `(${indices.igpm.accumulated12m.toFixed(2)}%)` : ""}</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>

        {selectedIndex === "manual" && (
          <div className="flex items-center gap-2">
            <Input type="number" value={manualPercent} onChange={(e) => setManualPercent(e.target.value)} className="w-24" step="0.01" />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={fetchIndices} disabled={indicesLoading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${indicesLoading ? "animate-spin" : ""}`} />
          Atualizar índices
        </Button>

        {indices && (
          <span className="text-xs text-muted-foreground ml-auto">
            Atualizado: {new Date(indices.fetchedAt).toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>

      {/* Batch actions */}
      {selectedClients.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5 border-primary/20">
          <span className="text-sm font-medium">{selectedClients.size} cliente(s) selecionado(s)</span>
          <Button size="sm" onClick={handleBatchReajuste} disabled={applyingBatch} className="gap-2">
            {applyingBatch ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            Aplicar reajuste de {percent.toFixed(2)}% em lote
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSelectedClients(new Set())}>Limpar seleção</Button>
        </div>
      )}

      {/* Search + Tabs */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="vencido" className="gap-1">
            Vencidos {counts.vencido > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5">{counts.vencido}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="proximo">Próximos</TabsTrigger>
          <TabsTrigger value="sem-data">Sem data</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={selectedClients.size > 0 && selectedClients.size === filtered.filter(c => c.info.status === "vencido").length} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor Atual</TableHead>
                  <TableHead>Índice</TableHead>
                  <TableHead>Novo Valor</TableHead>
                  <TableHead>Último Reajuste</TableHead>
                  <TableHead>Próximo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum cliente encontrado</TableCell>
                  </TableRow>
                ) : (
                  filtered.map(({ client, info, totalValue }) => {
                    const newValue = Math.round(totalValue * (1 + percent / 100) * 100) / 100;
                    return (
                      <TableRow key={client.id}>
                        <TableCell>
                          <Checkbox checked={selectedClients.has(client.id)} onCheckedChange={() => toggleClient(client.id)} />
                        </TableCell>
                        <TableCell className="font-medium">{client.nomeFantasia}</TableCell>
                        <TableCell>{formatCurrency(totalValue)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{percent.toFixed(2)}%</Badge>
                        </TableCell>
                        <TableCell className="font-medium text-primary">{formatCurrency(newValue)}</TableCell>
                        <TableCell>
                          {client.ultimoReajuste ? new Date(client.ultimoReajuste + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                        </TableCell>
                        <TableCell>
                          {info.proximoReajuste ? new Date(info.proximoReajuste + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                        </TableCell>
                        <TableCell><StatusBadge status={info.status} dias={info.diasRestantes} /></TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => handleSingleReajuste(client)} className="gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Aplicar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Reajuste</DialogTitle>
            <DialogDescription>Revise os valores antes de aplicar o reajuste.</DialogDescription>
          </DialogHeader>
          {confirmClient && (
            <div className="space-y-4 py-2">
              <p className="font-semibold">{confirmClient.nomeFantasia}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Valor atual</p>
                  <p className="text-lg font-bold">{formatCurrency(confirmTotal)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Novo valor</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(confirmNewTotal)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">
                  {selectedIndex === "manual" ? "Manual" : selectedIndex.toUpperCase()}: {percent.toFixed(2)}%
                </Badge>
                <span className="text-muted-foreground">Diferença: {formatCurrency(confirmNewTotal - confirmTotal)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmSingle}>Confirmar Reajuste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reajustes;

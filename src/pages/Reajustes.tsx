import { useMemo, useState } from "react";
import { useClients } from "@/hooks/useClients";
import { Client } from "@/types/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle, CheckCircle, Clock, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  if (diffDias < 0) {
    return { status: "vencido", diasRestantes: diffDias, proximoReajuste: proximoStr };
  } else if (diffDias <= 30) {
    return { status: "proximo", diasRestantes: diffDias, proximoReajuste: proximoStr };
  } else {
    return { status: "em-dia", diasRestantes: diffDias, proximoReajuste: proximoStr };
  }
}

function StatusBadge({ status, dias }: { status: ReajusteStatus; dias: number | null }) {
  switch (status) {
    case "vencido":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          Vencido ({Math.abs(dias!)} dias)
        </Badge>
      );
    case "proximo":
      return (
        <Badge className="gap-1 bg-amber-500 hover:bg-amber-600">
          <Clock className="w-3 h-3" />
          {dias} dias restantes
        </Badge>
      );
    case "em-dia":
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle className="w-3 h-3" />
          Em dia ({dias} dias)
        </Badge>
      );
    case "sem-data":
      return (
        <Badge variant="outline" className="gap-1">
          Sem data de reajuste
        </Badge>
      );
  }
}

const Reajustes = () => {
  const { clients, isLoading, updateClient } = useClients();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"todos" | "vencido" | "proximo" | "sem-data">("todos");

  const activeClients = clients.filter((c) => c.status === "ativo");

  const clientsWithInfo = useMemo(() => {
    return activeClients.map((c) => ({
      client: c,
      info: getReajusteInfo(c),
    })).sort((a, b) => {
      // Vencidos primeiro, depois próximos, depois em-dia, depois sem-data
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

  const handleMarcarReajuste = async (client: Client) => {
    const hoje = new Date().toISOString().substring(0, 10);
    await updateClient.mutateAsync({
      ...client,
      ultimoReajuste: hoje,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Reajustes</h1>
        <p className="text-muted-foreground">
          Controle de reajustes dos clientes ativos
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <span className="font-semibold text-destructive">Vencidos</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{counts.vencido}</p>
        </div>
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-amber-500" />
            <span className="font-semibold text-amber-500">Próximos (30 dias)</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{counts.proximo}</p>
        </div>
        <div className="p-4 rounded-xl border border-muted bg-muted/20">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <span className="font-semibold text-muted-foreground">Sem data</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{counts.semData}</p>
        </div>
      </div>

      {/* Search + Tabs */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
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
                  <TableHead>Cliente</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Último Reajuste</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Próximo Reajuste</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(({ client, info }) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.nomeFantasia}</TableCell>
                      <TableCell className="text-muted-foreground">{client.cnpj}</TableCell>
                      <TableCell>
                        {client.ultimoReajuste
                          ? new Date(client.ultimoReajuste + "T00:00:00").toLocaleDateString("pt-BR")
                          : "—"}
                      </TableCell>
                      <TableCell>{client.periodoReajusteMeses} meses</TableCell>
                      <TableCell>
                        {info.proximoReajuste
                          ? new Date(info.proximoReajuste + "T00:00:00").toLocaleDateString("pt-BR")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={info.status} dias={info.diasRestantes} />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarcarReajuste(client)}
                        >
                          Marcar Reajuste Hoje
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reajustes;

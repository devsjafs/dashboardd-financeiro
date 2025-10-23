import { useState, useRef } from "react";
import { Client } from "@/types/client";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ClientsTable } from "@/components/dashboard/ClientsTable";
import { ClientDialog } from "@/components/dashboard/ClientDialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV, importFromCSV } from "@/utils/exportImport";
import {
  Users,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Plus,
  Download,
  Upload,
} from "lucide-react";

const mockClients: Client[] = [
  {
    id: "1",
    codigo: "CLI001",
    nomeFantasia: "Tech Solutions",
    razaoSocial: "Tech Solutions Ltda",
    cnpj: "12345678000190",
    valorMensalidade: { smart: 500, apoio: 300, contabilidade: 800 },
    vencimento: 10,
    inicioCompetencia: "2024-01",
    ultimaCompetencia: "2024-12",
    situacao: "mes-corrente",
    status: "ativo",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    codigo: "CLI002",
    nomeFantasia: "Comercial ABC",
    razaoSocial: "Comercial ABC S.A.",
    cnpj: "98765432000110",
    valorMensalidade: { smart: 0, apoio: 200, contabilidade: 600 },
    vencimento: 5,
    inicioCompetencia: "2023-06",
    ultimaCompetencia: "2024-11",
    situacao: "mes-vencido",
    status: "ativo",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const Index = () => {
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const activeClients = clients.filter((c) => c.status === "ativo");
  const overDueClients = clients.filter(
    (c) => c.situacao === "mes-vencido" && c.status === "ativo"
  );

  const totalRevenue = activeClients.reduce(
    (sum, client) =>
      sum +
      client.valorMensalidade.smart +
      client.valorMensalidade.apoio +
      client.valorMensalidade.contabilidade,
    0
  );

  const handleSaveClient = (clientData: Omit<Client, "id" | "createdAt" | "updatedAt">) => {
    if (editingClient) {
      setClients(
        clients.map((c) =>
          c.id === editingClient.id
            ? {
                ...clientData,
                id: editingClient.id,
                createdAt: editingClient.createdAt,
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      );
      toast({
        title: "Cliente atualizado",
        description: "Os dados do cliente foram atualizados com sucesso.",
      });
    } else {
      const newClient: Client = {
        ...clientData,
        id: Math.random().toString(36).substring(7),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setClients([...clients, newClient]);
      toast({
        title: "Cliente criado",
        description: "Novo cliente adicionado com sucesso.",
      });
    }
    setEditingClient(undefined);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setClients(clients.filter((c) => c.id !== id));
    toast({
      title: "Cliente removido",
      description: "Cliente removido com sucesso.",
      variant: "destructive",
    });
  };

  const handleExport = () => {
    exportToCSV(clients);
    toast({
      title: "Dados exportados",
      description: "Os dados foram exportados para CSV com sucesso.",
    });
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedClients = await importFromCSV(file);
      const newClients = importedClients.map((c) => ({
        ...c,
        id: Math.random().toString(36).substring(7),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      setClients([...clients, ...newClients]);
      toast({
        title: "Dados importados",
        description: `${newClients.length} clientes foram importados com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao importar",
        description: "Ocorreu um erro ao importar os dados.",
        variant: "destructive",
      });
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard de Clientes</h1>
            <p className="text-muted-foreground">
              Gerencie seus clientes e acompanhe as métricas importantes
            </p>
          </div>
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Importar
            </Button>
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
            <Button
              onClick={() => {
                setEditingClient(undefined);
                setDialogOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Cliente
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Clientes Ativos"
            value={activeClients.length}
            icon={Users}
            iconColor="text-primary"
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Receita Mensal"
            value={new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(totalRevenue)}
            icon={DollarSign}
            iconColor="text-success"
            trend={{ value: 8, isPositive: true }}
          />
          <StatsCard
            title="Clientes Vencidos"
            value={overDueClients.length}
            icon={AlertCircle}
            iconColor="text-destructive"
          />
          <StatsCard
            title="Total de Clientes"
            value={clients.length}
            icon={TrendingUp}
            iconColor="text-warning"
            trend={{ value: 5, isPositive: true }}
          />
        </div>

        {/* Clients Table */}
        <ClientsTable clients={clients} onEdit={handleEdit} onDelete={handleDelete} />

        {/* Client Dialog */}
        <ClientDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          client={editingClient}
          onSave={handleSaveClient}
        />
      </div>
    </div>
  );
};

export default Index;

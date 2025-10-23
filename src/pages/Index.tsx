import { useState, useRef } from "react";
import { Client } from "@/types/client";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ClientsTable } from "@/components/dashboard/ClientsTable";
import { ClientDialog } from "@/components/dashboard/ClientDialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV, importFromCSV } from "@/utils/exportImport";
import {
  Briefcase,
  DollarSign,
  Plus,
  Download,
  Upload,
} from "lucide-react";

const Index = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const activeClients = clients.filter((c) => c.status === "ativo");

  const smartRevenue = activeClients.reduce((sum, c) => sum + c.valorMensalidade.smart, 0);
  const apoioRevenue = activeClients.reduce((sum, c) => sum + c.valorMensalidade.apoio, 0);
  const contabilRevenue = activeClients.reduce((sum, c) => sum + c.valorMensalidade.contabilidade, 0);
  const personaliteRevenue = activeClients.reduce((sum, c) => sum + c.valorMensalidade.personalite, 0);
  const totalRevenue = smartRevenue + apoioRevenue + contabilRevenue + personaliteRevenue;

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatsCard
            title="Smart"
            value={new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(smartRevenue)}
            icon={Briefcase}
            iconColor="text-primary"
          />
          <StatsCard
            title="Apoio"
            value={new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(apoioRevenue)}
            icon={Briefcase}
            iconColor="text-primary"
          />
          <StatsCard
            title="Contábil"
            value={new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(contabilRevenue)}
            icon={Briefcase}
            iconColor="text-primary"
          />
          <StatsCard
            title="Personalite"
            value={new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(personaliteRevenue)}
            icon={Briefcase}
            iconColor="text-primary"
          />
          <StatsCard
            title="Receita Total"
            value={new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(totalRevenue)}
            icon={DollarSign}
            iconColor="text-success"
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

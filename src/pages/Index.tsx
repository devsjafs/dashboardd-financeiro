import { useState, useRef } from "react";
import { ServiceType } from "@/types/client";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ClientsTable } from "@/components/dashboard/ClientsTable";
import { ClientDialog } from "@/components/dashboard/ClientDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useClients } from "@/hooks/useClients";
import { exportToCSV, importFromCSV } from "@/utils/exportImport";
import {
  Zap,
  Briefcase,
  Calculator,
  Crown,
  DollarSign,
  Plus,
  Download,
  Upload,
  Loader2,
} from "lucide-react";

const Index = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<ServiceType | "all">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { clients, isLoading, createClient, updateClient, deleteClient } = useClients();

  // Apenas clientes ativos (excluindo ex-clientes)
  const activeClients = clients.filter((c) => c.status === "ativo");

  const smartRevenue = activeClients.reduce((sum, c) => sum + c.valorMensalidade.smart, 0);
  const apoioRevenue = activeClients.reduce((sum, c) => sum + c.valorMensalidade.apoio, 0);
  const contabilRevenue = activeClients.reduce((sum, c) => sum + c.valorMensalidade.contabilidade, 0);
  const personaliteRevenue = activeClients.reduce((sum, c) => sum + c.valorMensalidade.personalite, 0);
  const totalRevenue = smartRevenue + apoioRevenue + contabilRevenue + personaliteRevenue;

  // Filtrar clientes por aba selecionada
  const filteredClients = activeTab === "all" 
    ? clients 
    : clients.filter(c => c.services.includes(activeTab));

  const editingClient = clients.find(c => c.id === editingClientId);

  const handleEdit = (clientId: string) => {
    setEditingClientId(clientId);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteClient.mutate(id);
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
      for (const client of importedClients) {
        await createClient.mutateAsync(client);
      }
      toast({
        title: "Dados importados",
        description: `${importedClients.length} clientes foram importados com sucesso.`,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              setEditingClientId(undefined);
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
          icon={Zap}
          iconColor="text-blue-500"
          bgColor="bg-blue-500/10"
        />
        <StatsCard
          title="Apoio"
          value={new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(apoioRevenue)}
          icon={Briefcase}
          iconColor="text-green-500"
          bgColor="bg-green-500/10"
        />
        <StatsCard
          title="Contábil"
          value={new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(contabilRevenue)}
          icon={Calculator}
          iconColor="text-purple-500"
          bgColor="bg-purple-500/10"
        />
        <StatsCard
          title="Personalite"
          value={new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(personaliteRevenue)}
          icon={Crown}
          iconColor="text-amber-500"
          bgColor="bg-amber-500/10"
        />
        <StatsCard
          title="Receita Total"
          value={new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(totalRevenue)}
          icon={DollarSign}
          iconColor="text-success"
          bgColor="bg-success/10"
        />
      </div>

      {/* Tabs for filtering by service */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ServiceType | "all")} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="gap-2">
            Todos
          </TabsTrigger>
          <TabsTrigger value="smart" className="gap-2">
            <Zap className="w-4 h-4" />
            Smart
          </TabsTrigger>
          <TabsTrigger value="apoio" className="gap-2">
            <Briefcase className="w-4 h-4" />
            Apoio
          </TabsTrigger>
          <TabsTrigger value="contabilidade" className="gap-2">
            <Calculator className="w-4 h-4" />
            Contábil
          </TabsTrigger>
          <TabsTrigger value="personalite" className="gap-2">
            <Crown className="w-4 h-4" />
            Personalite
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <ClientsTable clients={filteredClients} onEdit={handleEdit} onDelete={handleDelete} />
        </TabsContent>
      </Tabs>

      {/* Client Dialog */}
      <ClientDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingClientId(undefined);
        }}
        client={editingClient}
        onSave={async (clientData) => {
          if (editingClient) {
            await updateClient.mutateAsync({ ...clientData, id: editingClient.id, createdAt: editingClient.createdAt, updatedAt: editingClient.updatedAt });
          } else {
            await createClient.mutateAsync(clientData);
          }
          setDialogOpen(false);
          setEditingClientId(undefined);
        }}
      />
    </div>
  );
};

export default Index;

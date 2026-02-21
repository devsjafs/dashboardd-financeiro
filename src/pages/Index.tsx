import { useState, useRef, useEffect } from "react";
import { ServiceType } from "@/types/client";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ClientsTable } from "@/components/dashboard/ClientsTable";
import { ClientDialog } from "@/components/dashboard/ClientDialog";
import { GroupDialog } from "@/components/dashboard/GroupDialog";
import { useMonthlyBoletoCheck } from "@/hooks/useMonthlyBoletoCheck";
import { useActiveBillingProvider } from "@/hooks/useActiveBillingProvider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useClients } from "@/hooks/useClients";
import { exportToXLSX, importFromXLSX, downloadClientTemplate } from "@/utils/exportImport";
import { ImportDialog } from "@/components/dashboard/ImportDialog";
import { Badge } from "@/components/ui/badge";
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
  Users,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

const Index = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<ServiceType | "all" | "grupos">("all");
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { toast } = useToast();
  const { clients, isLoading, createClient, updateClient, deleteClient } = useClients();
  const niboCheck = useMonthlyBoletoCheck();
  const { activeConfig, isImplemented } = useActiveBillingProvider();

  useEffect(() => { if (isImplemented) niboCheck.check(); }, []);

  // Apenas clientes ativos (excluindo ex-clientes)
  const activeClients = clients.filter((c) => c.status === "ativo");

  const smartRevenue = activeClients.reduce((sum, c) => sum + c.valorMensalidade.smart, 0);
  const apoioRevenue = activeClients.reduce((sum, c) => sum + c.valorMensalidade.apoio, 0);
  const contabilRevenue = activeClients.reduce((sum, c) => sum + c.valorMensalidade.contabilidade, 0);
  const personaliteRevenue = activeClients.reduce((sum, c) => sum + c.valorMensalidade.personalite, 0);
  const totalRevenue = smartRevenue + apoioRevenue + contabilRevenue + personaliteRevenue;

  const smartClientsCount = activeClients.filter(c => c.services.includes('smart')).length;
  const apoioClientsCount = activeClients.filter(c => c.services.includes('apoio')).length;
  const contabilClientsCount = activeClients.filter(c => c.services.includes('contabilidade')).length;
  const personaliteClientsCount = activeClients.filter(c => c.services.includes('personalite')).length;

  // Obter lista de grupos únicos
  const groups = Array.from(new Set(clients.filter(c => c.grupo).map(c => c.grupo!)));

  // Calcular valores por grupo
  const groupRevenues = groups.map(group => {
    const groupClients = activeClients.filter(c => c.grupo === group);
    const total = groupClients.reduce((sum, c) => {
      return sum + c.valorMensalidade.smart + c.valorMensalidade.apoio + 
             c.valorMensalidade.contabilidade + c.valorMensalidade.personalite;
    }, 0);
    return { group, total, count: groupClients.length };
  });

  // Filtrar clientes por aba de serviço
  const filteredClients = clients.filter(c => {
    if (activeTab === "all") return true;
    if (activeTab === "grupos") return false; // Não mostrar tabela na aba grupos
    return c.services.includes(activeTab as ServiceType);
  });

  // Clientes do grupo selecionado para o dialog
  const selectedGroupClients = selectedGroup 
    ? activeClients.filter(c => c.grupo === selectedGroup)
    : [];

  const editingClient = clients.find(c => c.id === editingClientId);

  const handleEdit = (clientId: string) => {
    setEditingClientId(clientId);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteClient.mutate(id);
  };

  const handleExport = () => {
    exportToXLSX(clients);
    toast({
      title: "Dados exportados",
      description: "Os dados foram exportados para XLSX com sucesso.",
    });
  };

  const handleImport = async (file: File) => {
    try {
      const importedClients = await importFromXLSX(file);
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => isImplemented ? niboCheck.check() : undefined}
                  disabled={niboCheck.loading || !isImplemented}
                  className="gap-2"
                >
                  {niboCheck.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {activeConfig.label}
                  {!isImplemented && (
                    <Badge variant="secondary" className="text-xs ml-1">Em breve</Badge>
                  )}
                  {isImplemented && niboCheck.summary && (
                    <span className="flex items-center gap-1 ml-1">
                      {niboCheck.summary.pendente > 0 && (
                        <span className="flex items-center gap-0.5 text-destructive">
                          <XCircle className="h-3.5 w-3.5" />
                          {niboCheck.summary.pendente}
                        </span>
                      )}
                      {niboCheck.summary.parcial > 0 && (
                        <span className="flex items-center gap-0.5 text-amber-500">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {niboCheck.summary.parcial}
                        </span>
                      )}
                      {niboCheck.summary.ok > 0 && (
                        <span className="flex items-center gap-0.5 text-emerald-500">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {niboCheck.summary.ok}
                        </span>
                      )}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {!isImplemented
                  ? `Integração com ${activeConfig.label} em breve`
                  : niboCheck.summary
                  ? `Boletos ${niboCheck.summary.competencia}: ${niboCheck.summary.ok} OK, ${niboCheck.summary.parcial} Parcial, ${niboCheck.summary.pendente} Pendente`
                  : `Verificar boletos do mês no ${activeConfig.label}`}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="outline"
            onClick={() => setImportDialogOpen(true)}
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
          subtitle={String(smartClientsCount)}
          subtitleSize="large"
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
          subtitle={String(apoioClientsCount)}
          subtitleSize="large"
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
          subtitle={String(contabilClientsCount)}
          subtitleSize="large"
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
          subtitle={String(personaliteClientsCount)}
          subtitleSize="large"
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
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value as ServiceType | "all" | "grupos");
      }} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
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
          <TabsTrigger value="grupos" className="gap-2">
            <Users className="w-4 h-4" />
            Grupos
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6 space-y-4">
          {/* Group Cards - shown when on Grupos tab */}
          {activeTab === "grupos" && groups.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
              {groupRevenues.map(({ group, total, count }) => (
                <button
                  key={group}
                  onClick={() => {
                    setSelectedGroup(group);
                    setGroupDialogOpen(true);
                  }}
                  className="p-4 rounded-xl border transition-all hover:shadow-lg border-border bg-card hover:border-primary/50"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">{group}</h3>
                  </div>
                  <div className="text-left space-y-1">
                    <p className="text-2xl font-bold text-foreground">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(total)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {count} {count === 1 ? 'empresa' : 'empresas'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Show ClientsTable for non-Grupos tabs */}
          {activeTab !== "grupos" && (
            <ClientsTable clients={filteredClients} onEdit={handleEdit} onDelete={handleDelete} niboStatus={niboCheck.statusByClientId} niboResults={niboCheck.results} />
          )}
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

      {/* Group Dialog */}
      <GroupDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        groupName={selectedGroup || ""}
        clients={selectedGroupClients}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Import Dialog */}
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
        onDownloadTemplate={downloadClientTemplate}
        title="Importar Clientes"
        description="Baixe o modelo XLSX, preencha com os dados dos clientes e importe o arquivo."
      />
    </div>
  );
};

export default Index;

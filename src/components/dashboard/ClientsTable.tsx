import { useState } from "react";
import { Client } from "@/types/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Pencil, Trash2, Zap, Briefcase, Calculator, Crown, ArrowUpDown, ArrowUp, ArrowDown, History, CheckCircle2, XCircle, AlertTriangle, Minus } from "lucide-react";
import { ClientHistoryDialog } from "./ClientHistoryDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ClientsTableProps {
  clients: Client[];
  onEdit: (clientId: string) => void;
  onDelete: (id: string) => void;
  niboStatus?: Record<string, "ok" | "parcial" | "pendente">;
}

const statusColors = {
  'ativo': 'bg-success/10 text-success border-success/20',
  'inativo': 'bg-muted text-muted-foreground border-muted',
  'sem-faturamento': 'bg-warning/10 text-warning border-warning/20',
  'ex-cliente': 'bg-destructive/10 text-destructive border-destructive/20',
  'suspenso': 'bg-destructive/10 text-destructive border-destructive/20',
};

const serviceConfig = {
  smart: {
    icon: Zap,
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    label: "Smart"
  },
  apoio: {
    icon: Briefcase,
    color: "bg-green-500/10 text-green-500 border-green-500/20",
    label: "Apoio"
  },
  contabilidade: {
    icon: Calculator,
    color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    label: "Contábil"
  },
  personalite: {
    icon: Crown,
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    label: "Personalite"
  },
};

const situacaoLabels = {
  'mes-vencido': 'Mês Vencido',
  'mes-corrente': 'Mês Corrente',
  'mes-corrente-vencido': 'Mês Corrente/Vencido',
  'anual': 'Anual'
};

type SortField = "codigo" | "nomeFantasia" | "valorMensalidade" | "vencimento";
type SortDirection = "asc" | "desc";

export function ClientsTable({ clients, onEdit, onDelete, niboStatus }: ClientsTableProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("codigo");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedClients = clients
    .filter((client) => {
      const searchLower = search.toLowerCase();
      return (
        client.codigo.toLowerCase().includes(searchLower) ||
        client.nomeFantasia.toLowerCase().includes(searchLower) ||
        client.razaoSocial.toLowerCase().includes(searchLower) ||
        client.cnpj.includes(searchLower)
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case "codigo":
          comparison = parseInt(a.codigo) - parseInt(b.codigo);
          break;
        case "nomeFantasia":
          comparison = a.nomeFantasia.localeCompare(b.nomeFantasia);
          break;
        case "valorMensalidade":
          comparison = getTotalMensalidade(a.valorMensalidade) - getTotalMensalidade(b.valorMensalidade);
          break;
        case "vencimento":
          comparison = a.vencimento - b.vencimento;
          break;
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });

  const totalPages = Math.ceil(filteredAndSortedClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredAndSortedClients.slice(startIndex, startIndex + itemsPerPage);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDocument = (document: string, type: string) => {
    if (type === 'cnpj') {
      return document.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    } else if (type === 'cpf' || type === 'caepf') {
      return document.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    }
    return document;
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-40" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  const getTotalMensalidade = (values: Client['valorMensalidade']) => {
    return values.smart + values.apoio + values.contabilidade + values.personalite;
  };

  return (
    <div className="space-y-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por código, nome, razão social ou CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead 
                className="font-semibold cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => handleSort("codigo")}
              >
                <div className="flex items-center">
                  Código
                  {getSortIcon("codigo")}
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => handleSort("nomeFantasia")}
              >
                <div className="flex items-center">
                  Nome Fantasia
                  {getSortIcon("nomeFantasia")}
                </div>
              </TableHead>
              <TableHead className="font-semibold">Razão Social</TableHead>
              <TableHead className="font-semibold">CNPJ</TableHead>
              <TableHead 
                className="font-semibold text-right cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => handleSort("valorMensalidade")}
              >
                <div className="flex items-center justify-end">
                  Mensalidade
                  {getSortIcon("valorMensalidade")}
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => handleSort("vencimento")}
              >
                <div className="flex items-center">
                  Vencimento
                  {getSortIcon("vencimento")}
                </div>
              </TableHead>
              <TableHead className="font-semibold">Serviços</TableHead>
              <TableHead className="font-semibold">Situação</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-center">Nibo</TableHead>
              <TableHead className="font-semibold text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Nenhum cliente encontrado
                </TableCell>
              </TableRow>
            ) : (
              paginatedClients.map((client) => (
                <TableRow key={client.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{client.codigo}</TableCell>
                  <TableCell>{client.nomeFantasia}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{client.razaoSocial}</TableCell>
                  <TableCell className="font-mono text-sm">{formatDocument(client.cnpj, client.documentType)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(getTotalMensalidade(client.valorMensalidade))}
                  </TableCell>
                  <TableCell>Dia {client.vencimento}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {client.services.map((service) => {
                        const config = serviceConfig[service];
                        const Icon = config.icon;
                        return (
                          <Badge
                            key={service}
                            variant="outline"
                            className={`${config.color} flex items-center gap-1`}
                          >
                            <Icon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {situacaoLabels[client.situacao]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[client.status]}>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          {niboStatus && niboStatus[client.id] === "ok" ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
                          ) : niboStatus && niboStatus[client.id] === "parcial" ? (
                            <AlertTriangle className="h-5 w-5 text-amber-500 mx-auto" />
                          ) : niboStatus && niboStatus[client.id] === "pendente" ? (
                            <XCircle className="h-5 w-5 text-destructive mx-auto" />
                          ) : (
                            <Minus className="h-4 w-4 text-muted-foreground mx-auto" />
                          )}
                        </TooltipTrigger>
                        <TooltipContent>
                          {niboStatus && niboStatus[client.id] === "ok"
                            ? "Boleto emitido no Nibo"
                            : niboStatus && niboStatus[client.id] === "parcial"
                            ? "Boleto parcialmente emitido"
                            : niboStatus && niboStatus[client.id] === "pendente"
                            ? "Boleto pendente no Nibo"
                            : "Sem verificação"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedClient(client);
                          setHistoryDialogOpen(true);
                        }}
                        className="hover:bg-primary/10 hover:text-primary"
                        title="Histórico"
                      >
                        <History className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(client.id)}
                        className="hover:bg-primary/10 hover:text-primary"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(client.id)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredAndSortedClients.length)} de {filteredAndSortedClients.length} clientes
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Itens por página:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={40}>40</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 6) }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-10"
                >
                  {page}
                </Button>
              ))}
              {totalPages > 6 && (
                <>
                  <span className="px-2 text-muted-foreground">...</span>
                  <Button
                    variant={currentPage === totalPages ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-10"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {selectedClient && (
        <ClientHistoryDialog
          clientId={selectedClient.id}
          clientName={selectedClient.nomeFantasia}
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
        />
      )}
    </div>
  );
}

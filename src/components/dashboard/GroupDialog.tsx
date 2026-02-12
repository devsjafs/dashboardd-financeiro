import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ClientsTable } from "./ClientsTable";
import { Client } from "@/types/client";
import { Search } from "lucide-react";

interface GroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  clients: Client[];
  onEdit: (clientId: string) => void;
  onDelete: (clientId: string) => void;
}

export const GroupDialog = ({
  open,
  onOpenChange,
  groupName,
  clients,
  onEdit,
  onDelete,
}: GroupDialogProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Ordenar por nome e filtrar por pesquisa
  const sortedAndFilteredClients = useMemo(() => {
    let filtered = [...clients];
    
    // Ordenar por nome fantasia
    filtered.sort((a, b) => a.nomeFantasia.localeCompare(b.nomeFantasia));
    
    // Filtrar por termo de pesquisa
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.nomeFantasia.toLowerCase().includes(term) ||
        c.razaoSocial.toLowerCase().includes(term) ||
        c.cnpj.includes(term)
      );
    }
    
    return filtered;
  }, [clients, searchTerm]);

  const totalRevenue = clients.reduce((sum, c) => {
    return sum + c.valorMensalidade.smart + c.valorMensalidade.apoio + 
           c.valorMensalidade.contabilidade + c.valorMensalidade.personalite;
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {groupName}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            {clients.length} {clients.length === 1 ? 'empresa' : 'empresas'} • {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(totalRevenue)} total
          </div>
        </DialogHeader>
        
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, razão social ou documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="mt-4">
          <ClientsTable clients={sortedAndFilteredClients} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

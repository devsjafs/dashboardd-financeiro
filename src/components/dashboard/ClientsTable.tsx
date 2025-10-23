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
import { Search, Pencil, Trash2 } from "lucide-react";

interface ClientsTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
}

const statusColors = {
  'ativo': 'bg-success/10 text-success border-success/20',
  'inativo': 'bg-muted text-muted-foreground border-muted',
  'sem-faturamento': 'bg-warning/10 text-warning border-warning/20',
  'ex-cliente': 'bg-destructive/10 text-destructive border-destructive/20',
  'suspenso': 'bg-destructive/10 text-destructive border-destructive/20',
};

const serviceColors = {
  'smart': 'bg-primary/10 text-primary border-primary/20',
  'apoio': 'bg-success/10 text-success border-success/20',
  'contabilidade': 'bg-warning/10 text-warning border-warning/20',
  'personalite': 'bg-destructive/10 text-destructive border-destructive/20',
};

export function ClientsTable({ clients, onEdit, onDelete }: ClientsTableProps) {
  const [search, setSearch] = useState("");

  const filteredClients = clients.filter((client) => {
    const searchLower = search.toLowerCase();
    return (
      client.codigo.toLowerCase().includes(searchLower) ||
      client.nomeFantasia.toLowerCase().includes(searchLower) ||
      client.razaoSocial.toLowerCase().includes(searchLower) ||
      client.cnpj.includes(searchLower)
    );
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const getTotalMensalidade = (values: Client['valorMensalidade']) => {
    return values.smart + values.apoio + values.contabilidade;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nome, razão social ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Código</TableHead>
              <TableHead className="font-semibold">Nome Fantasia</TableHead>
              <TableHead className="font-semibold">Razão Social</TableHead>
              <TableHead className="font-semibold">CNPJ</TableHead>
              <TableHead className="font-semibold text-right">Mensalidade</TableHead>
              <TableHead className="font-semibold">Vencimento</TableHead>
              <TableHead className="font-semibold">Serviços</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum cliente encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow key={client.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{client.codigo}</TableCell>
                  <TableCell>{client.nomeFantasia}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{client.razaoSocial}</TableCell>
                  <TableCell className="font-mono text-sm">{formatCNPJ(client.cnpj)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(getTotalMensalidade(client.valorMensalidade))}
                  </TableCell>
                  <TableCell>Dia {client.vencimento}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {client.services.map((service) => (
                        <Badge key={service} variant="outline" className={serviceColors[service]}>
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[client.status]}>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(client)}
                        className="hover:bg-primary/10 hover:text-primary"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(client.id)}
                        className="hover:bg-destructive/10 hover:text-destructive"
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
    </div>
  );
}

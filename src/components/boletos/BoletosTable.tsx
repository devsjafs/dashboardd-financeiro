import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { BoletoWithClient } from "@/types/boleto";
import { formatDateString } from "@/lib/utils";

interface BoletosTableProps {
  boletos: BoletoWithClient[];
  onEdit: (boleto: BoletoWithClient) => void;
  onDelete: (id: string) => void;
  onMarkAsPaid: (id: string) => void;
  onMarkAsUnpaid: (id: string) => void;
}

type SortField = "cliente" | "cnpj" | "categoria" | "competencia" | "vencimento" | "valor" | "status";
type SortDir = "asc" | "desc";

const formatDocument = (doc: string) => {
  if (!doc) return "-";
  const digits = doc.replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return doc;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatCompetencia = (competencia: string) => {
  if (!competencia) return "-";
  const [year, month] = competencia.split("-");
  return `${month}/${year}`;
};

export const BoletosTable = ({
  boletos,
  onEdit,
  onDelete,
  onMarkAsPaid,
  onMarkAsUnpaid,
}: BoletosTableProps) => {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("competencia");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const SortableHead = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center">
        {children}
        <SortIcon field={field} />
      </span>
    </TableHead>
  );

  const filtered = boletos.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.clients.nome_fantasia.toLowerCase().includes(q) ||
      b.clients.cnpj.replace(/\D/g, "").includes(q.replace(/\D/g, "")) ||
      b.categoria.toLowerCase().includes(q) ||
      formatCompetencia(b.competencia).includes(q) ||
      b.status.toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let valA: string | number = "";
    let valB: string | number = "";

    switch (sortField) {
      case "cliente":
        valA = a.clients.nome_fantasia.toLowerCase();
        valB = b.clients.nome_fantasia.toLowerCase();
        break;
      case "cnpj":
        valA = a.clients.cnpj;
        valB = b.clients.cnpj;
        break;
      case "categoria":
        valA = a.categoria.toLowerCase();
        valB = b.categoria.toLowerCase();
        break;
      case "competencia":
        valA = a.competencia;
        valB = b.competencia;
        break;
      case "vencimento":
        valA = a.vencimento;
        valB = b.vencimento;
        break;
      case "valor":
        valA = Number(a.valor);
        valB = Number(b.valor);
        break;
      case "status":
        valA = a.status;
        valB = b.status;
        break;
    }

    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por cliente, documento, categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead field="cliente">Cliente</SortableHead>
              <SortableHead field="cnpj">CPF/CNPJ</SortableHead>
              <SortableHead field="categoria">Categoria</SortableHead>
              <SortableHead field="competencia">Competência</SortableHead>
              <SortableHead field="vencimento">Vencimento</SortableHead>
              <SortableHead field="valor">Valor</SortableHead>
              <SortableHead field="status">Status</SortableHead>
              <TableHead>Data Pagamento</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  {search ? "Nenhum boleto encontrado para essa pesquisa" : "Nenhum boleto cadastrado"}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((boleto) => (
                <TableRow key={boleto.id}>
                  <TableCell className="font-medium">{boleto.clients.nome_fantasia}</TableCell>
                  <TableCell className="font-mono text-sm">{formatDocument(boleto.clients.cnpj)}</TableCell>
                  <TableCell>{boleto.categoria}</TableCell>
                  <TableCell>{formatCompetencia(boleto.competencia)}</TableCell>
                  <TableCell>{formatDateString(boleto.vencimento)}</TableCell>
                  <TableCell>{formatCurrency(boleto.valor)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={boleto.status === "pago" ? "default" : "destructive"}
                      className="cursor-pointer"
                      onClick={() =>
                        boleto.status === "pago"
                          ? onMarkAsUnpaid(boleto.id)
                          : onMarkAsPaid(boleto.id)
                      }
                    >
                      {boleto.status === "pago" ? "PAGO" : "NÃO PAGO"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {boleto.data_pagamento ? formatDateString(boleto.data_pagamento) : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(boleto)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(boleto.id)}>
                        <Trash2 className="h-4 w-4" />
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
};

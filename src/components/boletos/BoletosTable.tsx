import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Unlink } from "lucide-react";
import { BoletoWithClient } from "@/types/boleto";
import { formatDateString } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

const PAGE_SIZE_OPTIONS = [10, 20, 40, 50];

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40 inline" />;
    return sortDir === "asc"
      ? <ArrowUp className="ml-1 h-3 w-3 inline" />
      : <ArrowDown className="ml-1 h-3 w-3 inline" />;
  };

  const SortableHead = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap"
      onClick={() => handleSort(field)}
    >
      {children}
      <SortIcon field={field} />
    </TableHead>
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return boletos;
    const q = search.toLowerCase().trim();
    const qDigits = q.replace(/\D/g, "");
    return boletos.filter((b) =>
      b.clients.nome_fantasia.toLowerCase().includes(q) ||
      (qDigits && b.clients.cnpj.replace(/\D/g, "").includes(qDigits)) ||
      b.categoria.toLowerCase().includes(q) ||
      formatCompetencia(b.competencia).includes(q) ||
      b.status.toLowerCase().includes(q)
    );
  }, [boletos, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
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
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("...");
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
        pages.push(i);
      }
      if (safePage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por cliente, documento, categoria..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
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
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  {search ? "Nenhum boleto encontrado para essa pesquisa" : "Nenhum boleto cadastrado"}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((boleto) => (
                <TableRow key={boleto.id}>
                  <TableCell className="font-medium">{boleto.clients.nome_fantasia}</TableCell>
                  <TableCell className="font-mono text-sm">{formatDocument(boleto.clients.cnpj)}</TableCell>
                  <TableCell>{boleto.categoria}</TableCell>
                  <TableCell>{formatCompetencia(boleto.competencia)}</TableCell>
                  <TableCell>{formatDateString(boleto.vencimento)}</TableCell>
                  <TableCell>{formatCurrency(boleto.valor)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(boleto as any).status === "cancelado" ? (
                        <Badge variant="secondary" className="text-muted-foreground">
                          CANCELADO
                        </Badge>
                      ) : (
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
                      )}
                      {!(boleto as any).nibo_schedule_id && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">
                                <Unlink className="h-3 w-3 text-muted-foreground/60" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs">Sem vínculo Nibo — criado manualmente</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {boleto.data_pagamento ? formatDateString(boleto.data_pagamento) : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(boleto)}
                        disabled={(boleto as any).status === "cancelado"}
                      >
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

      {/* Pagination */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Linhas por página:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((s) => (
                <SelectItem key={s} value={String(s)}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>
            {sorted.length === 0 ? "0 registros" : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, sorted.length)} de ${sorted.length}`}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {getPageNumbers().map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">…</span>
            ) : (
              <Button
                key={p}
                variant={safePage === p ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(p as number)}
              >
                {p}
              </Button>
            )
          )}

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { BoletoWithClient } from "@/types/boleto";

interface TopDebtorsTableProps {
  boletos: BoletoWithClient[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

interface ClientDetail {
  nome: string;
  overdueCount: number;
  overdueTotal: number;
  oldestDate: Date | null;
  overdueBoletos: BoletoWithClient[];
}

type SortField = "nome" | "overdueCount" | "overdueTotal" | "oldestDate";
type SortDir = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 20, 40, 50];

export function TopDebtorsTable({ boletos }: TopDebtorsTableProps) {
  const [selectedClient, setSelectedClient] = useState<ClientDetail | null>(null);
  const [sortField, setSortField] = useState<SortField>("overdueTotal");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const unpaid = boletos.filter((b) => b.status === "não pago");

  const byClient: Record<string, ClientDetail> = {};
  for (const b of unpaid) {
    const key = b.client_id;
    const nome = b.clients?.nome_fantasia || "—";
    if (!byClient[key]) {
      byClient[key] = { nome, overdueCount: 0, overdueTotal: 0, oldestDate: null, overdueBoletos: [] };
    }
    const venc = new Date(b.vencimento + "T00:00:00");
    if (venc < today) {
      byClient[key].overdueCount++;
      byClient[key].overdueTotal += Number(b.valor);
      byClient[key].overdueBoletos.push(b);
      if (!byClient[key].oldestDate || venc < byClient[key].oldestDate!) {
        byClient[key].oldestDate = venc;
      }
    }
  }

  const allClients = Object.values(byClient).filter((c) => c.overdueCount > 0);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "nome" ? "asc" : "desc");
    }
    setPage(1);
  };

  const sorted = [...allClients].sort((a, b) => {
    let valA: string | number = 0;
    let valB: string | number = 0;
    switch (sortField) {
      case "nome":
        valA = a.nome.toLowerCase();
        valB = b.nome.toLowerCase();
        break;
      case "overdueCount":
        valA = a.overdueCount;
        valB = b.overdueCount;
        break;
      case "overdueTotal":
        valA = a.overdueTotal;
        valB = b.overdueTotal;
        break;
      case "oldestDate":
        valA = a.oldestDate?.getTime() ?? Infinity;
        valB = b.oldestDate?.getTime() ?? Infinity;
        break;
    }
    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const getPageNumbers = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("...");
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const getDaysOverdue = (date: Date | null) => {
    if (!date) return null;
    return Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40 inline" />;
    return sortDir === "asc"
      ? <ArrowUp className="ml-1 h-3 w-3 inline" />
      : <ArrowDown className="ml-1 h-3 w-3 inline" />;
  };

  const SortableHead = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead
      className={`cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap ${className ?? ""}`}
      onClick={() => handleSort(field)}
    >
      {children}
      <SortIcon field={field} />
    </TableHead>
  );

  if (allClients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Clientes Inadimplentes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente com boletos vencidos.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Top Clientes Inadimplentes
            <span className="ml-2 text-sm font-normal text-muted-foreground">({allClients.length} clientes)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead className="w-8"></TableHead>
                <SortableHead field="nome">Cliente</SortableHead>
                <SortableHead field="overdueCount" className="text-center">Boletos Vencidos</SortableHead>
                <SortableHead field="overdueTotal" className="text-right">Total Vencido</SortableHead>
                <SortableHead field="oldestDate" className="text-right">Mais Antigo</SortableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((c, i) => {
                const globalIndex = (safePage - 1) * pageSize + i + 1;
                const days = getDaysOverdue(c.oldestDate);
                return (
                  <TableRow key={c.nome}>
                    <TableCell className="text-muted-foreground font-medium">{globalIndex}</TableCell>
                    <TableCell className="pr-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setSelectedClient(c)}
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="text-center">{c.overdueCount}</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">
                      {formatCurrency(c.overdueTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      {days !== null ? (
                        <span className={days > 60 ? "text-destructive font-semibold" : days > 30 ? "text-orange-500 font-semibold" : "text-yellow-500 font-semibold"}>
                          {days}d atraso
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Linhas por página:</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
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
                {sorted.length === 0
                  ? "0 registros"
                  : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, sorted.length)} de ${sorted.length}`}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {getPageNumbers().map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">…</span>
                ) : (
                  <Button key={p} variant={safePage === p ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => setPage(p as number)}>
                    {p}
                  </Button>
                )
              )}
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Boletos Vencidos — {selectedClient?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div>
                <p className="text-xs text-muted-foreground">Total Vencido</p>
                <p className="text-lg font-bold text-destructive">{formatCurrency(selectedClient?.overdueTotal ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Boletos Vencidos</p>
                <p className="text-lg font-bold">{selectedClient?.overdueCount}</p>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Atraso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedClient?.overdueBoletos
                  .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
                  .map((b) => {
                    const venc = new Date(b.vencimento + "T00:00:00");
                    const days = Math.floor((today.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
                    const [yyyy, mm] = b.competencia.split("-");
                    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
                    const compLabel = mm ? `${monthNames[parseInt(mm) - 1]}/${yyyy?.slice(2)}` : b.competencia;
                    return (
                      <TableRow key={b.id}>
                        <TableCell>{b.categoria}</TableCell>
                        <TableCell>{compLabel}</TableCell>
                        <TableCell>{formatDate(b.vencimento)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(Number(b.valor))}</TableCell>
                        <TableCell className="text-right">
                          <Badge className={days > 60 ? "bg-destructive text-destructive-foreground" : days > 30 ? "bg-orange-500 text-white" : "bg-yellow-500 text-foreground"}>
                            {days}d
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

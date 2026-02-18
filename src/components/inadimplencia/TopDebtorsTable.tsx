import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function TopDebtorsTable({ boletos }: TopDebtorsTableProps) {
  const [selectedClient, setSelectedClient] = useState<ClientDetail | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Only unpaid boletos
  const unpaid = boletos.filter((b) => b.status === "não pago");

  // Group by client, counting only OVERDUE boletos for total/count
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

  // Only clients with at least one overdue boleto, sorted by overdue total
  const sorted = Object.values(byClient)
    .filter((c) => c.overdueCount > 0)
    .sort((a, b) => b.overdueTotal - a.overdueTotal);

  const getDaysOverdue = (date: Date | null) => {
    if (!date) return null;
    return Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (sorted.length === 0) {
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
            <span className="ml-2 text-sm font-normal text-muted-foreground">({sorted.length} clientes)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead></TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-center">Boletos Vencidos</TableHead>
                <TableHead className="text-right">Total Vencido</TableHead>
                <TableHead className="text-right">Mais Antigo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((c, i) => {
                const days = getDaysOverdue(c.oldestDate);
                return (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground font-medium">{i + 1}</TableCell>
                    <TableCell className="w-8 pr-0">
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
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Boletos Vencidos — {selectedClient?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div>
                <p className="text-xs text-muted-foreground">Total Vencido</p>
                <p className="text-lg font-bold text-destructive">
                  {formatCurrency(selectedClient?.overdueTotal ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Boletos</p>
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
                          <Badge
                            variant="destructive"
                            className={days > 60 ? "bg-destructive" : days > 30 ? "bg-orange-500" : "bg-yellow-500 text-foreground"}
                          >
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

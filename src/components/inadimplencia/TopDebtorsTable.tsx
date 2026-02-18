import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BoletoWithClient } from "@/types/boleto";

interface TopDebtorsTableProps {
  boletos: BoletoWithClient[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function TopDebtorsTable({ boletos }: TopDebtorsTableProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const unpaid = boletos.filter((b) => b.status === "não pago");

  // Group by client
  const byClient: Record<string, { nome: string; count: number; total: number; oldestDate: Date | null }> = {};

  for (const b of unpaid) {
    const key = b.client_id;
    const nome = b.clients?.nome_fantasia || "—";
    if (!byClient[key]) {
      byClient[key] = { nome, count: 0, total: 0, oldestDate: null };
    }
    byClient[key].count++;
    byClient[key].total += Number(b.valor);

    const venc = new Date(b.vencimento + "T00:00:00");
    if (venc < today) {
      if (!byClient[key].oldestDate || venc < byClient[key].oldestDate!) {
        byClient[key].oldestDate = venc;
      }
    }
  }

  const sorted = Object.values(byClient)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

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
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente com boletos em aberto.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Clientes Inadimplentes</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-center">Boletos</TableHead>
              <TableHead className="text-right">Total em Aberto</TableHead>
              <TableHead className="text-right">Mais Antigo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((c, i) => {
              const days = getDaysOverdue(c.oldestDate);
              return (
                <TableRow key={i}>
                  <TableCell className="text-muted-foreground font-medium">{i + 1}</TableCell>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-center">{c.count}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(c.total)}</TableCell>
                  <TableCell className="text-right">
                    {days !== null ? (
                      <span className={days > 60 ? "text-destructive font-semibold" : days > 30 ? "text-orange-600" : "text-yellow-600"}>
                        {days}d atraso
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">a vencer</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

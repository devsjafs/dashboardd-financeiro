import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { BoletoWithClient } from "@/types/boleto";

interface OverdueBoletosTableProps {
  boletos: BoletoWithClient[];
  onMarkAsPaid: (id: string) => void;
  isMarkingPaid: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

function getSeverityBadge(days: number) {
  if (days > 60) return <Badge variant="destructive" className="border-0">{days}d atraso</Badge>;
  if (days > 30) return <Badge variant="outline" className="border-orange-400 text-orange-600 bg-orange-50">{days}d atraso</Badge>;
  return <Badge variant="outline" className="border-yellow-400 text-yellow-600 bg-yellow-50">{days}d atraso</Badge>;
}

export function OverdueBoletosTable({ boletos, onMarkAsPaid, isMarkingPaid }: OverdueBoletosTableProps) {
  const [paying, setPaying] = useState<string | null>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = boletos
    .filter((b) => b.status === "não pago" && new Date(b.vencimento + "T00:00:00") < today)
    .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());

  const getDays = (vencimento: string) =>
    Math.floor((today.getTime() - new Date(vencimento + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24));

  const handlePay = async (id: string) => {
    setPaying(id);
    await onMarkAsPaid(id);
    setPaying(null);
  };

  if (overdue.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Boletos Vencidos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum boleto vencido no momento. 🎉</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Boletos Vencidos
          <span className="ml-2 text-sm font-normal text-muted-foreground">({overdue.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Atraso</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdue.map((b) => {
                const days = getDays(b.vencimento);
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.clients?.nome_fantasia || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{b.categoria}</TableCell>
                    <TableCell className="text-muted-foreground">{b.competencia}</TableCell>
                    <TableCell>{formatDate(b.vencimento)}</TableCell>
                    <TableCell>{getSeverityBadge(days)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(Number(b.valor))}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        disabled={isMarkingPaid && paying === b.id}
                        onClick={() => handlePay(b.id)}
                      >
                        <CheckCircle className="h-3 w-3" />
                        Pago
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

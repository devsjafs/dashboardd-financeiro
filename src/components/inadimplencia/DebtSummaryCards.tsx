import { DollarSign, AlertTriangle, Clock, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BoletoWithClient } from "@/types/boleto";

interface DebtSummaryCardsProps {
  boletos: BoletoWithClient[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function DebtSummaryCards({ boletos }: DebtSummaryCardsProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30Days = new Date(today);
  in30Days.setDate(today.getDate() + 30);

  const unpaid = boletos.filter((b) => b.status === "não pago");

  const totalAberto = unpaid.reduce((sum, b) => sum + Number(b.valor), 0);

  const vencidos = unpaid.filter((b) => new Date(b.vencimento + "T00:00:00") < today);
  const totalVencido = vencidos.reduce((sum, b) => sum + Number(b.valor), 0);

  const aVencer = unpaid.filter((b) => {
    const v = new Date(b.vencimento + "T00:00:00");
    return v >= today && v <= in30Days;
  });
  const totalAVencer = aVencer.reduce((sum, b) => sum + Number(b.valor), 0);

  // Taxa de inadimplência do mês atual
  const mesAtual = `${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
  const boletosDoMes = boletos.filter((b) => {
    // competencia format: MM/YYYY
    return b.competencia === mesAtual;
  });
  const vencidosDoMes = boletosDoMes.filter(
    (b) => b.status === "não pago" && new Date(b.vencimento + "T00:00:00") < today
  );
  const taxaInadimplencia =
    boletosDoMes.length > 0 ? (vencidosDoMes.length / boletosDoMes.length) * 100 : 0;

  const cards = [
    {
      title: "Total em Aberto",
      value: formatCurrency(totalAberto),
      sub: `${unpaid.length} boleto(s) não pago(s)`,
      icon: DollarSign,
      color: "text-foreground",
      bg: "bg-muted/50",
    },
    {
      title: "Total Vencido",
      value: formatCurrency(totalVencido),
      sub: `${vencidos.length} boleto(s) vencido(s)`,
      icon: AlertTriangle,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      title: "A Vencer (30 dias)",
      value: formatCurrency(totalAVencer),
      sub: `${aVencer.length} boleto(s) a vencer`,
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      title: "Taxa de Inadimplência",
      value: `${taxaInadimplencia.toFixed(1)}%`,
      sub: `${vencidosDoMes.length} de ${boletosDoMes.length} no mês`,
      icon: TrendingDown,
      color: taxaInadimplencia > 20 ? "text-destructive" : "text-orange-600",
      bg: taxaInadimplencia > 20 ? "bg-destructive/10" : "bg-orange-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
            <div className={`p-2 rounded-lg ${card.bg}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

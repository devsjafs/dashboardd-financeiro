import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BoletoWithClient } from "@/types/boleto";

interface InadimplenciaChartProps {
  boletos: BoletoWithClient[];
}

// Returns last 12 months as YYYY-MM (DB format)
function getLast12Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    months.push(`${yyyy}-${mm}`);
  }
  return months;
}

function formatMonthLabel(competencia: string): string {
  // competencia is YYYY-MM
  const [yyyy, mm] = competencia.split("-");
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${monthNames[parseInt(mm) - 1]}/${yyyy.slice(2)}`;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

export function InadimplenciaChart({ boletos }: InadimplenciaChartProps) {
  const last12 = getLast12Months();

  const data = last12.map((mes) => {
    // competencia in DB is stored as YYYY-MM
    const doMes = boletos.filter((b) => b.competencia === mes);
    const pago = doMes.filter((b) => b.status === "pago").reduce((s, b) => s + Number(b.valor), 0);
    const naoPago = doMes.filter((b) => b.status === "não pago").reduce((s, b) => s + Number(b.valor), 0);
    return { mes: formatMonthLabel(mes), pago, naoPago };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pago vs Não Pago — Últimos 12 meses</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} width={80} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend />
            <Bar dataKey="pago" name="Pago" fill="#22c55e" radius={[3, 3, 0, 0]} />
            <Bar dataKey="naoPago" name="Não Pago" fill="#ef4444" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

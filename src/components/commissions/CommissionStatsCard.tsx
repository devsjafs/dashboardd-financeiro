import { Card } from "@/components/ui/card";
import { DollarSign, CheckCircle, Clock } from "lucide-react";

interface CommissionStatsCardProps {
  title: string;
  value: number;
  type: "total" | "paid" | "pending";
}

export function CommissionStatsCard({ title, value, type }: CommissionStatsCardProps) {
  const icons = {
    total: DollarSign,
    paid: CheckCircle,
    pending: Clock,
  };

  const colors = {
    total: { icon: "text-primary", bg: "bg-primary/10" },
    paid: { icon: "text-success", bg: "bg-success/10" },
    pending: { icon: "text-warning", bg: "bg-warning/10" },
  };

  const Icon = icons[type];
  const color = colors[type];

  return (
    <Card className="relative overflow-hidden bg-gradient-card shadow-card border-border/50 hover:shadow-md transition-all duration-300">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl ${color.bg} ${color.icon}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(value)}
          </p>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-primary opacity-50" />
    </Card>
  );
}

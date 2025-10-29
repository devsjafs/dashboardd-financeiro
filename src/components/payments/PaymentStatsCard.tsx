import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface PaymentStatsCardProps {
  title: string;
  value: string;
  valueColor?: string;
}

export const PaymentStatsCard = ({ title, value, valueColor = "text-foreground" }: PaymentStatsCardProps) => {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground mb-2">{title}</p>
        <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      </CardContent>
    </Card>
  );
};

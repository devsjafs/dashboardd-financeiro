import { Card, CardContent } from "@/components/ui/card";

interface PaymentStatsCardProps {
  title: string;
  value: string;
  valueColor?: string;
}

export const PaymentStatsCard = ({ title, value, valueColor = "text-foreground" }: PaymentStatsCardProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{title}</p>
        <p className={`text-xl font-bold ${valueColor}`}>{value}</p>
      </CardContent>
    </Card>
  );
};

import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  iconColor?: string;
  bgColor?: string;
  subtitle?: string;
  subtitleSize?: 'small' | 'large';
}

export function StatsCard({ title, value, icon: Icon, trend, iconColor = "text-primary", bgColor = "bg-primary/10", subtitle, subtitleSize = 'small' }: StatsCardProps) {
  return (
    <Card className="relative overflow-hidden bg-gradient-card shadow-card border-border/50 hover:shadow-md transition-all duration-300">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${bgColor} ${iconColor}`}>
              <Icon className="w-6 h-6" />
            </div>
            {subtitle && subtitleSize === 'large' && (
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${bgColor} ${iconColor}`}>
                <span className="text-2xl font-bold">{subtitle}</span>
              </div>
            )}
          </div>
          {trend && (
            <span className={`text-sm font-medium ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-primary opacity-50" />
    </Card>
  );
}

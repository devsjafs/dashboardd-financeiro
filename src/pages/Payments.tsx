import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { usePayments } from "@/hooks/usePayments";
import { PaymentStatsCard } from "@/components/payments/PaymentStatsCard";
import { PaymentsTable } from "@/components/payments/PaymentsTable";
import { PaymentDialog } from "@/components/payments/PaymentDialog";
import { PaymentBankDialog } from "@/components/payments/PaymentBankDialog";
import { Payment } from "@/types/payment";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Payments = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | undefined>();
  const [markingPaymentId, setMarkingPaymentId] = useState<string | undefined>();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  const {
    payments,
    isLoading,
    createPayment,
    updatePayment,
    deletePayment,
    markAsPaid,
    markAsUnpaid,
  } = usePayments();

  // Filter payments by selected month
  const filteredPayments = payments.filter((payment) => {
    const paymentMonth = payment.vencimento.slice(0, 7);
    return paymentMonth === selectedMonth;
  });

  const editingPayment = payments.find((p) => p.id === editingPaymentId);

  // Calculate stats
  const totalValue = filteredPayments.reduce((sum, p) => sum + Number(p.valor), 0);
  const paidValue = filteredPayments
    .filter((p) => p.status === "pago")
    .reduce((sum, p) => sum + Number(p.valor), 0);
  const unpaidValue = filteredPayments
    .filter((p) => p.status === "não pago")
    .reduce((sum, p) => sum + Number(p.valor), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleEdit = (paymentId: string) => {
    setEditingPaymentId(paymentId);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deletePayment.mutate(id);
  };

  const handleMarkAsPaid = (id: string, banco?: string) => {
    if (banco !== undefined) {
      // Called from table with banco parameter
      markAsPaid.mutate({ id, banco });
    } else {
      // Open dialog to get banco
      setMarkingPaymentId(id);
      setBankDialogOpen(true);
    }
  };

  const handleBankConfirm = (banco: string) => {
    if (markingPaymentId) {
      markAsPaid.mutate({ id: markingPaymentId, banco });
      setMarkingPaymentId(undefined);
    }
  };

  const handleMarkAsUnpaid = (id: string) => {
    markAsUnpaid.mutate(id);
  };

  // Generate month options (starting from November 2025, going 12 months forward)
  const generateMonthOptions = () => {
    const options = [];
    const startDate = new Date(2025, 10, 1); // November 2025 (month is 0-indexed)
    for (let i = 0; i <= 12; i++) {
      const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Pagamentos</h1>
          <p className="text-muted-foreground">
            Gerencie suas despesas e acompanhe os pagamentos
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtrar por mês:</span>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {generateMonthOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => {
              setEditingPaymentId(undefined);
              setDialogOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Despesa
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PaymentStatsCard title="Total" value={formatCurrency(totalValue)} />
        <PaymentStatsCard
          title="Pago"
          value={formatCurrency(paidValue)}
          valueColor="text-green-500"
        />
        <PaymentStatsCard
          title="Não Pago"
          value={formatCurrency(unpaidValue)}
          valueColor="text-red-500"
        />
      </div>

      {/* Payments Table */}
      <PaymentsTable
        payments={filteredPayments}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onMarkAsPaid={handleMarkAsPaid}
        onMarkAsUnpaid={handleMarkAsUnpaid}
      />

      {/* Payment Dialog */}
      <PaymentDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingPaymentId(undefined);
        }}
        payment={editingPayment}
        onSave={async (paymentData, meses) => {
          if (editingPayment) {
            await updatePayment.mutateAsync({
              ...paymentData,
              id: editingPayment.id,
              created_at: editingPayment.created_at,
              updated_at: editingPayment.updated_at,
            });
          } else {
            // If recurrent and meses is specified, create multiple payments
            if (paymentData.recorrente && meses && meses > 1) {
              const payments = [];
              const baseDate = new Date(paymentData.vencimento.split('T')[0]);
              
              for (let i = 0; i < meses; i++) {
                const newDate = new Date(baseDate);
                
                if (paymentData.intervalo_recorrencia === 'semanal') {
                  newDate.setDate(newDate.getDate() + (i * 7));
                } else if (paymentData.intervalo_recorrencia === 'mensal') {
                  newDate.setMonth(newDate.getMonth() + i);
                } else if (paymentData.intervalo_recorrencia === 'trimestral') {
                  newDate.setMonth(newDate.getMonth() + (i * 3));
                } else if (paymentData.intervalo_recorrencia === 'semestral') {
                  newDate.setMonth(newDate.getMonth() + (i * 6));
                } else if (paymentData.intervalo_recorrencia === 'anual') {
                  newDate.setFullYear(newDate.getFullYear() + i);
                }
                
                payments.push({
                  ...paymentData,
                  vencimento: newDate.toISOString().split('T')[0],
                });
              }
              
              for (const payment of payments) {
                await createPayment.mutateAsync(payment);
              }
            } else {
              await createPayment.mutateAsync(paymentData);
            }
          }
          setDialogOpen(false);
          setEditingPaymentId(undefined);
        }}
      />

      {/* Bank Dialog */}
      <PaymentBankDialog
        open={bankDialogOpen}
        onOpenChange={setBankDialogOpen}
        onConfirm={handleBankConfirm}
      />
    </div>
  );
};

export default Payments;

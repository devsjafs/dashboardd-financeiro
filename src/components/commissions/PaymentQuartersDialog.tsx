import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CheckCircle, Edit } from "lucide-react";
import { useCommissions } from "@/hooks/useCommissions";
import { CommissionPayment } from "@/types/commission";
import { TrimestreDetailsDialog } from "./TrimestreDetailsDialog";

interface PaymentQuartersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commissionId: string | null;
  payments: CommissionPayment[];
}

export function PaymentQuartersDialog({
  open,
  onOpenChange,
  commissionId,
  payments,
}: PaymentQuartersDialogProps) {
  const { markPaymentAsPaid, markPaymentAsUnpaid } = useCommissions();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<CommissionPayment | null>(null);

  const handleMarkAsPaid = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
  };

  const confirmPayment = () => {
    if (selectedPaymentId && selectedDate) {
      markPaymentAsPaid.mutate({
        id: selectedPaymentId,
        data_pagamento: format(selectedDate, "yyyy-MM-dd"),
      });
      setSelectedPaymentId(null);
      setSelectedDate(undefined);
    }
  };

  const handleMarkAsUnpaid = (paymentId: string) => {
    markPaymentAsUnpaid.mutate(paymentId);
  };

  const handleOpenDetails = (payment: CommissionPayment) => {
    setSelectedPayment(payment);
    setDetailsDialogOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Pagamentos Trimestrais</DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trimestre</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Pagamento</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.trimestre_numero}º</TableCell>
                  <TableCell>
                    {format(new Date(payment.inicio_trimestre), "MMM/yyyy", { locale: ptBR })} -{" "}
                    {format(new Date(payment.fim_trimestre), "MMM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    {format(new Date(payment.data_vencimento), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(payment.preco)}
                  </TableCell>
                  <TableCell>
                    {payment.pago ? (
                      <Badge
                        className="bg-success hover:bg-success/80 cursor-pointer"
                        onClick={() => handleMarkAsUnpaid(payment.id)}
                      >
                        Pago
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Pendente</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {payment.data_pagamento
                      ? format(new Date(payment.data_pagamento), "dd/MM/yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDetails(payment)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    {!payment.pago && (
                      <Popover
                        open={selectedPaymentId === payment.id}
                        onOpenChange={(open) => {
                          if (!open) {
                            setSelectedPaymentId(null);
                            setSelectedDate(undefined);
                          }
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsPaid(payment.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Marcar como pago
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <div className="p-3">
                            <p className="text-sm font-medium mb-2">
                              Selecione a data do pagamento:
                            </p>
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={setSelectedDate}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                            <div className="flex justify-end gap-2 mt-3">
                              <Button
                                size="sm"
                                disabled={!selectedDate}
                                onClick={confirmPayment}
                              >
                                Confirmar
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
      
      <TrimestreDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        payment={selectedPayment}
      />
    </Dialog>
  );
}

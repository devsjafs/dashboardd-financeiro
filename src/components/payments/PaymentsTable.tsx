import { Payment } from "@/types/payment";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PaymentsTableProps {
  payments: Payment[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMarkAsPaid: (id: string) => void;
  onMarkAsUnpaid: (id: string) => void;
}

export const PaymentsTable = ({ payments, onEdit, onDelete, onMarkAsPaid, onMarkAsUnpaid }: PaymentsTableProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descrição</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data Pagamento</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Nenhum pagamento cadastrado
              </TableCell>
            </TableRow>
          ) : (
            payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-medium">{payment.descricao}</TableCell>
                <TableCell>{formatDate(payment.vencimento)}</TableCell>
                <TableCell>{formatCurrency(payment.valor)}</TableCell>
                <TableCell>
                  {payment.status === "não pago" ? (
                    <Badge
                      variant="destructive"
                      className="cursor-pointer hover:opacity-80"
                      onClick={() => onMarkAsPaid(payment.id)}
                    >
                      Não Pago
                    </Badge>
                  ) : (
                    <Badge 
                      variant="default" 
                      className="bg-green-500 hover:bg-green-600 cursor-pointer"
                      onClick={() => onMarkAsUnpaid(payment.id)}
                    >
                      Pago
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {payment.data_pagamento ? formatDate(payment.data_pagamento) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(payment.id)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(payment.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

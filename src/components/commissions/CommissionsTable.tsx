import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useCommissions } from "@/hooks/useCommissions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PaymentQuartersDialog } from "./PaymentQuartersDialog";

interface CommissionsTableProps {
  commissions: any[];
  payments: any[];
  onEdit: (id: string) => void;
}

export function CommissionsTable({ commissions, payments, onEdit }: CommissionsTableProps) {
  const { deleteCommission } = useCommissions();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedCommissionId, setSelectedCommissionId] = useState<string | null>(null);

  const handleDelete = () => {
    if (deleteId) {
      deleteCommission.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const getCommissionPayments = (commissionId: string) => {
    return payments.filter(p => p.commission_id === commissionId);
  };

  const getPaymentStatus = (commissionId: string) => {
    const commissionPayments = getCommissionPayments(commissionId);
    const paidCount = commissionPayments.filter(p => p.pago).length;
    const totalCount = commissionPayments.length;
    return { paidCount, totalCount };
  };

  return (
    <>
      <Card className="bg-gradient-card shadow-card border-border/50">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-muted/30">
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>% Comissão</TableHead>
                <TableHead>Valor Base</TableHead>
                <TableHead>Pagamentos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((commission) => {
                const { paidCount, totalCount } = getPaymentStatus(commission.id);
                return (
                  <TableRow key={commission.id} className="border-border/50 hover:bg-muted/20">
                    <TableCell className="font-medium">
                      {commission.clients?.nome_fantasia || "N/A"}
                    </TableCell>
                    <TableCell>{commission.vendedor}</TableCell>
                    <TableCell>
                      {format(new Date(commission.inicio_periodo), "MMM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{commission.duracao_meses} meses</Badge>
                    </TableCell>
                    <TableCell>{commission.percentual_comissao}%</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(commission.valor_base)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCommissionId(commission.id)}
                      >
                        {paidCount}/{totalCount} trimestres
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(commission.id)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(commission.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {commissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Nenhuma comissão cadastrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta comissão? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PaymentQuartersDialog
        open={!!selectedCommissionId}
        onOpenChange={() => setSelectedCommissionId(null)}
        commissionId={selectedCommissionId}
        payments={selectedCommissionId ? getCommissionPayments(selectedCommissionId) : []}
      />
    </>
  );
}

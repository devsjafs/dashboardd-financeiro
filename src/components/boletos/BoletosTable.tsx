import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { BoletoWithClient } from "@/types/boleto";
import { formatDateString } from "@/lib/utils";

interface BoletosTableProps {
  boletos: BoletoWithClient[];
  onEdit: (boleto: BoletoWithClient) => void;
  onDelete: (id: string) => void;
  onMarkAsPaid: (id: string) => void;
  onMarkAsUnpaid: (id: string) => void;
}

export const BoletosTable = ({
  boletos,
  onEdit,
  onDelete,
  onMarkAsPaid,
  onMarkAsUnpaid,
}: BoletosTableProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatCompetencia = (competencia: string) => {
    if (!competencia) return "-";
    const [year, month] = competencia.split("-");
    return `${month}/${year}`;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>CPF/CNPJ</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Competência</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data Pagamento</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {boletos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground">
                Nenhum boleto cadastrado
              </TableCell>
            </TableRow>
          ) : (
            boletos.map((boleto) => (
              <TableRow key={boleto.id}>
                <TableCell className="font-medium">{boleto.clients.nome_fantasia}</TableCell>
                <TableCell>{boleto.clients.cnpj}</TableCell>
                <TableCell>{boleto.categoria}</TableCell>
                <TableCell>{formatCompetencia(boleto.competencia)}</TableCell>
                <TableCell>{formatDateString(boleto.vencimento)}</TableCell>
                <TableCell>{formatCurrency(boleto.valor)}</TableCell>
                <TableCell>
                  <Badge
                    variant={boleto.status === "pago" ? "default" : "destructive"}
                    className="cursor-pointer"
                    onClick={() =>
                      boleto.status === "pago"
                        ? onMarkAsUnpaid(boleto.id)
                        : onMarkAsPaid(boleto.id)
                    }
                  >
                    {boleto.status === "pago" ? "PAGO" : "NÃO PAGO"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {boleto.data_pagamento ? formatDateString(boleto.data_pagamento) : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(boleto)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(boleto.id)}
                    >
                      <Trash2 className="h-4 w-4" />
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

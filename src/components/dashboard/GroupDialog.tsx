import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClientsTable } from "./ClientsTable";
import { Client } from "@/types/client";

interface GroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  clients: Client[];
  onEdit: (clientId: string) => void;
  onDelete: (clientId: string) => void;
}

export const GroupDialog = ({
  open,
  onOpenChange,
  groupName,
  clients,
  onEdit,
  onDelete,
}: GroupDialogProps) => {
  const totalRevenue = clients.reduce((sum, c) => {
    return sum + c.valorMensalidade.smart + c.valorMensalidade.apoio + 
           c.valorMensalidade.contabilidade + c.valorMensalidade.personalite;
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {groupName}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            {clients.length} {clients.length === 1 ? 'empresa' : 'empresas'} • {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(totalRevenue)} total
          </div>
        </DialogHeader>
        <div className="mt-4">
          <ClientsTable clients={clients} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

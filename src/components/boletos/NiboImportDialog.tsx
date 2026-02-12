import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface NiboImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (connectionId?: string) => void;
  importing: boolean;
}

interface NiboConnection {
  id: string;
  nome: string;
}

export const NiboImportDialog = ({ open, onOpenChange, onImport, importing }: NiboImportDialogProps) => {
  const [connections, setConnections] = useState<NiboConnection[]>([]);
  const [selected, setSelected] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadConnections();
    }
  }, [open]);

  const loadConnections = async () => {
    setLoading(true);
    const { data } = await supabase.from("nibo_connections").select("id, nome").order("created_at");
    setConnections((data as NiboConnection[]) || []);
    setSelected("all");
    setLoading(false);
  };

  const handleImport = () => {
    onImport(selected === "all" ? undefined : selected);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar do Nibo</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground py-4">Carregando conexões...</p>
        ) : connections.length === 0 ? (
          <p className="text-muted-foreground py-4">
            Nenhuma conexão Nibo cadastrada. Vá em Configurações para adicionar.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Selecione de qual conexão importar os boletos vencidos:</p>
            <RadioGroup value={selected} onValueChange={setSelected}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all">Todas as conexões</Label>
              </div>
              {connections.map((conn) => (
                <div className="flex items-center space-x-2" key={conn.id}>
                  <RadioGroupItem value={conn.id} id={conn.id} />
                  <Label htmlFor={conn.id}>{conn.nome}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleImport} disabled={importing || connections.length === 0}>
            {importing ? "Importando..." : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

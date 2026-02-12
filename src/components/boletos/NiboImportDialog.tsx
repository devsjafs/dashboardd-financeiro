import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface ImportProgress {
  current: number;
  total: number;
  imported: number;
  skipped: number;
}

interface NiboImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (connectionId?: string) => void;
  importing: boolean;
  progress: ImportProgress | null;
}

interface NiboConnection {
  id: string;
  nome: string;
}

export const NiboImportDialog = ({ open, onOpenChange, onImport, importing, progress }: NiboImportDialogProps) => {
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

  const percentage = progress && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={importing ? undefined : onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar do Nibo</DialogTitle>
          <DialogDescription>
            Selecione a conexão e importe os boletos vencidos automaticamente.
          </DialogDescription>
        </DialogHeader>

        {importing && progress ? (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">{percentage}%</p>
              <p className="text-sm text-muted-foreground mt-1">
                Processando {progress.current} de {progress.total} boletos
              </p>
            </div>
            <Progress value={percentage} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span className="text-green-600">{progress.imported} importados</span>
              <span className="text-orange-500">{progress.skipped} ignorados</span>
            </div>
          </div>
        ) : loading ? (
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

        {!importing && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleImport} disabled={connections.length === 0}>
              Importar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

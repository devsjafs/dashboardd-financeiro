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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ImportLogEntry } from "@/hooks/useNiboImport";

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
  importLog: ImportLogEntry[];
  onClearLog: () => void;
}

interface NiboConnection {
  id: string;
  nome: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDoc = (doc: string) => {
  if (!doc) return "—";
  if (doc.length === 14) return doc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  if (doc.length === 11) return doc.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  return doc;
};

export const NiboImportDialog = ({ open, onOpenChange, onImport, importing, progress, importLog, onClearLog }: NiboImportDialogProps) => {
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
    // Use the safe view that excludes sensitive API credentials (api_token, api_key)
    const { data } = await (supabase as any).from("nibo_connections_safe").select("id, nome").order("created_at");
    setConnections((data as NiboConnection[]) || []);
    setSelected("all");
    setLoading(false);
  };

  const handleImport = () => {
    onImport(selected === "all" ? undefined : selected);
  };

  const handleClose = () => {
    onClearLog();
    onOpenChange(false);
  };

  const percentage = progress && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const isFinished = !importing && importLog.length > 0;

  return (
    <Dialog open={open} onOpenChange={importing ? undefined : handleClose}>
      <DialogContent className="max-w-2xl" style={{ maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <DialogHeader>
          <DialogTitle>Importar do Nibo</DialogTitle>
          <DialogDescription>
            {isFinished
              ? "Importação concluída. Veja o resultado abaixo."
              : "Selecione a conexão e importe os boletos vencidos automaticamente."}
          </DialogDescription>
        </DialogHeader>

        {(importing || isFinished) && progress ? (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: "1rem" }}>
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">{percentage}%</p>
              <p className="text-sm text-muted-foreground mt-1">
                {importing
                  ? `Processando ${progress.current} de ${progress.total} boletos`
                  : `${progress.total} boletos processados`}
              </p>
            </div>
            <Progress value={percentage} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span className="text-green-600 font-medium">{progress.imported} importados</span>
              <span className="text-orange-500 font-medium">{progress.skipped} ignorados</span>
            </div>

            {importLog.length > 0 && (
              <div style={{ flex: 1, minHeight: 0, maxHeight: "400px", overflowY: "auto", border: "1px solid hsl(var(--border))", borderRadius: "0.375rem" }}>
                <div className="p-2 space-y-1">
                  {importLog.map((entry, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-2 p-2 rounded text-xs ${
                        entry.status === "imported"
                          ? "bg-green-50 dark:bg-green-950/30"
                          : "bg-orange-50 dark:bg-orange-950/30"
                      }`}
                    >
                      <Badge
                        variant={entry.status === "imported" ? "default" : "secondary"}
                        className={`shrink-0 text-[10px] ${
                          entry.status === "imported"
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-orange-500 hover:bg-orange-600 text-white"
                        }`}
                      >
                        {entry.status === "imported" ? "OK" : "SKIP"}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{entry.stakeholderName}</p>
                        <p className="text-muted-foreground">
                          Doc: {formatDoc(entry.stakeholderDoc)} · {formatCurrency(entry.value)} · Venc: {entry.dueDate}
                        </p>
                        {entry.reason && (
                          <p className="text-orange-600 dark:text-orange-400 mt-0.5">
                            Motivo: {entry.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            <Button variant="outline" onClick={handleClose}>
              {isFinished ? "Fechar" : "Cancelar"}
            </Button>
            {!isFinished && (
              <Button onClick={handleImport} disabled={connections.length === 0}>
                Importar
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

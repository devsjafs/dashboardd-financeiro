import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import { useRef } from "react";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (file: File) => void;
  onDownloadTemplate: () => void;
  title: string;
  description: string;
}

export const ImportDialog = ({
  open,
  onOpenChange,
  onImport,
  onDownloadTemplate,
  title,
  description,
}: ImportDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
      onOpenChange(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">{description}</p>
          
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              onClick={onDownloadTemplate}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Baixar Modelo XLSX
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Selecionar Arquivo XLSX
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

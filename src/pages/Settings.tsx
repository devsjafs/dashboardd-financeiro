import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const { toast } = useToast();
  const [niboToken, setNiboToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["nibo_api_token"]);

    if (data) {
      for (const row of data) {
        if (row.key === "nibo_api_token") setNiboToken(row.value);
      }
    }
    setLoading(false);
  };

  const saveSetting = async (key: string, value: string) => {
    const { data: existing } = await supabase
      .from("settings")
      .select("id")
      .eq("key", key)
      .single();

    if (existing) {
      await supabase.from("settings").update({ value }).eq("key", key);
    } else {
      await supabase.from("settings").insert({ key, value });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSetting("nibo_api_token", niboToken);
      toast({ title: "Sucesso", description: "Configurações salvas com sucesso." });
    } catch {
      toast({ title: "Erro", description: "Erro ao salvar configurações.", variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as integrações e configurações do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integração Nibo</CardTitle>
          <CardDescription>
            Configure o token da API do Nibo para importar boletos automaticamente.
            O token pode ser encontrado em: Sua Empresa → Mais opções → Configurações → API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nibo-token">API Token</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="nibo-token"
                  type={showToken ? "text" : "password"}
                  value={niboToken}
                  onChange={(e) => setNiboToken(e.target.value)}
                  placeholder="Cole seu token da API do Nibo aqui"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;

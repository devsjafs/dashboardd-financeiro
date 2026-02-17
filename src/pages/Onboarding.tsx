import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Loader2, LogOut, Clock } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";

export default function Onboarding() {
  const [orgName, setOrgName] = useState("");
  const [mode, setMode] = useState<"choose" | "create">("choose");
  const { createOrganization } = useOrganization();
  const { signOut, refreshOrganization } = useAuth();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    await createOrganization.mutateAsync(orgName.trim());
    await refreshOrganization();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Bem-vindo!
          </h1>
          <p className="text-muted-foreground">
            Para começar, crie uma organização ou aguarde um convite.
          </p>
        </div>

        {mode === "choose" ? (
          <Card className="border-border/50 shadow-xl">
            <CardContent className="pt-6 space-y-4">
              <Button
                className="w-full gap-2"
                onClick={() => setMode("create")}
              >
                <Building2 className="h-4 w-4" />
                Criar nova organização
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou</span>
                </div>
              </div>
              <div className="text-center space-y-3 py-4">
                <Clock className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Se você recebeu um convite, faça login com o email convidado.
                  O acesso será concedido automaticamente.
                </p>
                <Button variant="outline" size="sm" onClick={refreshOrganization} className="gap-2">
                  <Loader2 className="h-3 w-3" /> Verificar convite
                </Button>
              </div>
              <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={signOut}>
                <LogOut className="h-4 w-4" /> Sair
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle>Criar Organização</CardTitle>
              <CardDescription>
                Sua organização agrupa todos os dados da empresa. Outros usuários podem ser convidados depois.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Nome da organização</Label>
                  <Input
                    id="orgName"
                    placeholder="Ex: Minha Empresa Ltda"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" type="button" onClick={() => setMode("choose")} className="flex-1">
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createOrganization.isPending}
                  >
                    {createOrganization.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      "Criar organização"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

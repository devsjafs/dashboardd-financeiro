import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Send, AlertCircle } from "lucide-react";
import { useBoletos } from "@/hooks/useBoletos";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDateString } from "@/lib/utils";

const Emails = () => {
  const { boletos, isLoading } = useBoletos();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [selectedBoletos, setSelectedBoletos] = useState<string[]>([]);

  // Filtrar apenas boletos em atraso e não pagos
  const today = new Date().toISOString().slice(0, 10);
  const overdueBoletos = boletos?.filter(
    (boleto) => boleto.status === "não pago" && boleto.vencimento < today
  ) || [];

  // Agrupar boletos por cliente
  const boletosByClient = overdueBoletos.reduce((acc, boleto) => {
    const clientId = boleto.client_id;
    if (!acc[clientId]) {
      acc[clientId] = {
        client: boleto.clients,
        boletos: [],
      };
    }
    acc[clientId].boletos.push(boleto);
    return acc;
  }, {} as Record<string, { client: any; boletos: typeof overdueBoletos }>);

  const toggleBoleto = (boletoId: string) => {
    setSelectedBoletos((prev) =>
      prev.includes(boletoId)
        ? prev.filter((id) => id !== boletoId)
        : [...prev, boletoId]
    );
  };

  const toggleAllClient = (clientId: string) => {
    const clientBoletoIds = boletosByClient[clientId].boletos.map((b) => b.id);
    const allSelected = clientBoletoIds.every((id) => selectedBoletos.includes(id));
    
    if (allSelected) {
      setSelectedBoletos((prev) => prev.filter((id) => !clientBoletoIds.includes(id)));
    } else {
      setSelectedBoletos((prev) => [...new Set([...prev, ...clientBoletoIds])]);
    }
  };

  const handleSendEmails = async () => {
    if (selectedBoletos.length === 0) {
      toast({
        title: "Atenção",
        description: "Selecione pelo menos um boleto para enviar",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-overdue-emails", {
        body: { boletoIds: selectedBoletos },
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${data.sent} email(s) enviado(s) com sucesso`,
      });
      setSelectedBoletos([]);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar emails",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const calculateDaysOverdue = (vencimento: string) => {
    const due = new Date(vencimento);
    const today = new Date();
    const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <p>Carregando...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gestão de Emails</h1>
            <p className="text-muted-foreground">Envie emails de cobrança para boletos em atraso</p>
          </div>
          <Button onClick={handleSendEmails} disabled={sending || selectedBoletos.length === 0}>
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Enviando..." : `Enviar Emails (${selectedBoletos.length})`}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Boletos em Atraso
            </CardTitle>
            <CardDescription>
              {overdueBoletos.length} boleto(s) pendente(s) de pagamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.entries(boletosByClient).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum boleto em atraso</p>
              </div>
            ) : (
              <div className="space-y-6">
                {(Object.entries(boletosByClient) as [string, { client: any; boletos: typeof overdueBoletos }][]).map(([clientId, { client, boletos }]) => {
                  const clientTotal = boletos.reduce((sum, b) => sum + Number(b.valor), 0);
                  const allSelected = boletos.every((b) => selectedBoletos.includes(b.id));

                  return (
                    <Card key={clientId}>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle className="text-lg">{client.nome_fantasia}</CardTitle>
                            <CardDescription>
                              {client.email || "Email não cadastrado"} • Total em atraso: {formatCurrency(clientTotal)}
                            </CardDescription>
                          </div>
                          <Button
                            variant={allSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleAllClient(clientId)}
                            disabled={!client.email}
                          >
                            {allSelected ? "Desmarcar Todos" : "Selecionar Todos"}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12"></TableHead>
                              <TableHead>Categoria</TableHead>
                              <TableHead>Competência</TableHead>
                              <TableHead>Vencimento</TableHead>
                              <TableHead>Dias em Atraso</TableHead>
                              <TableHead>Valor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {boletos.map((boleto) => {
                              const daysOverdue = calculateDaysOverdue(boleto.vencimento);
                              return (
                                <TableRow key={boleto.id}>
                                  <TableCell>
                                    <input
                                      type="checkbox"
                                      checked={selectedBoletos.includes(boleto.id)}
                                      onChange={() => toggleBoleto(boleto.id)}
                                      disabled={!client.email}
                                      className="h-4 w-4"
                                    />
                                  </TableCell>
                                  <TableCell>{boleto.categoria}</TableCell>
                                  <TableCell>{boleto.competencia}</TableCell>
                                  <TableCell>{formatDateString(boleto.vencimento)}</TableCell>
                                  <TableCell>
                                    <Badge variant="destructive">
                                      {daysOverdue} {daysOverdue === 1 ? "dia" : "dias"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-medium">{formatCurrency(boleto.valor)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Emails;

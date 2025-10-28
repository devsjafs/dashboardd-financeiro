import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import * as z from "zod";
import { Client, ClientStatus, ServiceType, ClientSituacao } from "@/types/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  codigo: z.string().min(1, "Código é obrigatório"),
  nomeFantasia: z.string().min(1, "Nome fantasia é obrigatório"),
  razaoSocial: z.string().min(1, "Razão social é obrigatória"),
  cnpj: z.string().regex(/^\d{14}$/, "CNPJ deve ter 14 dígitos"),
  valorSmart: z.coerce.number().min(0, "Valor deve ser positivo"),
  valorApoio: z.coerce.number().min(0, "Valor deve ser positivo"),
  valorContabilidade: z.coerce.number().min(0, "Valor deve ser positivo"),
  valorPersonalite: z.coerce.number().min(0, "Valor deve ser positivo"),
  vencimento: z.coerce.number().min(1).max(31, "Dia inválido"),
  inicioCompetencia: z.string().regex(/^\d{4}-\d{2}$/, "Formato inválido (AAAA-MM)"),
  ultimaCompetencia: z.string().regex(/^\d{4}-\d{2}$/, "Formato inválido (AAAA-MM)").optional().or(z.literal("")),
  services: z.array(z.enum(["smart", "apoio", "contabilidade", "personalite"])).min(1, "Selecione pelo menos um serviço"),
  situacao: z.enum(["mes-vencido", "mes-corrente", "anual"]),
  status: z.enum(["ativo", "inativo", "sem-faturamento", "ex-cliente", "suspenso"]),
});

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client;
  onSave: (client: Omit<Client, "id" | "createdAt" | "updatedAt">) => Promise<void>;
}

export function ClientDialog({ open, onOpenChange, client, onSave }: ClientDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo: "",
      nomeFantasia: "",
      razaoSocial: "",
      cnpj: "",
      valorSmart: 0,
      valorApoio: 0,
      valorContabilidade: 0,
      valorPersonalite: 0,
      vencimento: 10,
      inicioCompetencia: "",
      ultimaCompetencia: "",
      services: [],
      situacao: "mes-corrente",
      status: "ativo",
    },
  });

  useEffect(() => {
    if (client) {
      form.reset({
        codigo: client.codigo,
        nomeFantasia: client.nomeFantasia,
        razaoSocial: client.razaoSocial,
        cnpj: client.cnpj,
        valorSmart: client.valorMensalidade.smart,
        valorApoio: client.valorMensalidade.apoio,
        valorContabilidade: client.valorMensalidade.contabilidade,
        valorPersonalite: client.valorMensalidade.personalite,
        vencimento: client.vencimento,
        inicioCompetencia: client.inicioCompetencia,
        ultimaCompetencia: client.ultimaCompetencia || "",
        services: client.services,
        situacao: client.situacao,
        status: client.status,
      });
    } else {
      form.reset({
        codigo: "",
        nomeFantasia: "",
        razaoSocial: "",
        cnpj: "",
        valorSmart: 0,
        valorApoio: 0,
        valorContabilidade: 0,
        valorPersonalite: 0,
        vencimento: 10,
        inicioCompetencia: "",
        ultimaCompetencia: "",
        services: [],
        situacao: "mes-corrente",
        status: "ativo",
      });
    }
  }, [client, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSave({
      codigo: values.codigo,
      nomeFantasia: values.nomeFantasia,
      razaoSocial: values.razaoSocial,
      cnpj: values.cnpj,
      valorMensalidade: {
        smart: values.valorSmart,
        apoio: values.valorApoio,
        contabilidade: values.valorContabilidade,
        personalite: values.valorPersonalite,
      },
      vencimento: values.vencimento,
      inicioCompetencia: values.inicioCompetencia,
      ultimaCompetencia: values.ultimaCompetencia || undefined,
      services: values.services as ServiceType[],
      situacao: values.situacao as ClientSituacao,
      status: values.status as ClientStatus,
    });
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          <DialogDescription>
            Preencha os dados do cliente abaixo
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="00000000000000" maxLength={14} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nomeFantasia"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nome Fantasia</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="razaoSocial"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Razão Social</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valorSmart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Smart (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valorApoio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Apoio (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valorContabilidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Contabilidade (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valorPersonalite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Personalite (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vencimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia Vencimento</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={31} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="inicioCompetencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início Competência</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="2024-01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ultimaCompetencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Última Competência</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="2024-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="services"
                render={() => (
                  <FormItem className="col-span-2">
                    <FormLabel>Serviços</FormLabel>
                    <div className="flex flex-wrap gap-4">
                      {(['smart', 'apoio', 'contabilidade', 'personalite'] as const).map((service) => (
                        <FormField
                          key={service}
                          control={form.control}
                          name="services"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(service)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, service])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== service)
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal capitalize cursor-pointer">
                                {service}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="situacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Situação</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mes-vencido">Mês Vencido</SelectItem>
                        <SelectItem value="mes-corrente">Mês Corrente</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                        <SelectItem value="sem-faturamento">Sem Faturamento</SelectItem>
                        <SelectItem value="ex-cliente">Ex-Cliente</SelectItem>
                        <SelectItem value="suspenso">Suspenso</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {client ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

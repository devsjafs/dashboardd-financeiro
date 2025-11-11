export type Boleto = {
  id: string;
  client_id: string;
  valor: number;
  vencimento: string;
  competencia: string;
  categoria: string;
  status: "pago" | "não pago";
  data_pagamento: string | null;
  created_at: string;
  updated_at: string;
};

export type BoletoFormData = Omit<Boleto, "id" | "created_at" | "updated_at">;

export type BoletoWithClient = Boleto & {
  clients: {
    nome_fantasia: string;
    cnpj: string;
    email: string | null;
  };
};

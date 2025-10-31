export type Payment = {
  id: string;
  descricao: string;
  vencimento: string;
  valor: number;
  status: "pago" | "não pago";
  data_pagamento: string | null;
  recorrente: boolean;
  intervalo_recorrencia: "mensal" | "semanal" | "trimestral" | "semestral" | "anual" | null;
  banco: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentFormData = Omit<Payment, "id" | "created_at" | "updated_at">;

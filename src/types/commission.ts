export interface Commission {
  id: string;
  client_id: string;
  vendedor: string;
  inicio_periodo: string;
  duracao_meses: 12 | 24;
  percentual_comissao: number;
  valor_base: number;
  created_at: string;
  updated_at: string;
}

export interface CommissionPayment {
  id: string;
  commission_id: string;
  trimestre_numero: number;
  inicio_trimestre: string;
  fim_trimestre: string;
  data_vencimento: string;
  preco: number;
  pago: boolean;
  data_pagamento: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommissionWithDetails extends Commission {
  cliente?: {
    nome_fantasia: string;
    codigo: string;
  };
  payments?: CommissionPayment[];
}

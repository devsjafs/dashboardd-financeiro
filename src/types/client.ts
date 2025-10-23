export type ClientStatus = 'ativo' | 'inativo' | 'sem-faturamento' | 'ex-cliente' | 'suspenso';

export type ClientSituation = 'mes-vencido' | 'mes-corrente' | 'anual';

export type ServiceType = 'smart' | 'apoio' | 'contabilidade';

export interface MonthlyValue {
  smart: number;
  apoio: number;
  contabilidade: number;
}

export interface Client {
  id: string;
  codigo: string;
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  valorMensalidade: MonthlyValue;
  vencimento: number; // dia do mês
  inicioCompetencia: string; // formato: YYYY-MM
  ultimaCompetencia?: string; // formato: YYYY-MM
  situacao: ClientSituation;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
}

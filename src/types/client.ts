export type ClientStatus = 'ativo' | 'inativo' | 'sem-faturamento' | 'ex-cliente' | 'suspenso';

export type ServiceType = 'smart' | 'apoio' | 'contabilidade' | 'personalite';

export type ClientSituacao = 'mes-vencido' | 'mes-corrente' | 'anual' | 'mes-corrente-vencido';

export type DocumentType = 'cnpj' | 'cpf' | 'caepf';

export interface MonthlyValue {
  smart: number;
  apoio: number;
  contabilidade: number;
  personalite: number;
}

export interface Client {
  id: string;
  codigo: string;
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  documentType: DocumentType;
  valorMensalidade: MonthlyValue;
  vencimento: number; // dia do mês
  inicioCompetencia: string; // formato: YYYY-MM
  ultimaCompetencia?: string; // formato: YYYY-MM
  services: ServiceType[];
  situacao: ClientSituacao;
  status: ClientStatus;
  grupo?: string;
  email?: string;
  ultimoReajuste?: string; // formato: YYYY-MM-DD
  periodoReajusteMeses: number; // default 12
  createdAt: string;
  updatedAt: string;
}

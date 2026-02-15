
ALTER TABLE public.clients
ADD COLUMN ultimo_reajuste date,
ADD COLUMN periodo_reajuste_meses integer DEFAULT 12;

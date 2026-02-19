ALTER TABLE public.boletos ADD COLUMN nibo_schedule_id TEXT;
CREATE INDEX idx_boletos_nibo_schedule_id ON public.boletos(nibo_schedule_id);
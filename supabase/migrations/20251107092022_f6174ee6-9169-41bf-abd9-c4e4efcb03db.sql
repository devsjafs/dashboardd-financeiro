-- Add extra fields to commission_payments for method, document and monthly due dates
ALTER TABLE public.commission_payments
  ADD COLUMN IF NOT EXISTS metodo_pagamento text,
  ADD COLUMN IF NOT EXISTS documento text,
  ADD COLUMN IF NOT EXISTS mes1_vencimento date,
  ADD COLUMN IF NOT EXISTS mes2_vencimento date,
  ADD COLUMN IF NOT EXISTS mes3_vencimento date;

-- Extend client change logger to capture vencimento and services changes
CREATE OR REPLACE FUNCTION public.log_client_changes()
RETURNS trigger AS $$
BEGIN
  -- Valores já existentes
  IF OLD.valor_smart IS DISTINCT FROM NEW.valor_smart THEN
    INSERT INTO public.client_history (client_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'valor_smart', OLD.valor_smart::TEXT, NEW.valor_smart::TEXT);
  END IF;
  
  IF OLD.valor_apoio IS DISTINCT FROM NEW.valor_apoio THEN
    INSERT INTO public.client_history (client_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'valor_apoio', OLD.valor_apoio::TEXT, NEW.valor_apoio::TEXT);
  END IF;
  
  IF OLD.valor_contabilidade IS DISTINCT FROM NEW.valor_contabilidade THEN
    INSERT INTO public.client_history (client_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'valor_contabilidade', OLD.valor_contabilidade::TEXT, NEW.valor_contabilidade::TEXT);
  END IF;
  
  IF OLD.valor_personalite IS DISTINCT FROM NEW.valor_personalite THEN
    INSERT INTO public.client_history (client_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'valor_personalite', OLD.valor_personalite::TEXT, NEW.valor_personalite::TEXT);
  END IF;
  
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.client_history (client_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'status', OLD.status, NEW.status);
  END IF;
  
  IF OLD.situacao IS DISTINCT FROM NEW.situacao THEN
    INSERT INTO public.client_history (client_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'situacao', OLD.situacao, NEW.situacao);
  END IF;

  -- Novos campos solicitados
  IF OLD.vencimento IS DISTINCT FROM NEW.vencimento THEN
    INSERT INTO public.client_history (client_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'vencimento', OLD.vencimento::TEXT, NEW.vencimento::TEXT);
  END IF;

  IF OLD.services IS DISTINCT FROM NEW.services THEN
    INSERT INTO public.client_history (client_id, field_name, old_value, new_value)
    VALUES (
      NEW.id,
      'services',
      array_to_string(OLD.services, ','),
      array_to_string(NEW.services, ',')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure trigger exists to log changes on clients updates
DROP TRIGGER IF EXISTS trg_log_client_changes ON public.clients;
CREATE TRIGGER trg_log_client_changes
AFTER UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.log_client_changes();
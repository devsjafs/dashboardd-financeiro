-- Corrigir função update_updated_at_column com security definer
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Corrigir função log_client_changes com security definer
CREATE OR REPLACE FUNCTION public.log_client_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Registrar mudanças em campos específicos
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
  
  RETURN NEW;
END;
$$;
-- Criar trigger para registrar histórico de alterações nos clientes
CREATE TRIGGER trigger_log_client_changes
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.log_client_changes();
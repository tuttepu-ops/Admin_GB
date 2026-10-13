-- Adds fulfillment management only to abroad tables; leaves domestic data untouched.
BEGIN;
ALTER TABLE public.abroad_orders ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.abroad_orders ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE TABLE IF NOT EXISTS public.abroad_order_status_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id text NOT NULL REFERENCES public.abroad_orders(id) ON DELETE CASCADE,
 old_status text,new_status text NOT NULL,changed_by uuid REFERENCES auth.users(id),note text,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.abroad_order_status_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS abroad_history_order_created ON public.abroad_order_status_history(order_id,created_at);
CREATE OR REPLACE FUNCTION public.admin_update_abroad_order_status(p_order_id text,p_status text,p_changed_by uuid,p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE previous text;
BEGIN
 IF p_status NOT IN ('pending','confirmed','processing','shipped','delivered','cancelled') THEN RAISE EXCEPTION 'Invalid fulfillment status'; END IF;
 SELECT fulfillment_status INTO previous FROM public.abroad_orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Abroad order not found'; END IF;
 UPDATE public.abroad_orders SET fulfillment_status=p_status,updated_at=now() WHERE id=p_order_id;
 INSERT INTO public.abroad_order_status_history(order_id,old_status,new_status,changed_by,note) VALUES(p_order_id,previous,p_status,p_changed_by,p_note);
 RETURN jsonb_build_object('id',p_order_id,'status',p_status,'region','abroad');
END $$;
REVOKE ALL ON FUNCTION public.admin_update_abroad_order_status(text,text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_abroad_order_status(text,text,uuid,text) TO service_role;
COMMIT;

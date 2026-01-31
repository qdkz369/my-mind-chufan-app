-- ============================================
-- 对公订单授信原子性：事务内校验 + 插入
-- 防止高并发下授信超支
-- ============================================

CREATE OR REPLACE FUNCTION create_corporate_delivery_order(
  p_restaurant_id UUID,
  p_company_id UUID,
  p_service_type TEXT,
  p_amount DECIMAL,
  p_product_type TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_corporate_company_name TEXT DEFAULT NULL,
  p_corporate_tax_id TEXT DEFAULT NULL,
  p_invoice_requested BOOLEAN DEFAULT FALSE,
  p_assigned_to TEXT DEFAULT NULL,
  p_worker_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  amount DECIMAL,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credit_line DECIMAL;
  v_used DECIMAL;
  v_available DECIMAL;
BEGIN
  -- 1. 锁定餐厅行并获取授信额度（FOR UPDATE 保证原子性）
  SELECT COALESCE(restaurants.credit_line, 0) INTO v_credit_line
  FROM restaurants
  WHERE restaurants.id = p_restaurant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESTAURANT_NOT_FOUND: 餐厅不存在';
  END IF;

  -- 2. 无授信或授信为 0 时跳过校验（允许下单，但需财务确认后再派单）
  IF v_credit_line IS NULL OR v_credit_line <= 0 THEN
    NULL; -- 直接进入插入
  ELSE
    -- 3. 计算已用授信（同一事务内，避免竞态）
    SELECT COALESCE(SUM(delivery_orders.amount), 0) INTO v_used
    FROM delivery_orders
    WHERE delivery_orders.restaurant_id = p_restaurant_id
      AND delivery_orders.payment_method = 'corporate'
      AND delivery_orders.payment_status = 'pending_transfer';

    v_available := v_credit_line - v_used;

    IF p_amount > v_available THEN
      RAISE EXCEPTION 'CREDIT_EXCEEDED: 授信额度不足。可用: %, 需要: %', v_available, p_amount;
    END IF;
  END IF;

  -- 4. 插入订单（与校验在同一事务内）
  RETURN QUERY
  INSERT INTO delivery_orders (
    restaurant_id,
    company_id,
    service_type,
    amount,
    product_type,
    notes,
    payment_method,
    payment_status,
    corporate_company_name,
    corporate_tax_id,
    invoice_requested,
    assigned_to,
    worker_id,
    status,
    customer_confirmed
  )
  VALUES (
    p_restaurant_id,
    p_company_id,
    COALESCE(p_service_type, '燃料配送'),
    p_amount,
    p_product_type,
    p_notes,
    'corporate',
    'pending_transfer',
    p_corporate_company_name,
    p_corporate_tax_id,
    COALESCE(p_invoice_requested, FALSE),
    p_assigned_to,
    p_worker_id,
    'pending',
    FALSE
  )
  RETURNING
    delivery_orders.id,
    delivery_orders.amount,
    delivery_orders.status,
    delivery_orders.created_at;
END;
$$;

-- 授予执行权限（Supabase 客户端需此权限调用 RPC）
GRANT EXECUTE ON FUNCTION create_corporate_delivery_order TO authenticated;
GRANT EXECUTE ON FUNCTION create_corporate_delivery_order TO anon;
GRANT EXECUTE ON FUNCTION create_corporate_delivery_order TO service_role;

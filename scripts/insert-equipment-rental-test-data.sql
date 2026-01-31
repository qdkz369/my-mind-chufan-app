-- ============================================
-- 设备租赁测试数据：租赁订单 + 可选设备租赁记录
-- 用途：Dashboard「设备租赁管理」页展示「设备租赁订单管理」列表
-- 执行：在 Supabase Dashboard → SQL Editor 中粘贴并执行本脚本
-- 说明：使用「第一个在 user_companies 中有记录的公司」作为 provider/company，
--       使该公司的用户（如 admin@test.com）登录后能看到本条数据
-- ============================================

DO $$
DECLARE
  v_company_id UUID;
  v_restaurant_id UUID;
  v_order_id UUID;
  v_order_number TEXT;
BEGIN
  -- 1. 获取「有用户关联的公司」：优先 user_companies，其次 restaurants
  SELECT company_id INTO v_company_id
  FROM user_companies
  WHERE company_id IS NOT NULL
  LIMIT 1;

  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id FROM restaurants WHERE company_id IS NOT NULL LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    RAISE NOTICE '未找到任何公司（user_companies 或 restaurants 无 company_id），请先创建公司并关联用户或餐厅';
    RETURN;
  END IF;

  -- 2. 获取该公司下任意餐厅（用于 rental_orders.restaurant_id）
  SELECT id INTO v_restaurant_id FROM restaurants WHERE company_id = v_company_id LIMIT 1;
  IF v_restaurant_id IS NULL THEN
    SELECT id INTO v_restaurant_id FROM restaurants LIMIT 1;
  END IF;
  IF v_restaurant_id IS NULL THEN
    RAISE NOTICE '未找到餐厅，请先创建餐厅';
    RETURN;
  END IF;

  -- 3. 插入一条设备租赁订单（与当前用户公司一致，便于在「设备租赁管理」中看到）
  v_order_number := 'EQ-RO-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6);

  INSERT INTO rental_orders (
    id,
    order_number,
    restaurant_id,
    company_id,
    rental_period,
    start_date,
    end_date,
    monthly_rental_price,
    total_amount,
    deposit_amount,
    order_status,
    payment_status
  )
  VALUES (
    gen_random_uuid(),
    v_order_number,
    v_restaurant_id,
    v_company_id,
    6,
    current_date,
    current_date + interval '6 months',
    500.00,
    3000.00,
    0.00,
    'active',
    'pending'
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  RAISE NOTICE '已创建设备租赁测试订单: id=%, order_number=%, company_id=%', v_order_id, v_order_number, v_company_id;
  RAISE NOTICE '请刷新 Dashboard「设备租赁管理」页，使用该公司下的账号登录即可看到该订单。';

  -- 若表有 provider_id 列，可同步更新以便兼容按 provider_id 过滤的查询
  BEGIN
    UPDATE rental_orders SET provider_id = v_company_id WHERE id = v_order_id;
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;
END $$;

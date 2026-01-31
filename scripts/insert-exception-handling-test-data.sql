-- ============================================
-- 异常处理测试数据：逾期账期 + 逾期设备（未归还）
-- 用途：Dashboard「异常处理」页展示「逾期账期」「逾期设备」列表
-- 执行：在 Supabase Dashboard → SQL Editor 中粘贴并执行本脚本
-- 说明：若 restaurants 表为空，脚本会自动创建一家测试公司与一家测试餐厅
-- ============================================

DO $$
DECLARE
  v_restaurant_id UUID;
  v_company_id UUID;
  v_order_id UUID;
  v_order_number TEXT;
BEGIN
  -- 1. 获取或创建餐厅（用于 rental_orders.restaurant_id）
  SELECT id INTO v_restaurant_id FROM restaurants LIMIT 1;

  IF v_restaurant_id IS NULL THEN
    -- 若无餐厅，先创建一家公司和一个测试餐厅
    INSERT INTO companies (id, name)
    VALUES (gen_random_uuid(), '测试公司-异常处理')
    RETURNING id INTO v_company_id;

    INSERT INTO restaurants (id, company_id, name, contact_name, contact_phone, address)
    VALUES (
      gen_random_uuid(),
      v_company_id,
      '测试餐厅-异常处理',
      '测试联系人',
      '13800138000',
      '测试地址'
    )
    RETURNING id INTO v_restaurant_id;

    RAISE NOTICE '已创建测试公司与餐厅: restaurant_id=%', v_restaurant_id;
  ELSE
    RAISE NOTICE '使用现有餐厅: restaurant_id=%', v_restaurant_id;
  END IF;

  -- 获取餐厅所属公司 ID（触发器 create_task_from_rental 会写入 task_pool，task_pool.company_id 非空）
  SELECT company_id INTO v_company_id FROM restaurants WHERE id = v_restaurant_id;
  IF v_company_id IS NULL THEN
    -- 若餐厅无公司，先创建一家公司并更新餐厅
    INSERT INTO companies (id, name)
    VALUES (gen_random_uuid(), '测试公司-异常处理')
    RETURNING id INTO v_company_id;
    UPDATE restaurants SET company_id = v_company_id WHERE id = v_restaurant_id;
    RAISE NOTICE '已为餐厅关联测试公司: company_id=%', v_company_id;
  END IF;

  -- 2. 插入一条「逾期设备」测试租赁订单（end_date 已过期 + order_status = active）
  -- 必须设置 company_id，否则触发器写入 task_pool 时会违反 company_id NOT NULL
  -- 必须设置 provider_id，否则「设备租赁管理」列表 API 按 provider_id 过滤时非 super_admin 看不到
  v_order_number := 'TEST-RO-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6);

  INSERT INTO rental_orders (
    id,
    order_number,
    restaurant_id,
    company_id,
    provider_id,
    rental_period,
    start_date,
    end_date,
    monthly_rental_price,
    total_amount,
    order_status,
    payment_status
  )
  VALUES (
    gen_random_uuid(),
    v_order_number,
    v_restaurant_id,
    v_company_id,
    v_company_id,
    6,
    (current_date - interval '7 months')::date,
    (current_date - interval '10 days')::date,  -- 结束日已过期，构成「逾期未归还」
    500.00,
    3000.00,
    'active',
    'pending'
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  RAISE NOTICE '已创建逾期设备测试订单: id=%, order_number=%', v_order_id, v_order_number;

  -- 3. 插入一条「逾期账期」测试账期（status = overdue，due_date 已过期）
  INSERT INTO rental_billing_cycles (
    rental_order_id,
    cycle_number,
    cycle_month,
    due_date,
    amount_due,
    amount_paid,
    status
  )
  VALUES (
    v_order_id,
    1,
    to_char(current_date - interval '1 month', 'YYYY-MM'),
    (current_date - interval '5 days')::date,  -- 到期日已过期
    500.00,
    0.00,
    'overdue'
  );

  RAISE NOTICE '已创建逾期账期测试数据: rental_order_id=%, status=overdue', v_order_id;
  RAISE NOTICE '完成。请刷新 Dashboard「异常处理」页查看逾期账期与逾期设备。';
END $$;

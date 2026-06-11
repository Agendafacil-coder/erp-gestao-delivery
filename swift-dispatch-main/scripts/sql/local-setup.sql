-- =============================================================================
-- Delivery OS — setup local (pgAdmin / PostgreSQL 18)
-- Banco: delivery_os
--
-- PRÉ-REQUISITO: as 14 tabelas já criadas (npm run db:push no projeto).
-- Este script limpa dados de demo e recria usuários, cardápio e pedidos.
--
-- Senha dos usuários demo: demo1234
-- =============================================================================

-- Conecte no banco delivery_os antes de executar.
-- No pgAdmin: Query Tool → colar tudo → Execute (F5)

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Limpar dados (ordem respeitando FKs)
-- -----------------------------------------------------------------------------
TRUNCATE TABLE
  order_line_items,
  payments,
  order_events,
  orders,
  menu_items,
  menu_categories,
  alerts,
  drivers,
  user_roles,
  stores,
  profiles,
  sessions,
  tenants,
  users
RESTART IDENTITY CASCADE;

-- -----------------------------------------------------------------------------
-- 2) IDs fixos (facilita consultar no pgAdmin)
-- -----------------------------------------------------------------------------
-- tenant     11111111-1111-4111-8111-111111111101
-- operador   11111111-1111-4111-8111-111111111201
-- cozinha    11111111-1111-4111-8111-111111111202
-- cat lanches 11111111-1111-4111-8111-111111111301
-- cat bebidas 11111111-1111-4111-8111-111111111302
-- item burger 11111111-1111-4111-8111-111111111311
-- item batata 11111111-1111-4111-8111-111111111312
-- item refri  11111111-1111-4111-8111-111111111313
-- store       11111111-1111-4111-8111-111111111401

-- Hash bcrypt de "demo1234" (10 rounds)
-- Gerado via: node -e "require('bcryptjs').hash('demo1234',10).then(console.log)"

-- -----------------------------------------------------------------------------
-- 3) Tenant e usuários
-- -----------------------------------------------------------------------------
INSERT INTO tenants (id, name, slug, plan, created_at, updated_at)
VALUES (
  '11111111-1111-4111-8111-111111111101',
  'Delivery OS HQ',
  'delivery-os-hq',
  'pro',
  NOW(),
  NOW()
);

INSERT INTO users (id, email, password_hash, full_name, created_at, updated_at)
VALUES
  (
    '11111111-1111-4111-8111-111111111201',
    'operador@deliveryos.com.br',
    '$2b$10$vvhI/pD81Xif/Z7jL94YzOxMnD0zqbHdbw65cXxBxyBed01uwjHbO',
    'Guilherme Santos',
    NOW(),
    NOW()
  ),
  (
    '11111111-1111-4111-8111-111111111202',
    'cozinha@deliveryos.com.br',
    '$2b$10$vvhI/pD81Xif/Z7jL94YzOxMnD0zqbHdbw65cXxBxyBed01uwjHbO',
    'Maria Cozinha',
    NOW(),
    NOW()
  );

INSERT INTO profiles (id, full_name, current_tenant_id, created_at, updated_at)
VALUES
  ('11111111-1111-4111-8111-111111111201', 'Guilherme Santos', '11111111-1111-4111-8111-111111111101', NOW(), NOW()),
  ('11111111-1111-4111-8111-111111111202', 'Maria Cozinha', NULL, NOW(), NOW());

INSERT INTO user_roles (id, user_id, tenant_id, role, created_at)
VALUES
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111201', '11111111-1111-4111-8111-111111111101', 'owner', NOW()),
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111201', '11111111-1111-4111-8111-111111111101', 'driver', NOW()),
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111202', '11111111-1111-4111-8111-111111111101', 'kitchen', NOW());

-- -----------------------------------------------------------------------------
-- 4) Loja
-- -----------------------------------------------------------------------------
INSERT INTO stores (id, tenant_id, name, address, lat, lng, active, created_at, updated_at)
VALUES (
  '11111111-1111-4111-8111-111111111401',
  '11111111-1111-4111-8111-111111111101',
  'Loja Pinheiros',
  'R. dos Pinheiros, 1000',
  -23.5614,
  -46.6558,
  TRUE,
  NOW(),
  NOW()
);

-- -----------------------------------------------------------------------------
-- 5) Cardápio
-- -----------------------------------------------------------------------------
INSERT INTO menu_categories (id, tenant_id, name, sort_order, active, created_at, updated_at)
VALUES
  ('11111111-1111-4111-8111-111111111301', '11111111-1111-4111-8111-111111111101', 'Lanches', 0, TRUE, NOW(), NOW()),
  ('11111111-1111-4111-8111-111111111302', '11111111-1111-4111-8111-111111111101', 'Bebidas', 1, TRUE, NOW(), NOW());

INSERT INTO menu_items (
  id, tenant_id, category_id, name, description, price, image_url, available, sort_order, created_at, updated_at
)
VALUES
  (
    '11111111-1111-4111-8111-111111111311',
    '11111111-1111-4111-8111-111111111101',
    '11111111-1111-4111-8111-111111111301',
    'Hambúrguer Premium',
    'Blend Angus 180g',
    42.90,
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
    TRUE,
    0,
    NOW(),
    NOW()
  ),
  (
    '11111111-1111-4111-8111-111111111312',
    '11111111-1111-4111-8111-111111111101',
    '11111111-1111-4111-8111-111111111301',
    'Batata Frita Rústica',
    'Porção crocante',
    18.90,
    'https://images.unsplash.com/photo-1573080496219-bb080063c599?w=600&q=80',
    TRUE,
    1,
    NOW(),
    NOW()
  ),
  (
    '11111111-1111-4111-8111-111111111313',
    '11111111-1111-4111-8111-111111111101',
    '11111111-1111-4111-8111-111111111302',
    'Refrigerante Lata',
    'Zero açúcar',
    7.90,
    'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=600&q=80',
    TRUE,
    0,
    NOW(),
    NOW()
  );

-- -----------------------------------------------------------------------------
-- 6) Entregadores (amostra)
-- -----------------------------------------------------------------------------
INSERT INTO drivers (id, tenant_id, user_id, name, phone, vehicle, status, lat, lng, rating, active_orders, created_at, updated_at)
VALUES
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111101', '11111111-1111-4111-8111-111111111201', '#E-02 Tito', NULL, 'moto', 'disponivel', -23.58, -46.66, 4.80, 0, NOW(), NOW()),
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111101', NULL, '#E-03 Caio', NULL, 'bike', 'em_rota', -23.57, -46.67, 4.80, 1, NOW(), NOW()),
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111101', NULL, '#E-04 Rafa', NULL, 'moto', 'pausado', -23.56, -46.68, 4.80, 0, NOW(), NOW());

-- -----------------------------------------------------------------------------
-- 7) Pedidos de exemplo (3 com itens de cardápio)
-- -----------------------------------------------------------------------------
INSERT INTO orders (
  id, tenant_id, store_id, driver_id, code, status, priority,
  customer_name, customer_phone, address, lat, lng,
  items_count, total_amount, channel, payment_status, sla_minutes, placed_at, created_at, updated_at
)
VALUES
  (
    '11111111-1111-4111-8111-111111111501',
    '11111111-1111-4111-8111-111111111101',
    '11111111-1111-4111-8111-111111111401',
    NULL,
    '#4820',
    'novo',
    'normal',
    'Ana Silva',
    '+5511987654321',
    'Pinheiros, R. das Palmeiras, 120',
    -23.56,
    -46.65,
    2,
    61.80,
    'site',
    'pago',
    40,
    NOW() - INTERVAL '12 minutes',
    NOW(),
    NOW()
  ),
  (
    '11111111-1111-4111-8111-111111111502',
    '11111111-1111-4111-8111-111111111101',
    '11111111-1111-4111-8111-111111111401',
    NULL,
    '#4821',
    'em_preparo',
    'alta',
    'Bruno Melo',
    '+5511976543210',
    'Vila Madalena, R. das Palmeiras, 148',
    -23.55,
    -46.66,
    2,
    61.80,
    'WhatsApp',
    'pago',
    40,
    NOW() - INTERVAL '22 minutes',
    NOW(),
    NOW()
  ),
  (
    '11111111-1111-4111-8111-111111111503',
    '11111111-1111-4111-8111-111111111101',
    '11111111-1111-4111-8111-111111111401',
    NULL,
    '#4822',
    'pronto',
    'normal',
    'Carla Rocha',
    '+5511965432109',
    'Itaim Bibi, R. das Palmeiras, 176',
    -23.57,
    -46.64,
    1,
    42.90,
    'iFood',
    'pendente',
    40,
    NOW() - INTERVAL '8 minutes',
    NOW(),
    NOW()
  );

INSERT INTO order_line_items (id, order_id, menu_item_id, name, quantity, unit_price, notes, created_at)
VALUES
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111501', '11111111-1111-4111-8111-111111111311', 'Hambúrguer Premium', 1, 42.90, NULL, NOW()),
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111501', '11111111-1111-4111-8111-111111111312', 'Batata Frita Rústica', 1, 18.90, NULL, NOW()),
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111502', '11111111-1111-4111-8111-111111111311', 'Hambúrguer Premium', 1, 42.90, NULL, NOW()),
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111502', '11111111-1111-4111-8111-111111111312', 'Batata Frita Rústica', 1, 18.90, NULL, NOW()),
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111503', '11111111-1111-4111-8111-111111111311', 'Hambúrguer Premium', 1, 42.90, 'Sem cebola', NOW());

-- -----------------------------------------------------------------------------
-- 8) Alertas
-- -----------------------------------------------------------------------------
INSERT INTO alerts (id, tenant_id, level, title, detail, created_at)
VALUES
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111101', 'crit', 'SLA estourado · #4831', 'Moema · entregador parado há 6 min', NOW()),
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111101', 'high', 'Gargalo na cozinha', '8 pedidos aguardando produção há +15 min', NOW()),
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111101', 'med', 'Pico de pedidos previsto', 'IA estima +30% nos próximos 20 min', NOW());

COMMIT;

-- -----------------------------------------------------------------------------
-- 9) Conferência (rode depois do COMMIT)
-- -----------------------------------------------------------------------------
-- SELECT slug, name FROM tenants;
-- SELECT email, full_name FROM users;
-- SELECT name, sort_order FROM menu_categories WHERE tenant_id = '11111111-1111-4111-8111-111111111101';
-- SELECT name, price, available FROM menu_items WHERE tenant_id = '11111111-1111-4111-8111-111111111101' ORDER BY sort_order;
-- SELECT code, status, customer_name FROM orders ORDER BY placed_at DESC LIMIT 5;

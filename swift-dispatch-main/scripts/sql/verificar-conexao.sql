-- Rode no banco delivery_os para validar estrutura e dados

SELECT 'tenants' AS tabela, COUNT(*)::text AS registros FROM tenants
UNION ALL SELECT 'users', COUNT(*)::text FROM users
UNION ALL SELECT 'menu_categories', COUNT(*)::text FROM menu_categories
UNION ALL SELECT 'menu_items', COUNT(*)::text FROM menu_items
UNION ALL SELECT 'orders', COUNT(*)::text FROM orders
UNION ALL SELECT 'drivers', COUNT(*)::text FROM drivers;

SELECT slug, name, plan FROM tenants;

SELECT u.email, ur.role
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
ORDER BY u.email, ur.role;

SELECT c.name AS categoria, i.name AS produto, i.price, i.available
FROM menu_items i
JOIN menu_categories c ON c.id = i.category_id
ORDER BY c.sort_order, i.sort_order;

-- Perfil restrito para garçons: acesso ao salão, abertura de comandas e lançamento de pedidos.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'waiter';

-- 1. Criação da Tabela 'users'
CREATE TABLE public.users (
  id bigserial NOT NULL,
  name character varying(255) NOT NULL,
  email character varying(255) NOT NULL,
  password character varying(255) NOT NULL,
  age integer NULL,
  gender character varying(50) NULL,
  
  -- Campos Específicos para Lesão Medular (SCI)
  sci_cause character varying(255) NULL,
  sci_level character varying(100) NULL,
  sci_category character varying(100) NULL,
  sci_severity character varying(100) NULL,
  sci_class character varying(100) NULL,
  
  -- Campos de Status e Data
  is_admin boolean NULL DEFAULT FALSE,
  is_active boolean NULL DEFAULT TRUE,
  created_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  birthdate date NULL,
  
  -- Constraints
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_key UNIQUE (email)
) TABLESPACE pg_default;

---

-- 2. Criação dos Índices
-- Índice para buscas rápidas e garantia de unicidade por email
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email 
ON public.users USING btree (email) 
TABLESPACE pg_default;

-- Índice para buscas por administradores
CREATE INDEX IF NOT EXISTS idx_users_is_admin 
ON public.users USING btree (is_admin) 
TABLESPACE pg_default;

-- Índice para buscas de usuários ativos/inativos
CREATE INDEX IF NOT EXISTS idx_users_is_active 
ON public.users USING btree (is_active) 
TABLESPACE pg_default;
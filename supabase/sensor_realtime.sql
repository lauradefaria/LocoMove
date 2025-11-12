-- 1. Criação da Tabela 'sensor_realtime'
CREATE TABLE public.sensor_realtime (
  id bigserial NOT NULL,
  exercise_id bigint NULL,
  user_id bigint NOT NULL,
  rotations_count integer NULL DEFAULT 0,
  last_rotation_time bigint NULL,
  current_velocity numeric(10, 2) NULL DEFAULT 0,
  is_active boolean NULL DEFAULT TRUE,
  updated_at timestamp with time zone NULL DEFAULT NOW(),
  command text NULL,
  
  -- Constraints
  CONSTRAINT sensor_realtime_pkey PRIMARY KEY (id),
  CONSTRAINT sensor_realtime_exercise_id_fkey 
    FOREIGN KEY (exercise_id) 
    REFERENCES exercises (id) 
    ON DELETE CASCADE,
  CONSTRAINT sensor_realtime_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users (id) 
    ON DELETE CASCADE
) TABLESPACE pg_default;

---

-- 2. Criação dos Índices
-- Índice para buscas pelo exercício atual
CREATE INDEX IF NOT EXISTS idx_sensor_realtime_exercise_id 
ON public.sensor_realtime USING btree (exercise_id) 
TABLESPACE pg_default;

-- Índice para buscas pelo usuário (o mais provável acesso)
CREATE INDEX IF NOT EXISTS idx_sensor_realtime_user_id 
ON public.sensor_realtime USING btree (user_id) 
TABLESPACE pg_default;

-- Índice para verificar quais sensores estão ativos
CREATE INDEX IF NOT EXISTS idx_sensor_realtime_active 
ON public.sensor_realtime USING btree (is_active) 
TABLESPACE pg_default;

---

-- 3. Criação do Trigger
-- NOTE: A função 'update_sensor_realtime_timestamp()' deve ser definida separadamente.
-- Trigger para atualizar automaticamente a coluna 'updated_at' antes de qualquer atualização na linha
CREATE TRIGGER trigger_sensor_realtime_updated_at 
BEFORE UPDATE ON sensor_realtime 
FOR EACH ROW
EXECUTE FUNCTION update_sensor_realtime_timestamp ();
-- 1. Criação da Tabela 'exercise_readings'
CREATE TABLE public.exercise_readings (
  id bigserial NOT NULL,
  exercise_id bigint NULL,
  timestamp integer NOT NULL,
  velocity numeric(10, 4) NULL,
  distance numeric(10, 2) NULL,
  rotations integer NULL,
  created_at timestamp with time zone NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT exercise_readings_pkey PRIMARY KEY (id),
  CONSTRAINT exercise_readings_exercise_id_fkey 
    FOREIGN KEY (exercise_id) 
    REFERENCES exercises (id) 
    ON DELETE CASCADE
) TABLESPACE pg_default;

---

-- 2. Criação do Índice
-- Índice para buscas e organização das leituras pertencentes a um exercício
CREATE INDEX IF NOT EXISTS idx_exercise_readings_exercise_id 
ON public.exercise_readings USING btree (exercise_id) 
TABLESPACE pg_default;
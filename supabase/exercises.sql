-- 1. Create the 'exercises' table
CREATE TABLE public.exercises (
  id bigserial NOT NULL,
  user_id bigint NOT NULL,
  exercise_date timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  velocity_data jsonb NULL,
  max_velocity numeric(10, 2) NULL,
  min_velocity numeric(10, 2) NULL,
  avg_velocity numeric(10, 2) NULL,
  avg_acceleration numeric(10, 2) NULL,
  total_duration integer NULL,
  total_distance numeric(10, 2) NULL,
  notes text NULL,
  created_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT exercises_pkey PRIMARY KEY (id),
  CONSTRAINT exercises_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

---

-- 2. Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_exercises_user_id 
ON public.exercises USING btree (user_id) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_exercises_date 
ON public.exercises USING btree (exercise_date) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_exercises_user_date 
ON public.exercises USING btree (user_id, exercise_date DESC) 
TABLESPACE pg_default;

---

-- 3. Create the Trigger for 'updated_at' (Requires the update function to exist)
-- NOTE: The function 'update_exercises_updated_at()' must be defined separately.
CREATE TRIGGER trigger_exercises_updated_at 
BEFORE UPDATE ON exercises 
FOR EACH ROW
EXECUTE FUNCTION update_exercises_updated_at ();
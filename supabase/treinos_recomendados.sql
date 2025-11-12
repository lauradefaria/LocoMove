-- 1. Criação da Tabela 'treinos_recomendados'
CREATE TABLE public.treinos_recomendados (
  id bigserial NOT NULL,
  user_id bigint NOT NULL,
  velocidade_alvo numeric(5, 2) NOT NULL,
  tempo_trabalho integer NOT NULL,
  tempo_descanso integer NOT NULL,
  repeticoes integer NOT NULL,
  gerado_por_ia boolean NULL DEFAULT TRUE,
  ajustado_manualmente boolean NULL DEFAULT FALSE,
  ajustado_por_admin boolean NULL DEFAULT FALSE,
  observacoes text NULL,
  created_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  ativo boolean NULL DEFAULT TRUE,
  
  -- Constraints
  CONSTRAINT treinos_recomendados_pkey PRIMARY KEY (id),
  CONSTRAINT treinos_recomendados_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

---

-- 2. Criação dos Índices
-- Índice para buscas por usuário
CREATE INDEX IF NOT EXISTS idx_treinos_user_id 
ON public.treinos_recomendados USING btree (user_id) 
TABLESPACE pg_default;

-- Índice para buscar o treino ativo de um usuário (Índice parcial)
CREATE INDEX IF NOT EXISTS idx_treinos_ativo 
ON public.treinos_recomendados USING btree (user_id, ativo) 
TABLESPACE pg_default
WHERE (ativo = true);

-- Índice para ordenar por data de criação (para listagens recentes)
CREATE INDEX IF NOT EXISTS idx_treinos_created_at 
ON public.treinos_recomendados USING btree (created_at DESC) 
TABLESPACE pg_default;

---

-- 3. Criação dos Triggers
-- NOTE: As funções 'update_treinos_recomendados_timestamp()' e 'ensure_single_active_workout()' 
-- devem ser definidas separadamente no banco de dados.

-- Trigger para atualizar automaticamente a coluna 'updated_at' antes de qualquer atualização na linha
CREATE TRIGGER trigger_treinos_updated_at 
BEFORE UPDATE ON treinos_recomendados 
FOR EACH ROW
EXECUTE FUNCTION update_treinos_recomendados_timestamp ();

-- Trigger para garantir que apenas um treino esteja 'ativo' por usuário (se a função fizer isso)
CREATE TRIGGER trigger_ensure_single_active 
BEFORE INSERT OR UPDATE ON treinos_recomendados 
FOR EACH ROW 
WHEN (NEW.ativo = TRUE)
EXECUTE FUNCTION ensure_single_active_workout ();
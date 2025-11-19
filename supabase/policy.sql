-- ============================================
-- TABELA: users
-- ============================================

-- Permite usuários comuns lerem apenas seus próprios dados
CREATE POLICY "Users can read own data" ON users
FOR SELECT
TO authenticated
USING (auth.uid()::text = id::text);

-- Permite acesso anônimo para login (já tem)
CREATE POLICY "Allow anonymous read for login" ON users
FOR SELECT
TO anon
USING (true);

-- Admins podem ler todos os usuários
CREATE POLICY "Admins can read all users" ON users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id::text = auth.uid()::text AND is_admin = true
  )
);

-- Usuários podem atualizar seus próprios dados
CREATE POLICY "Users can update own data" ON users
FOR UPDATE
TO authenticated
USING (auth.uid()::text = id::text);

-- Admins podem criar, editar e remover usuários
CREATE POLICY "Admins can manage users" ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id::text = auth.uid()::text AND is_admin = true
  )
);

-- ============================================
-- TABELA: exercises
-- ============================================

-- Usuários podem ler seus próprios exercícios
CREATE POLICY "Users can read own exercises" ON exercises
FOR SELECT
TO authenticated
USING (user_id::text = auth.uid()::text);

-- Permite acesso anônimo (para manter compatibilidade com seu código atual)
CREATE POLICY "Allow anonymous read exercises" ON exercises
FOR SELECT
TO anon
USING (true);

-- Usuários podem criar seus próprios exercícios
CREATE POLICY "Users can create own exercises" ON exercises
FOR INSERT
TO authenticated
WITH CHECK (user_id::text = auth.uid()::text);

-- Admins podem ler todos os exercícios
CREATE POLICY "Admins can read all exercises" ON exercises
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id::text = auth.uid()::text AND is_admin = true
  )
);

-- Admins podem editar/deletar exercícios
CREATE POLICY "Admins can manage exercises" ON exercises
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id::text = auth.uid()::text AND is_admin = true
  )
);

-- ============================================
-- TABELA: exercise_readings
-- ============================================

-- Usuários podem ler leituras de seus exercícios
CREATE POLICY "Users can read own exercise_readings" ON exercise_readings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM exercises
    WHERE exercises.id = exercise_readings.exercise_id
    AND exercises.user_id::text = auth.uid()::text
  )
);

-- Permite acesso anônimo para inserção em tempo real
CREATE POLICY "Allow anonymous insert readings" ON exercise_readings
FOR INSERT
TO anon
WITH CHECK (true);

-- Admins podem ver todas as leituras
CREATE POLICY "Admins can read all readings" ON exercise_readings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id::text = auth.uid()::text AND is_admin = true
  )
);

-- ============================================
-- TABELA: sensor_realtime
-- ============================================

-- Permite inserção anônima (ESP8266)
CREATE POLICY "Allow anonymous insert sensor_data" ON sensor_realtime
FOR INSERT
TO anon
WITH CHECK (true);

-- Todos podem ler dados em tempo real
CREATE POLICY "Allow read sensor_realtime" ON sensor_realtime
FOR SELECT
TO anon, authenticated
USING (true);

-- ============================================
-- TABELA: treinos_recomendados
-- ============================================

-- Usuários podem ver suas próprias recomendações
CREATE POLICY "Users can read own recommendations" ON treinos_recomendados
FOR SELECT
TO authenticated
USING (user_id::text = auth.uid()::text);

-- Permite leitura anônima
CREATE POLICY "Allow anonymous read recommendations" ON treinos_recomendados
FOR SELECT
TO anon
USING (true);

-- Admins podem gerenciar todas as recomendações
CREATE POLICY "Admins can manage recommendations" ON treinos_recomendados
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id::text = auth.uid()::text AND is_admin = true
  )
);
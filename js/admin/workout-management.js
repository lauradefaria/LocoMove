// workout-management.js

let selectedUserId = null;
let currentWorkouts = [];

// Inicializar gerenciamento de treinos
function initWorkoutManagement() {
    loadUsers();
    setupEventListeners();
}

// Configurar event listeners
function setupEventListeners() {
    // Busca de usuários
    const searchInput = document.getElementById('search-user');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterUsers(e.target.value);
        });
    }

    // Refresh treinos
    const refreshBtn = document.getElementById('btn-refresh-workouts');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (selectedUserId) {
                loadUserWorkouts(selectedUserId);
            }
        });
    }

    // Fechar modal ao clicar fora
    const modal = document.getElementById('edit-workout-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeEditModal();
            }
        });
    }
}

// Carregar usuários
async function loadUsers() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('is_admin', false)
            .order('name');

        if (error) {
            console.error('Erro ao carregar usuários:', error);
            throw error;
        }

        console.log('Usuários carregados:', data);
        renderUsers(data || []);
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        const usersList = document.getElementById('users-list');
        if (usersList) {
            usersList.innerHTML = '<p class="error-message">Erro ao carregar usuários. Verifique o console.</p>';
        }
    }
}

// Renderizar lista de usuários
function renderUsers(users) {
    const usersList = document.getElementById('users-list');
    if (!usersList) return;

    if (users.length === 0) {
        usersList.innerHTML = '<p class="empty-state">Nenhum usuário encontrado</p>';
        return;
    }

    usersList.innerHTML = users.map(user => `
        <div class="user-card" data-user-id="${user.id}" onclick="selectUser('${user.id}', '${user.name}')">
            <span class="user-card-name">${user.name}</span>
            <span class="user-card-email">${user.email}</span>
        </div>
    `).join('');
}

// Filtrar usuários
function filterUsers(searchTerm) {
    const cards = document.querySelectorAll('.user-card');
    const term = searchTerm.toLowerCase();

    cards.forEach(card => {
        const name = card.querySelector('.user-card-name').textContent.toLowerCase();
        const email = card.querySelector('.user-card-email').textContent.toLowerCase();
        
        if (name.includes(term) || email.includes(term)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Selecionar usuário - vai direto para edição
function selectUser(userId, userName) {
    selectedUserId = userId;

    // Atualizar visual dos cards
    document.querySelectorAll('.user-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelector(`[data-user-id="${userId}"]`).classList.add('selected');

    // Carregar treino recomendado do usuário
    loadUserRecommendation(userId, userName);
}

// Carregar treino recomendado do usuário
async function loadUserRecommendation(userId, userName) {
    const workoutsList = document.getElementById('workouts-list');
    
    // Esconder empty state e mostrar conteúdo
    document.getElementById('no-user-selected').style.display = 'none';
    document.getElementById('workouts-content').style.display = 'block';
    document.getElementById('selected-user-name').textContent = `Treino de ${userName}`;
    
    workoutsList.innerHTML = '<div class="loading">Carregando treino...</div>';

    try {
        // Buscar treino ativo
        const { data, error } = await supabase
            .from('treinos_recomendados')
            .select('*')
            .eq('user_id', userId)
            .eq('ativo', true)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = não encontrado
            throw error;
        }

        if (data) {
            // Verificar se precisa regenerar (mais de 3 meses)
            const needsRegeneration = checkNeedsRegeneration(data.updated_at);
            
            // Tem treino - mostrar formulário de edição
            renderEditForm(data, userName, needsRegeneration);
        } else {
            // Não tem treino - mostrar botão para gerar por IA
            renderCreateForm(userId, userName);
        }
    } catch (error) {
        console.error('Erro ao carregar treino:', error);
        workoutsList.innerHTML = '<p class="error-message">Erro ao carregar treino. Verifique o console.</p>';
    }
}

// Verificar se o treino precisa ser regenerado (3 meses)
function checkNeedsRegeneration(updatedAt) {
    const lastUpdate = new Date(updatedAt);
    const now = new Date();
    const diffMonths = (now.getFullYear() - lastUpdate.getFullYear()) * 12 + (now.getMonth() - lastUpdate.getMonth());
    return diffMonths >= 3;
}

// Renderizar formulário de edição inline
function renderEditForm(workout, userName, needsRegeneration) {
    const workoutsList = document.getElementById('workouts-list');
    
    const regenerationWarning = needsRegeneration ? `
        <div class="alert-warning">
            <span class="alert-icon">⚠️</span>
            Este treino tem mais de 3 meses. Considere gerar uma nova recomendação por IA.
        </div>
    ` : '';
    
    workoutsList.innerHTML = `
        ${regenerationWarning}
        
        <div class="edit-form-inline">
            <div class="form-header">
                ${workout.gerado_por_ia && !workout.ajustado_manualmente ? 
                    '<span class="badge badge-ai">🤖 Gerado por IA</span>' : ''}
                ${workout.ajustado_por_admin ? 
                    '<span class="badge badge-admin">👤 Ajustado pelo Admin</span>' : ''}
            </div>

            <form id="inline-edit-form" onsubmit="handleSaveInline(event, '${workout.id}')">
                <div class="form-row">
                    <div class="form-group">
                        <label>Velocidade Alvo (km/h)</label>
                        <input type="number" id="velocidade" step="0.1" min="0" 
                            value="${workout.velocidade_alvo}" required>
                    </div>

                    <div class="form-group">
                        <label>Tempo de Trabalho (segundos)</label>
                        <input type="number" id="tempo-trabalho" min="1" 
                            value="${workout.tempo_trabalho}" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Tempo de Descanso (segundos)</label>
                        <input type="number" id="tempo-descanso" min="1" 
                            value="${workout.tempo_descanso}" required>
                    </div>

                    <div class="form-group">
                        <label>Repetições</label>
                        <input type="number" id="repeticoes" min="1" 
                            value="${workout.repeticoes}" required>
                    </div>
                </div>

                <div class="form-group">
                    <label>Observações</label>
                    <textarea id="observacoes" rows="3">${workout.observacoes || ''}</textarea>
                </div>

                <div class="form-actions-inline">
                    <button type="submit" class="btn-primary">
                        Salvar
                    </button>
                    <button type="button" class="btn-ai" onclick="generateAIRecommendation('${workout.user_id}', '${userName}')">
                        Gerar Nova Sugestão por IA
                    </button>
                </div>
            </form>

            <div class="workout-history">
                <h4>Última Atualização: ${formatDate(workout.updated_at)}</h4>
            </div>
        </div>
    `;
}

// Renderizar formulário de criação (quando não tem treino)
function renderCreateForm(userId, userName) {
    const workoutsList = document.getElementById('workouts-list');
    
    workoutsList.innerHTML = `
        <div class="create-form">
            <div class="action-icon">
                <img src="../../assets/icons/dumbbell-hand.png" alt="Ícone Gerenciar Treinos" style="width: 80px; height: 80px;">
            </div>
            <h3>Nenhum treino recomendado ainda</h3>
            <p>Gere uma sugestão por IA baseada em outros usuários ou no primeiro exercício realizado.</p>
            
            <button class="btn-ai-large" onclick="generateAIRecommendation('${userId}', '${userName}')">
                Gerar Sugestão por IA
            </button>
            
            <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
                Ou crie manualmente:
            </p>
            
            <form id="manual-create-form" onsubmit="handleCreateManual(event, '${userId}')">
                <div class="form-row">
                    <div class="form-group">
                        <label>Velocidade Alvo (km/h)</label>
                        <input type="number" id="velocidade-manual" step="0.1" min="0" 
                            placeholder="Ex: 12.0" required>
                    </div>

                    <div class="form-group">
                        <label>Tempo de Trabalho (segundos)</label>
                        <input type="number" id="tempo-trabalho-manual" min="1" 
                            placeholder="Ex: 30" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Tempo de Descanso (segundos)</label>
                        <input type="number" id="tempo-descanso-manual" min="1" 
                            placeholder="Ex: 30" required>
                    </div>

                    <div class="form-group">
                        <label>Repetições</label>
                        <input type="number" id="repeticoes-manual" min="1" 
                            placeholder="Ex: 8" required>
                    </div>
                </div>

                <button type="submit" class="btn-primary">
                    Criar Treino Manualmente
                </button>
            </form>
        </div>
    `;
}

// Fechar modal
function closeEditModal() {
    const modal = document.getElementById('edit-workout-modal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Salvar alterações inline
async function handleSaveInline(e, workoutId) {
    e.preventDefault();

    const velocidade = parseFloat(document.getElementById('velocidade').value);
    const tempoTrabalho = parseInt(document.getElementById('tempo-trabalho').value);
    const tempoDescanso = parseInt(document.getElementById('tempo-descanso').value);
    const repeticoes = parseInt(document.getElementById('repeticoes').value);
    const observacoes = document.getElementById('observacoes').value;

    try {
        const { error } = await supabase
            .from('treinos_recomendados')
            .update({
                velocidade_alvo: velocidade,
                tempo_trabalho: tempoTrabalho,
                tempo_descanso: tempoDescanso,
                repeticoes: repeticoes,
                observacoes: observacoes,
                gerado_por_ia: false,
                ajustado_manualmente: true,
                ajustado_por_admin: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', workoutId);

        if (error) throw error;

        showNotification('Treino atualizado com sucesso!', 'success');
        
        // Recarregar para mostrar atualização
        const userName = document.getElementById('selected-user-name').textContent.replace('Treino de ', '');
        loadUserRecommendation(selectedUserId, userName);
    } catch (error) {
        console.error('Erro ao salvar treino:', error);
        showNotification('Erro ao salvar treino', 'error');
    }
}

// Criar treino manualmente
async function handleCreateManual(e, userId) {
    e.preventDefault();

    const velocidade = parseFloat(document.getElementById('velocidade-manual').value);
    const tempoTrabalho = parseInt(document.getElementById('tempo-trabalho-manual').value);
    const tempoDescanso = parseInt(document.getElementById('tempo-descanso-manual').value);
    const repeticoes = parseInt(document.getElementById('repeticoes-manual').value);

    try {
        const { error } = await supabase
            .from('treinos_recomendados')
            .insert({
                user_id: userId,
                velocidade_alvo: velocidade,
                tempo_trabalho: tempoTrabalho,
                tempo_descanso: tempoDescanso,
                repeticoes: repeticoes,
                gerado_por_ia: false,
                ajustado_por_admin: true,
                ativo: true
            });

        if (error) throw error;

        showNotification('Treino criado com sucesso!', 'success');
        
        // Recarregar
        const userName = document.getElementById('selected-user-name').textContent.replace('Treino de ', '');
        loadUserRecommendation(userId, userName);
    } catch (error) {
        console.error('Erro ao criar treino:', error);
        showNotification('Erro ao criar treino', 'error');
    }
}

// Gerar recomendação por IA
async function generateAIRecommendation(userId, userName) {
    if (!confirm('Gerar nova recomendação por IA? Isso substituirá o treino atual se existir.')) {
        return;
    }

    showNotification('Gerando recomendação por IA...', 'info');

    try {
        // 1. Buscar dados de outros usuários para treinar modelo
        const { data: allExercises, error: exercisesError } = await supabase
            .from('exercises')
            .select('user_id, avg_velocity, max_velocity, total_duration')
            .not('avg_velocity', 'is', null)
            .limit(100);

        if (exercisesError) throw exercisesError;

        // 2. Buscar primeiro exercício do usuário
        const { data: userExercise, error: userError } = await supabase
            .from('exercises')
            .select('avg_velocity, max_velocity, total_duration')
            .eq('user_id', userId)
            .order('exercise_date', { ascending: true })
            .limit(1)
            .single();

        let recommendation;
        let confidence = 0;
        let source = '';

        // Calcular confiança baseada no número de amostras
        if (allExercises && allExercises.length > 0) {
            confidence = Math.min((allExercises.length / 10) * 100, 100); // 10 amostras = 100%
        }

        // Decidir fonte da recomendação baseado na confiança
        if (confidence >= 70 && allExercises.length >= 7) {
            // ALTA CONFIANÇA: Usar dados de outros usuários (≥70%)
            const velocities = allExercises.map(ex => parseFloat(ex.avg_velocity)).filter(v => v > 0);
            
            if (velocities.length === 0) {
                showNotification('Dados insuficientes para gerar recomendação', 'error');
                return;
            }
            
            const avgVel = velocities.reduce((sum, vel) => sum + vel, 0) / velocities.length;

            recommendation = {
                velocidade_alvo: (avgVel * 0.80).toFixed(1), // 80% da média
                tempo_trabalho: 30,
                tempo_descanso: 30,
                repeticoes: 8,
                observacoes: `Treino gerado por IA com base em ${allExercises.length} exercícios de outros usuários (Confiança: ${confidence.toFixed(0)}%)`
            };
            source = 'outros_usuarios';

        } else if (userExercise && userExercise.avg_velocity) {
            // BAIXA CONFIANÇA: Usar primeiro exercício do usuário (<70%)
            const baseVel = parseFloat(userExercise.avg_velocity);

            recommendation = {
                velocidade_alvo: (baseVel * 0.75).toFixed(1), // 75% da velocidade média
                tempo_trabalho: 25,
                tempo_descanso: 35,
                repeticoes: 6,
                observacoes: `Treino gerado por IA com base no primeiro exercício do usuário (Confiança: ${confidence.toFixed(0)}% - dados insuficientes de outros usuários)`
            };
            source = 'primeiro_exercicio';

        } else {
            // SEM DADOS: Não gerar automaticamente, solicitar criação manual
            showNotification('Dados insuficientes. Crie o treino manualmente ou adicione exercícios primeiro.', 'error');
            return;
        }

        console.log(`Recomendação gerada: Fonte=${source}, Confiança=${confidence.toFixed(0)}%`);

        // 3. Verificar se já existe treino
        const { data: existing } = await supabase
            .from('treinos_recomendados')
            .select('id')
            .eq('user_id', userId)
            .eq('ativo', true)
            .single();

        if (existing) {
            // Atualizar existente
            const { error } = await supabase
                .from('treinos_recomendados')
                .update({
                    ...recommendation,
                    gerado_por_ia: true,
                    ajustado_manualmente: false,
                    ajustado_por_admin: false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);

            if (error) throw error;
        } else {
            // Criar novo
            const { error } = await supabase
                .from('treinos_recomendados')
                .insert({
                    user_id: userId,
                    ...recommendation,
                    gerado_por_ia: true,
                    ativo: true
                });

            if (error) throw error;
        }

        showNotification(`Recomendação gerada! (Confiança: ${confidence.toFixed(0)}%)`, 'success');
        loadUserRecommendation(userId, userName);
    } catch (error) {
        console.error('Erro ao gerar recomendação:', error);
        showNotification('Erro ao gerar recomendação por IA', 'error');
    }
}

// Formatar data
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Mostrar notificação
function showNotification(message, type = 'info') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 4px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        animation: slideInRight 0.3s;
        ${type === 'success' ? 'background-color: #4caf50;' : ''}
        ${type === 'error' ? 'background-color: #f44336;' : ''}
        ${type === 'info' ? 'background-color: #2196f3;' : ''}
    `;

    document.body.appendChild(notification);

    // Remover após 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWorkoutManagement);
} else {
    initWorkoutManagement();
}
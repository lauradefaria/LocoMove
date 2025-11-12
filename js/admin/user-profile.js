// Script do Perfil do Usuário
let selectedUser = null;
let currentMonth = new Date();
let currentExercises = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('User Profile carregado');
    
    // Verifica autenticação
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser || !currentUser.is_admin) {
        console.error('Usuário não autenticado ou não é admin');
        window.location.href = '../../login.html';
        return;
    }
    
    // Pega ID do usuário selecionado
    const userId = localStorage.getItem('selectedUserId');
    if (!userId) {
        console.error('Nenhum userId selecionado');
        window.location.href = 'manage-users.html';
        return;
    }
    
    console.log('Carregando perfil para userId:', userId);
    
    // Carrega dados do usuário
    loadUserProfile(userId);
    
    // Event listeners
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    
    // Botão de estatísticas só se não for admin
    const statsBtn = document.getElementById('viewStatsBtn');
    if (statsBtn) {
        statsBtn.addEventListener('click', () => {
            if (selectedUser && selectedUser.is_admin) {
                alert('Administradores não realizam exercícios, portanto não há estatísticas disponíveis.');
                return;
            }
            localStorage.setItem('selectedUserId', selectedUser.id);
            window.location.href = 'statistics.html';
        });
    }
    
    document.getElementById('editUserBtn').addEventListener('click', openEditModal);
    document.getElementById('deactivateUserBtn').addEventListener('click', toggleUserStatus);
    document.getElementById('deleteUserBtn').addEventListener('click', deleteUser);
    
    // Modal
    const modal = document.getElementById('editUserModal');
    const closeBtn = modal.querySelector('.close');
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
    
    // Formulário de edição
    document.getElementById('editUserForm').addEventListener('submit', handleEditUser);
    populateYearSelect();

    document.getElementById('yearSelect').addEventListener('change', async function() {
        await loadExercises();
    });
});

async function loadUserProfile(userId) {
    console.log('Iniciando loadUserProfile para:', userId);
    
    try {
        // Verifica se supabase está disponível
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase não está configurado');
        }
        
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        
        console.log('Resposta do Supabase:', { data, error });
        
        if (error) throw error;
        
        if (!data) {
            throw new Error('Usuário não encontrado');
        }
        
        selectedUser = data;
        window.selectedUser = data;
        
        console.log('Usuário carregado:', data);
        
        // Atualiza título
        document.getElementById('userNameTitle').textContent = data.name;
        
        // Atualiza botão de desativar
        const deactivateBtn = document.getElementById('deactivateUserBtn');
        if (data.is_active) {
            deactivateBtn.innerHTML = '🚫 Desativar';
            deactivateBtn.classList.remove('btn-success');
            deactivateBtn.classList.add('btn-warning');
        } else {
            deactivateBtn.innerHTML = '✅ Ativar';
            deactivateBtn.classList.remove('btn-warning');
            deactivateBtn.classList.add('btn-success');
        }
        
        // Exibe informações
        displayProfile(data);
        
        // Carrega exercícios
        await loadExercises();
        
    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        const profileCard = document.getElementById('profileInfoCard');
        profileCard.innerHTML = `
            <p class="error-message show">
                Erro ao carregar perfil: ${error.message}
            </p>
            <button onclick="location.reload()" class="btn-primary" style="margin-top: 10px;">
                Tentar Novamente
            </button>
        `;
    }
}

function displayProfile(user) {
    const profileCard = document.getElementById('profileInfoCard');
    
    profileCard.innerHTML = `
        <h2>Informações do Usuário</h2>
        
        ${user.is_admin ? `
            <div class="admin-warning">
                <p>⚠️ <strong>Conta Administrativa</strong></p>
                <p>Administradores não realizam exercícios no sistema. Esta conta é apenas para gerenciamento.</p>
            </div>
        ` : ''}
        
        <div class="profile-grid">
            <div class="profile-item">
                <strong>Nome Completo</strong>
                <span>${user.name || 'Não informado'}</span>
            </div>
            <div class="profile-item">
                <strong>Email</strong>
                <span>${user.email || 'Não informado'}</span>
            </div>
            <div class="profile-item">
                <strong>Tipo de Conta</strong>
                <span class="user-badge ${user.is_admin ? 'badge-admin' : 'badge-user'}">
                    ${user.is_admin ? '👑 Administrador' : '👤 Usuário'}
                </span>
            </div>
            <div class="profile-item">
                <strong>Status</strong>
                <span class="status-badge ${user.is_active ? 'status-active' : 'status-inactive'}">
                    ${user.is_active ? '✓ Ativo' : '✗ Inativo'}
                </span>
            </div>
            ${user.age ? `
                <div class="profile-item">
                    <strong>Idade</strong>
                    <span>${user.age} anos</span>
                </div>
            ` : ''}
            ${user.gender ? `
                <div class="profile-item">
                    <strong>Gênero</strong>
                    <span>${user.gender}</span>
                </div>
            ` : ''}
        </div>
        
        ${user.sci_cause || user.sci_level || user.sci_category ? `
            <h3>Informações Clínicas</h3>
            <div class="profile-grid">
                ${user.sci_cause ? `
                    <div class="profile-item">
                        <strong>Causa da Lesão</strong>
                        <span>${user.sci_cause}</span>
                    </div>
                ` : ''}
                ${user.sci_level ? `
                    <div class="profile-item">
                        <strong>Nível da Lesão</strong>
                        <span>${user.sci_level}</span>
                    </div>
                ` : ''}
                ${user.sci_category ? `
                    <div class="profile-item">
                        <strong>Categoria</strong>
                        <span>${user.sci_category}</span>
                    </div>
                ` : ''}
                ${user.sci_severity ? `
                    <div class="profile-item">
                        <strong>Severidade</strong>
                        <span>${user.sci_severity}</span>
                    </div>
                ` : ''}
                ${user.sci_class ? `
                    <div class="profile-item">
                        <strong>Classe ASIA</strong>
                        <span>${user.sci_class}</span>
                    </div>
                ` : ''}
            </div>
        ` : ''}
    `;
}

async function loadExercises() {
    console.log('Iniciando loadExercises');
    
    if (!selectedUser) {
        console.error('selectedUser não está definido');
        document.getElementById('exercisesList').innerHTML = 
            '<p class="error-message show">Erro: Usuário não carregado</p>';
        return;
    }
    
    // Se for admin, não tenta carregar exercícios
    if (selectedUser.is_admin) {
        console.log('Usuário é admin, não há exercícios para carregar');
        document.getElementById('exercisesList').innerHTML = `
            <div class="admin-exercises-message">
                <div class="info-icon">ℹ️</div>
                <h3>Sem Exercícios</h3>
                <p>Contas administrativas não realizam exercícios no sistema.</p>
                <p>Apenas usuários regulares podem registrar atividades de treino.</p>
            </div>
        `;
        
        // Oculta/desabilita botão de estatísticas
        const statsBtn = document.getElementById('viewStatsBtn');
        if (statsBtn) {
            statsBtn.disabled = true;
            statsBtn.title = 'Administradores não têm estatísticas';
            statsBtn.style.opacity = '0.5';
            statsBtn.style.cursor = 'not-allowed';
        }
        
        // Oculta seletor de mês
        const monthSelector = document.querySelector('.month-selector');
        if (monthSelector) {
            monthSelector.style.display = 'none';
        }
        
        return;
    }
    
    const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);
    
    // Atualiza label do mês
    document.getElementById('currentMonth').textContent = 
        startDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    
    try {
        console.log('Buscando exercícios de', startDate, 'até', endDate);
        
        const { data, error } = await supabase
            .from('exercises')
            .select('*')
            .eq('user_id', selectedUser.id)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: false });
        
        console.log('Resposta de exercícios:', { data, error });
        
        if (error) throw error;
        
        currentExercises = data || [];
        window.currentExercises = currentExercises;
        
        console.log('Exercícios carregados:', currentExercises.length);
        
        displayExercises(currentExercises);
        
    } catch (error) {
        console.error('Erro ao carregar exercícios:', error);
        document.getElementById('exercisesList').innerHTML = `
            <p class="error-message show">
                Erro ao carregar exercícios: ${error.message}
            </p>
        `;
    }
}

function displayExercises(exercises) {
    const list = document.getElementById('exercisesList');
    
    if (!exercises || exercises.length === 0) {
        list.innerHTML = '<p class="no-data">Nenhum exercício realizado neste mês</p>';
        return;
    }
    
    list.innerHTML = exercises.map(ex => {
        const date = new Date(ex.created_at);
        return `
            <div class="exercise-card" data-exercise-id="${ex.id}">
                <div class="exercise-date">
                    ${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                </div>
                <div class="exercise-summary">
                    <div class="exercise-stat">
                        <span class="stat-label">Duração</span>
                        <span class="stat-value">${formatTime(ex.total_duration || 0)}</span>
                    </div>
                    <div class="exercise-stat">
                        <span class="stat-label">Distância</span>
                        <span class="stat-value">${(ex.total_distance || 0).toFixed(2)} m</span>
                    </div>
                    <div class="exercise-stat">
                        <span class="stat-label">Vel. Média</span>
                        <span class="stat-value">${(ex.avg_velocity || 0).toFixed(2)} m/s</span>
                    </div>
                </div>
                <button class="btn-view-small" onclick="viewExerciseDetails('${ex.id}')">
                    Ver Detalhes
                </button>
            </div>
        `;
    }).join('');
}

// Função para popular o select de anos
function populateYearSelect() {
    const yearSelect = document.getElementById('yearSelect');
    const currentYear = new Date().getFullYear();
    const startYear = 2020; // Ano inicial do sistema
    
    yearSelect.innerHTML = '';
    
    for (let year = currentYear; year >= startYear; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
    
    // Seleciona o ano atual por padrão
    yearSelect.value = currentYear;
}

function changeMonth(delta) {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
    
    // Não permite meses futuros
    const now = new Date();
    if (currentMonth > now) {
        currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    loadExercises();
}

function viewExerciseDetails(exerciseId) {
    console.log('Visualizando detalhes do exercício:', exerciseId);
    localStorage.setItem('selectedExerciseId', exerciseId);
    window.location.href = 'exercise-details.html';
}

function openEditModal() {
    const modal = document.getElementById('editUserModal');
    
    if (!selectedUser) {
        alert('Erro: Dados do usuário não carregados');
        return;
    }
    
    // Preenche formulário
    document.getElementById('edit_name').value = selectedUser.name || '';
    document.getElementById('edit_email').value = selectedUser.email || '';
    document.getElementById('edit_age').value = selectedUser.age || '';
    document.getElementById('edit_gender').value = selectedUser.gender || '';
    document.getElementById('edit_sci_cause').value = selectedUser.sci_cause || '';
    document.getElementById('edit_sci_level').value = selectedUser.sci_level || '';
    document.getElementById('edit_sci_category').value = selectedUser.sci_category || '';
    document.getElementById('edit_sci_severity').value = selectedUser.sci_severity || '';
    document.getElementById('edit_sci_class').value = selectedUser.sci_class || '';
    
    modal.style.display = 'block';
}

async function handleEditUser(e) {
    e.preventDefault();
    
    const errorMsg = document.getElementById('editErrorMessage');
    const successMsg = document.getElementById('editSuccessMessage');
    
    errorMsg.textContent = '';
    errorMsg.classList.remove('show');
    successMsg.textContent = '';
    successMsg.classList.remove('show');
    
    const formData = {
        name: document.getElementById('edit_name').value.trim(),
        email: document.getElementById('edit_email').value.trim().toLowerCase(),
        age: document.getElementById('edit_age').value ? parseInt(document.getElementById('edit_age').value) : null,
        gender: document.getElementById('edit_gender').value || null,
        sci_cause: document.getElementById('edit_sci_cause').value.trim() || null,
        sci_level: document.getElementById('edit_sci_level').value.trim() || null,
        sci_category: document.getElementById('edit_sci_category').value.trim() || null,
        sci_severity: document.getElementById('edit_sci_severity').value.trim() || null,
        sci_class: document.getElementById('edit_sci_class').value || null
    };
    
    try {
        const { error } = await supabase
            .from('users')
            .update(formData)
            .eq('id', selectedUser.id);
        
        if (error) throw error;
        
        successMsg.textContent = 'Usuário atualizado com sucesso!';
        successMsg.classList.add('show');
        
        // Atualiza dados locais
        selectedUser = { ...selectedUser, ...formData };
        window.selectedUser = selectedUser;
        
        // Recarrega perfil
        setTimeout(() => {
            document.getElementById('editUserModal').style.display = 'none';
            loadUserProfile(selectedUser.id);
        }, 1500);
        
    } catch (error) {
        console.error('Erro ao atualizar:', error);
        errorMsg.textContent = 'Erro ao atualizar usuário: ' + error.message;
        errorMsg.classList.add('show');
    }
}

async function toggleUserStatus() {
    if (!selectedUser) {
        alert('Erro: Dados do usuário não carregados');
        return;
    }
    
    const newStatus = !selectedUser.is_active;
    const action = newStatus ? 'ativar' : 'desativar';
    
    if (!confirm(`Tem certeza que deseja ${action} este usuário?`)) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('users')
            .update({ is_active: newStatus })
            .eq('id', selectedUser.id);
        
        if (error) throw error;
        
        alert(`Usuário ${action === 'ativar' ? 'ativado' : 'desativado'} com sucesso!`);
        
        // Recarrega perfil
        loadUserProfile(selectedUser.id);
        
    } catch (error) {
        console.error('Erro ao alterar status:', error);
        alert('Erro ao alterar status do usuário: ' + error.message);
    }
}

async function deleteUser() {
    if (!selectedUser) {
        alert('Erro: Dados do usuário não carregados');
        return;
    }
    
    // Confirmação extra para exclusão
    const confirmName = prompt(
        `⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL!\n\n` +
        `Você está prestes a EXCLUIR PERMANENTEMENTE o usuário:\n` +
        `${selectedUser.name} (${selectedUser.email})\n\n` +
        `Todos os exercícios deste usuário também serão excluídos.\n\n` +
        `Para confirmar, digite o nome completo do usuário:`
    );
    
    if (!confirmName) {
        console.log('Exclusão cancelada pelo usuário');
        return; // Cancelou
    }
    
    if (confirmName.trim() !== selectedUser.name) {
        alert('❌ Nome incorreto. Exclusão cancelada por segurança.');
        console.log('Nome digitado não confere:', confirmName.trim(), '!=', selectedUser.name);
        return;
    }
    
    console.log('Iniciando exclusão do usuário:', selectedUser.id);
    
    try {
        // Primeiro, verifica quantos exercícios o usuário tem
        const { data: exercisesData, error: countError } = await supabase
            .from('exercises')
            .select('id', { count: 'exact' })
            .eq('user_id', selectedUser.id);
        
        if (countError) {
            console.error('Erro ao contar exercícios:', countError);
        } else {
            console.log('Usuário tem', exercisesData?.length || 0, 'exercícios');
        }
        
        // Exclui todos os exercícios do usuário
        console.log('Excluindo exercícios do usuário...');
        const { error: exercisesError } = await supabase
            .from('exercises')
            .delete()
            .eq('user_id', selectedUser.id);
        
        if (exercisesError) {
            console.error('Erro ao excluir exercícios:', exercisesError);
            throw new Error('Falha ao excluir exercícios do usuário: ' + exercisesError.message);
        }
        
        console.log('Exercícios excluídos com sucesso');
        
        // Depois, exclui o usuário
        console.log('Excluindo usuário...');
        const { error: userError, data: deletedData } = await supabase
            .from('users')
            .delete()
            .eq('id', selectedUser.id)
            .select();
        
        console.log('Resposta da exclusão do usuário:', { error: userError, data: deletedData });
        
        if (userError) {
            console.error('Erro ao excluir usuário:', userError);
            throw new Error('Falha ao excluir usuário: ' + userError.message);
        }
        
        console.log('Usuário excluído com sucesso!');
        alert('✅ Usuário e todos os seus exercícios foram excluídos com sucesso!');
        
        // Limpa localStorage e redireciona
        localStorage.removeItem('selectedUserId');
        localStorage.removeItem('selectedUserIsAdmin');
        
        console.log('Redirecionando para manage-users.html...');
        window.location.href = 'manage-users.html';
        
    } catch (error) {
        console.error('ERRO COMPLETO na exclusão:', error);
        alert('❌ Erro ao excluir usuário: ' + error.message);
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
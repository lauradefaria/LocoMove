// User Profile - Visualização e edição de dados do usuário

let currentUser = null;
let isEditMode = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('User Profile carregado');
    
    // Verifica autenticação
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser) {
        console.error('Usuário não autenticado');
        window.location.href = '../login.html';
        return;
    }
    
    document.getElementById('userName').textContent = currentUser.name;
    
    // Event listeners
    document.getElementById('backBtn').addEventListener('click', goBack);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('editBtn').addEventListener('click', enterEditMode);
    document.getElementById('cancelBtn').addEventListener('click', cancelEdit);
    document.getElementById('profileForm').addEventListener('submit', saveProfile);
    document.getElementById('deactivateBtn').addEventListener('click', openDeactivateModal);
    document.getElementById('cancelDeactivateBtn').addEventListener('click', closeDeactivateModal);
    document.getElementById('confirmDeactivateBtn').addEventListener('click', deactivateAccount);
    
    // Carrega dados do usuário
    loadUserData();
});

async function loadUserData() {
    console.log('=== Carregando dados do usuário ===');
    console.log('ID do usuário:', currentUser.id);
    
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (error) throw error;
        
        console.log('Dados retornados do banco:', data);
        
        currentUser = data;
        console.log('currentUser atualizado:', currentUser);
        
        // Atualiza localStorage
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        console.log('localStorage atualizado');
        
        displayUserData();
        console.log('=== Dados carregados com sucesso ===');
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        alert('Erro ao carregar dados do usuário');
    }
}

function displayUserData() {
    const user = currentUser;
    
    console.log('Exibindo dados do usuário:', user);
    
    // View Mode - Atualiza todos os campos
    document.getElementById('viewName').textContent = user.name || '-';
    document.getElementById('viewEmail').textContent = user.email || '-';
    document.getElementById('viewAge').textContent = user.age || '-';
    document.getElementById('viewGender').textContent = user.gender || '-';
    document.getElementById('viewSciCause').textContent = user.sci_cause || '-';
    document.getElementById('viewSciLevel').textContent = user.sci_level || '-';
    document.getElementById('viewSciCategory').textContent = user.sci_category || '-';
    document.getElementById('viewSciSeverity').textContent = user.sci_severity || '-';
    
    // Formata a exibição da Classe ASIA
    let asiaClassDisplay = '-';
    if (user.sci_class) {
        const asiaOptions = {
            'A': 'A - Completa',
            'B': 'B - Incompleta Sensorial',
            'C': 'C - Incompleta Motora',
            'D': 'D - Incompleta Motora',
            'E': 'E - Normal'
        };
        asiaClassDisplay = asiaOptions[user.sci_class] || user.sci_class;
    }
    document.getElementById('viewSciClass').textContent = asiaClassDisplay;
    
    // Edit Mode - Preenche campos do formulário
    document.getElementById('editName').value = user.name || '';
    document.getElementById('editEmail').value = user.email || '';
    document.getElementById('editAge').value = user.age || '';
    document.getElementById('editGender').value = user.gender || '';
    document.getElementById('editSciCause').value = user.sci_cause || '';
    document.getElementById('editSciLevel').value = user.sci_level || '';
    document.getElementById('editSciCategory').value = user.sci_category || '';
    document.getElementById('editSciSeverity').value = user.sci_severity || '';
    document.getElementById('editSciClass').value = user.sci_class || '';
    
    console.log('Dados exibidos com sucesso');
}

function enterEditMode() {
    console.log('Entrando em modo de edição');
    isEditMode = true;
    document.getElementById('viewMode').style.display = 'none';
    document.getElementById('editMode').style.display = 'block';
    document.getElementById('editBtn').style.display = 'none';
}

function cancelEdit() {
    console.log('Cancelando edição');
    isEditMode = false;
    
    // Recarrega dados originais do localStorage
    const storedUser = JSON.parse(localStorage.getItem('currentUser'));
    if (storedUser) {
        currentUser = storedUser;
        displayUserData();
    }
    
    document.getElementById('viewMode').style.display = 'block';
    document.getElementById('editMode').style.display = 'none';
    document.getElementById('editBtn').style.display = 'inline-flex';
    
    // Limpa mensagens
    hideMessage();
    
    // Limpa campos de senha
    document.getElementById('editPassword').value = '';
    document.getElementById('editConfirmPassword').value = '';
}

async function saveProfile(e) {
    e.preventDefault();
    console.log('Salvando perfil...');
    
    hideMessage();
    
    // Coleta dados do formulário
    const formData = {
        name: document.getElementById('editName').value.trim(),
        email: document.getElementById('editEmail').value.trim(),
        age: document.getElementById('editAge').value ? parseInt(document.getElementById('editAge').value) : null,
        gender: document.getElementById('editGender').value || null,
        sci_cause: document.getElementById('editSciCause').value.trim() || null,
        sci_level: document.getElementById('editSciLevel').value.trim() || null,
        sci_category: document.getElementById('editSciCategory').value.trim() || null,
        sci_severity: document.getElementById('editSciSeverity').value.trim() || null,
        sci_class: document.getElementById('editSciClass').value || null
    };
    
    console.log('Dados a serem salvos:', formData);
    
    // Valida senha se foi preenchida
    const password = document.getElementById('editPassword').value;
    const confirmPassword = document.getElementById('editConfirmPassword').value;
    
    if (password || confirmPassword) {
        if (password !== confirmPassword) {
            showMessage('As senhas não coincidem', 'error');
            return;
        }
        if (password.length < 6) {
            showMessage('A senha deve ter no mínimo 6 caracteres', 'error');
            return;
        }
        formData.password = password;
    }
    
    try {
        // Atualiza dados do usuário
        const updateData = { ...formData };
        
        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', currentUser.id)
            .select();
        
        if (error) throw error;
        
        console.log('Perfil atualizado no banco:', data);
        
        // CRÍTICO: Atualiza dados locais com os dados retornados do banco
        if (data && data.length > 0) {
            currentUser = { ...currentUser, ...data[0] };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            console.log('Dados locais atualizados:', currentUser);
            
            // Atualiza nome no header também
            document.getElementById('userName').textContent = currentUser.name;
        }
        
        // Atualiza exibição imediatamente
        displayUserData();
        
        showMessage('Perfil atualizado com sucesso!', 'success');
        
        // Limpa campos de senha
        document.getElementById('editPassword').value = '';
        document.getElementById('editConfirmPassword').value = '';
        
        // Volta para modo de visualização após 2 segundos
        setTimeout(() => {
            cancelEdit();
        }, 2000);
        
    } catch (error) {
        console.error('Erro ao salvar perfil:', error);
        showMessage('Erro ao salvar perfil: ' + error.message, 'error');
    }
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('updateMessage');
    messageDiv.textContent = message;
    messageDiv.className = 'update-message ' + type;
}

function hideMessage() {
    const messageDiv = document.getElementById('updateMessage');
    messageDiv.className = 'update-message';
    messageDiv.textContent = '';
}

function openDeactivateModal() {
    console.log('Abrindo modal de desativação');
    document.getElementById('deactivateModal').classList.add('active');
}

function closeDeactivateModal() {
    console.log('Fechando modal de desativação');
    document.getElementById('deactivateModal').classList.remove('active');
}

async function deactivateAccount() {
    console.log('Desativando conta...');
    
    try {
        // Atualiza status do usuário para inativo
        const { data, error } = await supabase
            .from('users')
            .update({ is_active: false })
            .eq('id', currentUser.id);
        
        if (error) throw error;
        
        console.log('Conta desativada com sucesso');
        
        alert('Sua conta foi desativada com sucesso. Você será redirecionado para a página de login.');
        
        // Limpa dados locais e redireciona
        localStorage.removeItem('currentUser');
        window.location.href = '../../login.html';
        
    } catch (error) {
        console.error('Erro ao desativar conta:', error);
        alert('Erro ao desativar conta: ' + error.message);
        closeDeactivateModal();
    }
}

function logout() {
    console.log('Fazendo logout...');
    localStorage.removeItem('currentUser');
    window.location.href = '../../login.html';
}

function goBack() {
    window.location.href = 'user.html';
}
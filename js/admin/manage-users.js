// Script de Gerenciamento de Usuários
document.addEventListener('DOMContentLoaded', function() {
    console.log('Manage Users carregado');
    
    const searchUsers = document.getElementById('searchUsers');
    let allUsers = [];
    
    // Verifica autenticação
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser || !currentUser.is_admin) {
        console.error('Usuário não autenticado ou não é admin');
        window.location.href = '../../login.html';
        return;
    }
    
    console.log('Admin autenticado:', currentUser.name);
    
    // Carrega usuários
    loadUsers();
    
    // Busca
    searchUsers.addEventListener('input', function() {
        filterUsers(this.value);
    });
});

async function loadUsers() {
    console.log('Carregando usuários...');
    
    try {
        // Verifica se supabase está disponível
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase não está configurado');
        }
        
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('name');
        
        console.log('Resposta do Supabase:', { data, error });
        
        if (error) throw error;
        
        allUsers = data || [];
        console.log('Usuários carregados:', allUsers.length);
        
        displayUsers(allUsers);
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        document.getElementById('usersGrid').innerHTML = `
            <p class="error-message show">
                Erro ao carregar usuários: ${error.message}
            </p>
        `;
    }
}

function displayUsers(users) {
    const grid = document.getElementById('usersGrid');
    
    if (!users || users.length === 0) {
        grid.innerHTML = '<p class="no-data">Nenhum usuário encontrado</p>';
        return;
    }
    
    grid.innerHTML = users.map(user => `
        <div class="user-card ${user.is_admin ? 'admin-card' : ''}" data-user-id="${user.id}">
            <div class="user-card-header">
                <h3>${user.name}</h3>
                <span class="user-badge ${user.is_admin ? 'badge-admin' : 'badge-user'}">
                    ${user.is_admin ? '👑 Admin' : '👤 Usuário'}
                </span>
            </div>
            <div class="user-card-body">
                <p><strong>Email:</strong> ${user.email}</p>
                ${user.age ? `<p><strong>Idade:</strong> ${user.age} anos</p>` : ''}
                ${user.sci_category ? `<p><strong>Lesão:</strong> ${user.sci_category}</p>` : ''}
                ${user.is_admin ? '<p class="admin-note">⚠️ Administradores não realizam exercícios</p>' : ''}
                <span class="status-badge ${user.is_active ? 'status-active' : 'status-inactive'}">
                    ${user.is_active ? '✓ Ativo' : '✗ Inativo'}
                </span>
            </div>
            <button class="btn-view" onclick="viewUserProfile('${user.id}', ${user.is_admin})">
                Ver Perfil
            </button>
        </div>
    `).join('');
}

function filterUsers(searchTerm) {
    const filtered = allUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    displayUsers(filtered);
}

function viewUserProfile(userId, isAdmin) {
    console.log('Visualizando perfil:', userId, 'Admin:', isAdmin);
    
    // Salva o ID do usuário selecionado
    localStorage.setItem('selectedUserId', userId);
    localStorage.setItem('selectedUserIsAdmin', isAdmin.toString());
    
    // Redireciona para a página de perfil
    window.location.href = 'user-profile.html';
}
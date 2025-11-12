// Script da Página Principal do Admin
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Dashboard carregado');
    
    const adminName = document.getElementById('adminName');
    const logoutBtn = document.getElementById('logoutBtn');
    const profileCard = document.getElementById('profileCard');
    
    // Verifica autenticação
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser) {
        console.log('Usuário não encontrado, redirecionando...');
        window.location.href = window.location.origin + '/login.html';
        return;
    }
    
    if (!currentUser.is_admin) {
        console.log('Usuário não é admin, redirecionando...');
        window.location.href = '../user/user.html';
        return;
    }
    
    // Exibe nome do admin
    adminName.textContent = currentUser.name;
    
    // Exibe perfil do admin
    displayProfile(currentUser);
    
    // Logout
    logoutBtn.addEventListener('click', function() {
        console.log('=== LOGOUT DO ADMIN ===');
        localStorage.removeItem('currentUser');
        console.log('✓ localStorage limpo');
        
        // Usa caminho absoluto para garantir redirecionamento correto
        const loginUrl = window.location.origin + '/login.html';
        console.log('Redirecionando para:', loginUrl);
        window.location.href = loginUrl;
    });
});

function displayProfile(user) {
    const profileCard = document.getElementById('profileCard');
    
    profileCard.innerHTML = `
        <div class="profile-info-grid">
            <div class="profile-info-item">
                <span class="info-label">Nome Completo</span>
                <span class="info-value">${user.name}</span>
            </div>
            
            <div class="profile-info-item">
                <span class="info-label">Email</span>
                <span class="info-value">${user.email}</span>
            </div>
            
            <div class="profile-info-item">
                <span class="info-label">Tipo de Conta</span>
                <span class="info-value">
                    <span class="badge-admin">Administrador</span>
                </span>
            </div>
            
            ${user.age ? `
                <div class="profile-info-item">
                    <span class="info-label">Idade</span>
                    <span class="info-value">${user.age} anos</span>
                </div>
            ` : ''}
            
            ${user.gender ? `
                <div class="profile-info-item">
                    <span class="info-label">Gênero</span>
                    <span class="info-value">${user.gender}</span>
                </div>
            ` : ''}
            
            <div class="profile-info-item">
                <span class="info-label">Status</span>
                <span class="info-value">
                    <span class="status-badge ${user.is_active ? 'status-active' : 'status-inactive'}">
                        ${user.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                </span>
            </div>
        </div>
        
        ${user.sci_cause || user.sci_level || user.sci_category ? `
            <div class="clinical-info">
                <h3>Informações Clínicas</h3>
                <div class="profile-info-grid">
                    ${user.sci_cause ? `
                        <div class="profile-info-item">
                            <span class="info-label">Causa da Lesão</span>
                            <span class="info-value">${user.sci_cause}</span>
                        </div>
                    ` : ''}
                    
                    ${user.sci_level ? `
                        <div class="profile-info-item">
                            <span class="info-label">Nível da Lesão</span>
                            <span class="info-value">${user.sci_level}</span>
                        </div>
                    ` : ''}
                    
                    ${user.sci_category ? `
                        <div class="profile-info-item">
                            <span class="info-label">Categoria</span>
                            <span class="info-value">${user.sci_category}</span>
                        </div>
                    ` : ''}
                    
                    ${user.sci_severity ? `
                        <div class="profile-info-item">
                            <span class="info-label">Severidade</span>
                            <span class="info-value">${user.sci_severity}</span>
                        </div>
                    ` : ''}
                    
                    ${user.sci_class ? `
                        <div class="profile-info-item">
                            <span class="info-label">Classe ASIA</span>
                            <span class="info-value">${user.sci_class}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        ` : ''}
    `;
}
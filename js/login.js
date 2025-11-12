// Script de Login
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;
        
        try {
            // Limpa mensagens de erro anteriores
            errorMessage.textContent = '';
            errorMessage.classList.remove('show');
            
            // Busca o usuário na tabela users
            const { data: users, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .eq('password', password)
                .single();
            
            if (fetchError || !users) {
                throw new Error('Email ou senha incorretos.');
            }
            
            // Verifica se o usuário está ativo
            if (!users.is_active) {
                throw new Error('Sua conta está inativa. Entre em contato com o administrador.');
            }
            
            // Salva os dados do usuário no localStorage
            localStorage.setItem('currentUser', JSON.stringify(users));
            
            // Redireciona baseado no tipo de usuário
            if (users.is_admin) {
                window.location.href = 'pages/admin/admin.html';
            } else {
                window.location.href = 'pages/user/user.html';
            }
            
        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.classList.add('show');
            console.error('Erro no login:', error);
        }
    });
});
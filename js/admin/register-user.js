// Script de Cadastro de Usuário pelo Admin
document.addEventListener('DOMContentLoaded', function() {
    console.log('Register User carregado');
    
    // Verifica autenticação
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser || !currentUser.is_admin) {
        window.location.href = '../../index.html';
        return;
    }
    
    // Formulário de registro
    const registerForm = document.getElementById('adminRegisterForm');
    registerForm.addEventListener('submit', handleRegister);
});

async function handleRegister(e) {
    e.preventDefault();
    
    const errorMsg = document.getElementById('registerErrorMessage');
    const successMsg = document.getElementById('registerSuccessMessage');
    
    // Limpa mensagens
    errorMsg.textContent = '';
    errorMsg.classList.remove('show');
    successMsg.textContent = '';
    successMsg.classList.remove('show');
    
    // Coleta dados do formulário
    const name = document.getElementById('reg_name').value.trim();
    const email = document.getElementById('reg_email').value.trim().toLowerCase();
    const password = document.getElementById('reg_password').value;
    const birthdate = document.getElementById('reg_birthdate').value;
    const gender = document.getElementById('reg_gender').value || null;
    const sci_cause = document.getElementById('reg_sci_cause').value.trim() || null;
    const sci_level = document.getElementById('reg_sci_level').value.trim() || null;
    const sci_category = document.getElementById('reg_sci_category').value.trim() || null;
    const sci_severity = document.getElementById('reg_sci_severity').value.trim() || null;
    const sci_class = document.getElementById('reg_sci_class').value || null;
    const is_admin = document.getElementById('reg_is_admin').checked;

    // Validações
    if (!name) {
        errorMsg.textContent = 'O nome é obrigatório!';
        errorMsg.classList.add('show');
        return;
    }

    if (!birthdate) {
        errorMsg.textContent = 'A data de nascimento é obrigatória!';
        errorMsg.classList.add('show');
        return;
    }

    if (password.length < 6) {
        errorMsg.textContent = 'A senha deve ter no mínimo 6 caracteres!';
        errorMsg.classList.add('show');
        return;
    }

    // Calcula idade a partir da data de nascimento
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    // Validação de idade plausível
    if (age < 1 || age > 150) {
        errorMsg.textContent = 'Por favor, insira uma data de nascimento válida!';
        errorMsg.classList.add('show');
        return;
    }

    // Prepara dados para inserção
    const formData = {
        name,
        email,
        password,
        birthdate,
        age,
        gender,
        sci_cause,
        sci_level,
        sci_category,
        sci_severity,
        sci_class,
        is_admin,
        is_active: true
    };

    try {
        // Verifica email duplicado
        const { data: existing, error: checkError } = await supabase
            .from('users')
            .select('email')
            .eq('email', email);
        
        if (checkError) {
            throw new Error('Erro ao verificar email: ' + checkError.message);
        }

        if (existing && existing.length > 0) {
            errorMsg.textContent = 'Este email já está cadastrado!';
            errorMsg.classList.add('show');
            return;
        }
        
        // Insere usuário
        const { data, error } = await supabase
            .from('users')
            .insert([formData])
            .select();
        
        if (error) throw error;
        
        console.log('Usuário cadastrado com sucesso:', data);
        
        successMsg.textContent = 'Usuário cadastrado com sucesso!';
        successMsg.classList.add('show');
        
        // Limpa formulário
        document.getElementById('adminRegisterForm').reset();
        
        // Redireciona após 2 segundos
        setTimeout(() => {
            window.location.href = 'manage-users.html';
        }, 2000);
        
    } catch (error) {
        console.error('Erro ao cadastrar:', error);
        errorMsg.textContent = 'Erro ao cadastrar usuário: ' + error.message;
        errorMsg.classList.add('show');
    }
}

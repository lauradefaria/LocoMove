// Script de Registro
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Limpa mensagens anteriores
        errorMessage.textContent = '';
        errorMessage.classList.remove('show');
        successMessage.textContent = '';
        successMessage.classList.remove('show');
        
        // Coleta os dados do formulário
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const birthdate = document.getElementById('birthdate').value;
        const gender = document.getElementById('gender').value;
        const sci_cause = document.getElementById('sci_cause').value;
        const sci_level = document.getElementById('sci_level').value;
        const sci_category = document.getElementById('sci_category').value;
        const sci_severity = document.getElementById('sci_severity').value;
        const sci_class = document.getElementById('sci_class').value;
        
        // Calcula idade a partir da data de nascimento
        const today = new Date();
        const birth = new Date(birthdate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        // Validação de senhas
        if (password !== confirmPassword) {
            errorMessage.textContent = 'As senhas não coincidem!';
            errorMessage.classList.add('show');
            return;
        }
        
        // Validação de idade
        if (age < 1 || age > 150) {
            errorMessage.textContent = 'Por favor, insira uma data de nascimento válida!';
            errorMessage.classList.add('show');
            return;
        }
        
        try {
            // Mostra loading
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Cadastrando...';
            
            // Verifica se o email já está cadastrado
            const { data: existingUser, error: checkError } = await supabase
                .from('users')
                .select('email')
                .eq('email', email);
            
            if (checkError) {
                throw new Error('Erro ao verificar email: ' + checkError.message);
            }
            
            if (existingUser && existingUser.length > 0) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                errorMessage.textContent = 'Este email já está cadastrado!';
                errorMessage.classList.add('show');
                return;
            }
            
            // Prepara os dados para inserção
            const userData = {
                name: name,
                email: email,
                password: password,
                age: age,
                birthdate: birthdate,
                gender: gender,
                sci_cause: sci_cause,
                sci_level: sci_level,
                sci_category: sci_category,
                sci_severity: sci_severity,
                sci_class: sci_class,
                is_admin: false,
                is_active: true
            };
            
            console.log('Tentando inserir usuário:', userData);
            
            // Insere o novo usuário no Supabase
            const { data, error } = await supabase
                .from('users')
                .insert([userData])
                .select();
            
            if (error) {
                console.error('Erro do Supabase:', error);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                throw new Error('Erro ao cadastrar: ' + error.message);
            }
            
            console.log('Usuário cadastrado com sucesso:', data);
            
            // Sucesso!
            successMessage.textContent = 'Cadastro realizado com sucesso! Redirecionando...';
            successMessage.classList.add('show');
            
            // Redireciona após 2 segundos
            setTimeout(() => {
                window.location.href = '../../login.html';
            }, 2000);
            
        } catch (error) {
            console.error('Erro ao cadastrar:', error);
            errorMessage.textContent = error.message;
            errorMessage.classList.add('show');
            
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Cadastrar';
        }
    });
    
    // Validação de senha em tempo real
    document.getElementById('confirmPassword').addEventListener('input', function() {
        const password = document.getElementById('password').value;
        const confirmPassword = this.value;
        
        if (confirmPassword && password !== confirmPassword) {
            this.setCustomValidity('As senhas não coincidem');
        } else {
            this.setCustomValidity('');
        }
    });
});
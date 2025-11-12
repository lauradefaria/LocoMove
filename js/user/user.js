// Dashboard do Usuário
let currentMonth = new Date();
let currentExercises = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('User Dashboard carregado');
    
    // Verifica autenticação
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser) {
        console.error('Usuário não autenticado');
        window.location.href = '../../login.html';
        return;
    }
    
    // Se for admin, redireciona para painel admin
    if (currentUser.is_admin) {
        console.log('Usuário é admin, redirecionando...');
        window.location.href = '../admin/admin.html';
        return;
    }
    
    console.log('Usuário autenticado:', currentUser.name);
    
    // Atualiza nome do usuário
    document.getElementById('userName').textContent = currentUser.name;
    
    // Event listeners
    document.getElementById('viewRecommendationBtn').addEventListener('click', function() {
        console.log('Redirecionando para página de recomendação...');
        window.location.href = 'ai-recommendation.html';
    });
    
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('startExerciseBtn').addEventListener('click', startExercise);
    document.getElementById('viewProfileBtn').addEventListener('click', viewProfile);
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    
    document.getElementById('yearSelect').addEventListener('change', handleYearChange);
    
    // Popula seletor de ano
    populateYearSelector();

    // Atualiza título do mês
    updateMonthTitle();
    
    // Carrega exercícios do mês atual
    loadExercises();
});

async function loadExercises() {
    console.log('Carregando exercícios do mês:', currentMonth);
    
    const calendar = document.getElementById('exercisesCalendar');
    calendar.innerHTML = '<p class="loading">Carregando exercícios...</p>';
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    try {
        // Datas do mês
        const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);
        
        // Atualiza label do mês
        document.getElementById('currentMonth').textContent = 
            startDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        
        console.log('Buscando exercícios de', startDate, 'até', endDate);
        
        // Busca exercícios
        const { data, error } = await supabase
            .from('exercises')
            .select('*')
            .eq('user_id', currentUser.id)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        currentExercises = data || [];
        console.log('Exercícios carregados:', currentExercises.length);
        
        displayExercises(currentExercises, startDate, endDate);
        
    } catch (error) {
        console.error('Erro ao carregar exercícios:', error);
        calendar.innerHTML = `
            <p class="error-message show">
                Erro ao carregar exercícios: ${error.message}
            </p>
        `;
    }
}

function displayExercises(exercises, startDate, endDate) {
    const calendar = document.getElementById('exercisesCalendar');
    
    if (!exercises || exercises.length === 0) {
        calendar.innerHTML = '<p class="no-data">Nenhum exercício realizado neste mês</p>';
        return;
    }
    
    // Agrupa exercícios por dia
    const exercisesByDay = {};
    exercises.forEach(ex => {
        const date = new Date(ex.created_at);
        const dayKey = date.toISOString().split('T')[0];
        if (!exercisesByDay[dayKey]) {
            exercisesByDay[dayKey] = [];
        }
        exercisesByDay[dayKey].push(ex);
    });
    
    // Renderiza lista de dias com exercícios
    calendar.innerHTML = `
        <div class="exercises-list">
            ${Object.keys(exercisesByDay).sort().reverse().map(dayKey => {
                const dayExercises = exercisesByDay[dayKey];
                const date = new Date(dayKey + 'T12:00:00');
                
                return `
                    <div class="exercise-day-card">
                        <div class="day-header">
                            <h3>${date.toLocaleDateString('pt-BR', { 
                                weekday: 'long', 
                                day: 'numeric', 
                                month: 'long',
                                year: 'numeric'
                            })}</h3>
                            <span class="exercise-count">${dayExercises.length} exercício(s)</span>
                        </div>
                        <div class="day-exercises">
                            ${dayExercises.map(ex => {
                                const exDate = new Date(ex.created_at);
                                const duration = ex.total_duration || 0;
                                return `
                                    <div class="exercise-item" onclick="viewExerciseDetails('${ex.id}')">
                                        <div class="exercise-time">
                                            <span class="icon">🕐</span>
                                            ${exDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div class="exercise-stats">
                                            <span><strong>Duração:</strong> ${formatTime(duration)}</span>
                                            <span><strong>Distância:</strong> ${((ex.total_distance || 0) / 1000).toFixed(2)} km</span>
                                            <span><strong>Vel. Média:</strong> ${(ex.avg_velocity || 0).toFixed(2)} m/s</span>
                                        </div>
                                        <div class="exercise-action">
                                            <span class="btn-view-small">Ver Detalhes →</span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function populateYearSelector() {
    const yearSelect = document.getElementById('yearSelect');
    const currentYear = new Date().getFullYear();
    
    // Cria opções de 5 anos atrás até o ano atual
    for (let year = currentYear; year >= currentYear - 5; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) {
            option.selected = true;
        }
        yearSelect.appendChild(option);
    }
}

function handleYearChange(e) {
    const selectedYear = parseInt(e.target.value);
    const currentYear = new Date().getFullYear();
    const currentMonthNum = new Date().getMonth();
    
    // Se mudou para ano diferente do atual, vai para dezembro daquele ano
    if (selectedYear < currentYear) {
        currentMonth = new Date(selectedYear, 11, 1); // Dezembro do ano selecionado
    } else {
        // Se é o ano atual, vai para o mês atual
        currentMonth = new Date(currentYear, currentMonthNum, 1);
    }
    
    updateMonthTitle();
    updateNavigationButtons();
    loadExercises();
}

function changeMonth(delta) {
    console.log('=== Mudando Mês ===');
    console.log('Delta:', delta);
    console.log('Mês atual antes:', currentMonth.toLocaleDateString('pt-BR'));
    
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
    console.log('Novo mês calculado:', newMonth.toLocaleDateString('pt-BR'));
    
    const now = new Date();
    const nowFirstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    
    if (newMonth > nowFirstDay) {
        console.warn('⚠️ Tentativa de ir para mês futuro bloqueada');
        return;
    }
    
    currentMonth = newMonth;
    console.log('✓ Mês atualizado para:', currentMonth.toLocaleDateString('pt-BR'));
    
    // Atualiza o seletor de ano se mudou de ano
    const yearSelect = document.getElementById('yearSelect');
    if (yearSelect.value != currentMonth.getFullYear()) {
        yearSelect.value = currentMonth.getFullYear();
    }
    
    updateMonthTitle();
    updateNavigationButtons();
    loadExercises();
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    
    if (!prevBtn || !nextBtn) return;
    
    const now = new Date();
    const nowFirstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const isCurrentMonth = currentMonth.getTime() === nowFirstDay.getTime();
    
    console.log('Estado dos botões:');
    console.log('  Mês sendo exibido:', currentMonth.toLocaleDateString('pt-BR'));
    console.log('  Mês atual real:', nowFirstDay.toLocaleDateString('pt-BR'));
    console.log('  É mês atual?', isCurrentMonth);
    
    if (isCurrentMonth) {
        nextBtn.disabled = true;
        nextBtn.style.opacity = '0.5';
        nextBtn.style.cursor = 'not-allowed';
    } else {
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
        nextBtn.style.cursor = 'pointer';
    }
    
    prevBtn.disabled = false;
    prevBtn.style.opacity = '1';
    prevBtn.style.cursor = 'pointer';
}

function updateMonthTitle() {
    const monthTitle = document.getElementById('currentMonthYear');
    if (monthTitle) {
        const monthName = currentMonth.toLocaleDateString('pt-BR', { 
            month: 'long', 
            year: 'numeric' 
        });
        // Capitaliza primeira letra
        monthTitle.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        console.log('✓ Título atualizado:', monthName);
    }
}

function startExercise() {
    console.log('Iniciando exercício...');
    window.location.href = 'exercise-session.html';
}

function viewProfile() {
    console.log('Visualizando perfil...');
    window.location.href = 'user-profile.html';
}

function viewExerciseDetails(exerciseId) {
    console.log('Visualizando detalhes do exercício:', exerciseId);
    localStorage.setItem('selectedExerciseId', exerciseId);
    window.location.href = 'exercise-details.html';
}

function logout() {
    console.log('=== LOGOUT INICIADO ===');
    
    // Limpa localStorage
    localStorage.removeItem('currentUser');
    console.log('✓ localStorage limpo');
    
    // Redireciona para a raiz usando caminho absoluto
    const loginUrl = window.location.origin + '/login.html';
    console.log('Redirecionando para:', loginUrl);
    
    window.location.href = loginUrl;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
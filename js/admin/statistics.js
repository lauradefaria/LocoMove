let selectedYear = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Statistics carregado');
    
    window.currentCharts = [];
    
    // Verifica autenticação
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser || !currentUser.is_admin) {
        console.error('Usuário não autenticado ou não é admin');
        window.location.href = '../../login.html';
        return;
    }
    
    // Pega ID do usuário
    const userId = localStorage.getItem('selectedUserId');
    if (!userId) {
        console.error('Nenhum userId selecionado');
        window.location.href = 'manage-users.html';
        return;
    }
    
    console.log('Carregando estatísticas para userId:', userId);
    
    // Carrega dados do usuário e verifica se é admin
    await loadUserInfo(userId);
    
    if (window.selectedUser && window.selectedUser.is_admin) {
        console.log('Usuário é admin, não carrega estatísticas');
        return;
    }

    // Popula seletor de ano
    populateStatsYearSelector();
    
    // Event listener para ano
    document.getElementById('statsYearSelect').addEventListener('change', function() {
        selectedYear = parseInt(this.value);
        const activePeriod = document.querySelector('.btn-period.active').getAttribute('data-period');
        loadStatistics(activePeriod);
    });
    
    // Event listeners dos botões de período
    document.querySelectorAll('.btn-period').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.btn-period').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const period = this.getAttribute('data-period');
            loadStatistics(period);
        });
    });
    
    // Carrega estatísticas do último mês por padrão
    loadStatistics('month');
});

async function loadUserInfo(userId) {
    console.log('Carregando informações do usuário:', userId);
    
    try {
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase não está configurado');
        }
        
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        
        console.log('Resposta do Supabase (user):', { data, error });
        
        if (error) throw error;
        
        if (!data) {
            throw new Error('Usuário não encontrado');
        }
        
        window.selectedUser = data;
        
        console.log('Usuário carregado:', data);
        
        // Verifica se é admin
        if (data.is_admin) {
            console.log('Usuário é admin, não há estatísticas');
            document.getElementById('userStatsTitle').textContent = 
                `${data.name} - Administrador`;
            
            const container = document.getElementById('statsContainer');
            container.innerHTML = `
                <div class="admin-stats-message">
                    <div class="info-icon">👑</div>
                    <h2>Conta Administrativa</h2>
                    <p><strong>${data.name}</strong> é um administrador do sistema.</p>
                    <p>Administradores não realizam exercícios, portanto não há estatísticas de desempenho disponíveis.</p>
                    <button onclick="window.location.href='user-profile.html'" class="btn-primary" style="margin-top: 20px;">
                        ← Voltar ao Perfil
                    </button>
                </div>
            `;
            
            const periodSelector = document.querySelector('.period-selector');
            if (periodSelector) {
                periodSelector.style.display = 'none';
            }
            
            return;
        }
        
        document.getElementById('userStatsTitle').textContent = 
            `Análise de Desempenho - ${data.name}`;
        
    } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        document.getElementById('userStatsTitle').textContent = 
            'Erro ao carregar usuário: ' + error.message;
    }
}

function populateStatsYearSelector() {
    const yearSelect = document.getElementById('statsYearSelect');
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
    
    selectedYear = currentYear;
}

async function loadStatistics(period) {
    console.log('='.repeat(50));
    console.log('Carregando estatísticas para período:', period);
    console.log('Ano selecionado:', selectedYear);
    
    const container = document.getElementById('statsContainer');
    container.innerHTML = '<p class="loading">Carregando estatísticas...</p>';
    
    // Destrói gráficos anteriores
    if (window.currentCharts && Array.isArray(window.currentCharts)) {
        window.currentCharts.forEach(chart => {
            try {
                if (chart && typeof chart.destroy === 'function') {
                    chart.destroy();
                }
            } catch (e) {
                console.warn('Erro ao destruir gráfico:', e);
            }
        });
    }
    window.currentCharts = [];
    
    if (!window.selectedUser) {
        console.error('selectedUser não está definido');
        container.innerHTML = '<p class="error-message show">Erro: Usuário não carregado</p>';
        return;
    }
    
    try {
        // Calcula datas baseado no ano selecionado
        const currentYear = new Date().getFullYear();
        const isCurrentYear = selectedYear === currentYear;
        
        let endDate;
        if (isCurrentYear) {
            endDate = new Date(); // Hoje
        } else {
            endDate = new Date(selectedYear, 11, 31, 23, 59, 59); // Último dia do ano selecionado
        }
        
        let startDate = new Date();
        
        switch (period) {
            case 'month':
                if (isCurrentYear) {
                    startDate.setMonth(endDate.getMonth() - 1);
                } else {
                    // Se não é ano atual, pega último mês daquele ano
                    startDate = new Date(selectedYear, 11, 1); // Dezembro do ano
                }
                break;
            case 'semester':
                if (isCurrentYear) {
                    startDate.setMonth(endDate.getMonth() - 6);
                } else {
                    // Últimos 6 meses do ano selecionado
                    startDate = new Date(selectedYear, 6, 1); // Julho até Dezembro
                }
                break;
            case 'year':
                // Todo o ano selecionado
                startDate = new Date(selectedYear, 0, 1);
                break;
        }
        
        console.log('Período de busca:');
        console.log('  Start:', startDate.toISOString());
        console.log('  End:', endDate.toISOString());
        console.log('  User ID:', window.selectedUser.id);
        
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase não está configurado');
        }
        
        // Busca exercícios
        const { data: exercises, error } = await supabase
            .from('exercises')
            .select('*')
            .eq('user_id', window.selectedUser.id)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: true });
        
        console.log('Exercícios encontrados:', exercises?.length || 0);
        
        if (error) {
            console.error('Erro do Supabase:', error);
            throw error;
        }
        
        if (!exercises || exercises.length === 0) {
            console.log('Nenhum exercício encontrado');
            container.innerHTML = `<p class="no-data">Nenhum exercício encontrado em ${selectedYear} para este período</p>`;
            return;
        }
        
        const chartData = prepareChartData(exercises, period);
        renderStatistics(container, chartData, exercises);
        console.log('='.repeat(50));
        
    } catch (error) {
        console.error('ERRO ao carregar estatísticas:', error);
        container.innerHTML = `
            <p class="error-message show">
                Erro ao carregar estatísticas: ${error.message}
            </p>
            <button onclick="location.reload()" class="btn-primary" style="margin-top: 10px;">
                Tentar Novamente
            </button>
        `;
    }
}

function prepareChartData(exercises, period) {
    console.log('Preparando dados do gráfico para', exercises.length, 'exercícios');
    
    const labels = [];
    const avgVelocities = [];
    const avgAccelerations = [];
    const totalDistances = [];
    const normalizedDistances = [];
    
    exercises.forEach(ex => {
        const date = new Date(ex.created_at);
        const label = period === 'month' 
            ? date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
            : date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
        
        labels.push(label);
        
        // Calcula métricas ajustadas
        const metrics = calculateExerciseMetrics(ex);
        avgVelocities.push(metrics.avgVelocity);
        avgAccelerations.push(metrics.avgAcceleration);
        totalDistances.push(ex.total_distance || 0);
        
        // Distância normalizada (metros por minuto)
        const duration = ex.total_duration || 0;
        const distancePerMinute = duration > 0 
            ? (ex.total_distance || 0) / (duration / 60)
            : 0;
        normalizedDistances.push(distancePerMinute);
    });
    
    console.log('Dados preparados:', {
        labels: labels.length,
        avgVelocities: avgVelocities.length,
        avgAccelerations: avgAccelerations.length,
        totalDistances: totalDistances.length,
        normalizedDistances: normalizedDistances.length
    });
    
    return { 
        labels, 
        avgVelocities, 
        avgAccelerations, 
        totalDistances,
        normalizedDistances
    };
}

function calculateExerciseMetrics(exercise) {
    let velocities = [];
    try {
        if (exercise.velocity_data && typeof exercise.velocity_data === 'string') {
            velocities = JSON.parse(exercise.velocity_data);
        }
    } catch (e) {
        return {
            avgVelocity: exercise.avg_velocity || 0,
            avgAcceleration: exercise.avg_acceleration || 0
        };
    }
    
    if (!Array.isArray(velocities) || velocities.length === 0) {
        return {
            avgVelocity: exercise.avg_velocity || 0,
            avgAcceleration: exercise.avg_acceleration || 0
        };
    }
    
    const totalPoints = velocities.length;
    const skipInitial = Math.min(30, Math.floor(totalPoints * 0.3));
    const skipFinalAvg = Math.min(15, Math.floor(totalPoints * 0.15));
    
    // Velocidade média
    const velocitiesForAvg = velocities.slice(skipInitial, totalPoints - skipFinalAvg);
    const avgVelocity = velocitiesForAvg.length > 0 
        ? velocitiesForAvg.reduce((a, b) => a + b, 0) / velocitiesForAvg.length 
        : 0;
    
    // Aceleração média
    let accelerations = [];
    for (let i = 1; i < velocitiesForAvg.length; i++) {
        accelerations.push(velocitiesForAvg[i] - velocitiesForAvg[i - 1]);
    }
    const avgAcceleration = accelerations.length > 0 
        ? accelerations.reduce((a, b) => a + b, 0) / accelerations.length 
        : 0;
    
    return { avgVelocity, avgAcceleration };
}

function renderStatistics(container, chartData, exercises) {
    console.log('Renderizando estatísticas');
    
    // Calcula resumos
    const totalExercises = exercises.length;
    // CORRIGIDO: usa total_duration ao invés de total_duration
    const avgDuration = exercises.reduce((sum, ex) => sum + (ex.total_duration || ex.total_duration || 0), 0) / totalExercises;
    const totalDistance = exercises.reduce((sum, ex) => sum + (ex.total_distance || 0), 0);
    const avgVelocity = chartData.avgVelocities.reduce((a, b) => a + b, 0) / chartData.avgVelocities.length;
    const avgAcceleration = chartData.avgAccelerations.reduce((a, b) => a + b, 0) / chartData.avgAccelerations.length;
    const avgNormalizedDistance = chartData.normalizedDistances.reduce((a, b) => a + b, 0) / chartData.normalizedDistances.length;
    
    container.innerHTML = `
        <div class="stats-summary">
            <div class="stat-box">
                <h3>${totalExercises}</h3>
                <p>Exercícios Realizados</p>
            </div>
            <div class="stat-box">
                <h3>${formatTime(Math.round(avgDuration))}</h3>
                <p>Duração Média</p>
            </div>
            <div class="stat-box">
                <h3>${(totalDistance / 1000).toFixed(2)} km</h3>
                <p>Distância Total</p>
            </div>
            <div class="stat-box">
                <h3>${avgVelocity.toFixed(2)} m/s</h3>
                <p>Velocidade Média</p>
            </div>
            <div class="stat-box">
                <h3>${avgAcceleration.toFixed(3)} m/s²</h3>
                <p>Aceleração Média</p>
            </div>
            <div class="stat-box">
                <h3>${avgNormalizedDistance.toFixed(2)} m/min</h3>
                <p>Ritmo Médio</p>
            </div>
        </div>
        
        <div class="charts-grid">
            <div class="chart-container">
                <h3>Velocidade Média por Exercício</h3>
                <canvas id="velocityChart"></canvas>
            </div>
            
            <div class="chart-container">
                <h3>Aceleração Média por Exercício</h3>
                <canvas id="accelerationChart"></canvas>
            </div>
            
            <div class="chart-container">
                <h3>Distância Total por Exercício</h3>
                <canvas id="distanceChart"></canvas>
            </div>
            
            <div class="chart-container">
                <h3>Ritmo (Distância/Tempo) por Exercício</h3>
                <canvas id="normalizedDistanceChart"></canvas>
            </div>
        </div>
        
        <div class="performance-analysis">
            <h3>Análise de Desempenho</h3>
            <div class="analysis-cards">
                ${analyzePerformance(chartData, exercises)}
            </div>
        </div>
    `;
    
    // Renderiza gráficos
    setTimeout(() => {
        console.log('Criando gráficos');
        
        // Verifica se Chart está disponível
        if (typeof Chart === 'undefined') {
            console.error('Chart.js não está carregado');
            return;
        }
        
        try {
            window.currentCharts.push(createChart('velocityChart', chartData.labels, chartData.avgVelocities, 'Velocidade (m/s)', '#667eea'));
            window.currentCharts.push(createChart('accelerationChart', chartData.labels, chartData.avgAccelerations, 'Aceleração (m/s²)', '#764ba2'));
            window.currentCharts.push(createChart('distanceChart', chartData.labels, chartData.totalDistances, 'Distância (m)', '#48bb78'));
            window.currentCharts.push(createChart('normalizedDistanceChart', chartData.labels, chartData.normalizedDistances, 'Metros por Minuto', '#f6ad55'));
            
            console.log('Gráficos criados:', window.currentCharts.length);
        } catch (error) {
            console.error('Erro ao criar gráficos:', error);
        }
    }, 100);
}

function analyzePerformance(chartData, exercises) {
    let insights = [];
    
    // Análise de tendência de velocidade
    const velocities = chartData.avgVelocities;
    if (velocities.length >= 3) {
        const first = velocities.slice(0, Math.ceil(velocities.length / 3)).reduce((a, b) => a + b) / Math.ceil(velocities.length / 3);
        const last = velocities.slice(-Math.ceil(velocities.length / 3)).reduce((a, b) => a + b) / Math.ceil(velocities.length / 3);
        const change = ((last - first) / first) * 100;
        
        if (change > 5) {
            insights.push({
                icon: '📈',
                title: 'Velocidade em Crescimento',
                text: `A velocidade média aumentou ${change.toFixed(1)}% no período analisado.`,
                type: 'positive'
            });
        } else if (change < -5) {
            insights.push({
                icon: '📉',
                title: 'Velocidade em Declínio',
                text: `A velocidade média diminuiu ${Math.abs(change).toFixed(1)}% no período analisado.`,
                type: 'negative'
            });
        } else {
            insights.push({
                icon: '➡️',
                title: 'Velocidade Estável',
                text: 'A velocidade média permaneceu consistente no período.',
                type: 'neutral'
            });
        }
    }
    
    // Análise de consistência
    const stdDev = calculateStdDev(velocities);
    const mean = velocities.reduce((a, b) => a + b) / velocities.length;
    const cv = (stdDev / mean) * 100;
    
    if (cv < 10) {
        insights.push({
            icon: '🎯',
            title: 'Alta Consistência',
            text: 'O desempenho tem sido muito consistente entre os exercícios.',
            type: 'positive'
        });
    } else if (cv > 25) {
        insights.push({
            icon: '⚠️',
            title: 'Desempenho Variável',
            text: 'Há variação significativa no desempenho entre os exercícios.',
            type: 'warning'
        });
    }
    
    // Análise de distância
    const distances = chartData.normalizedDistances;
    const avgDistance = distances.reduce((a, b) => a + b) / distances.length;
    const maxDistance = Math.max(...distances);
    
    if (maxDistance > avgDistance * 1.3) {
        insights.push({
            icon: '🏆',
            title: 'Recorde de Ritmo',
            text: `Um exercício alcançou ${maxDistance.toFixed(2)} m/min, ${((maxDistance/avgDistance - 1) * 100).toFixed(0)}% acima da média.`,
            type: 'positive'
        });
    }
    
    return insights.map(insight => `
        <div class="analysis-card ${insight.type}">
            <div class="analysis-icon">${insight.icon}</div>
            <div class="analysis-content">
                <h4>${insight.title}</h4>
                <p>${insight.text}</p>
            </div>
        </div>
    `).join('');
}

function calculateStdDev(values) {
    const mean = values.reduce((a, b) => a + b) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b) / squaredDiffs.length;
    return Math.sqrt(avgSquaredDiff);
}

function createChart(canvasId, labels, data, label, color) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.error('Canvas não encontrado:', canvasId);
        return null;
    }
    
    console.log('Criando gráfico:', canvasId);
    
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                borderColor: color,
                backgroundColor: color + '20',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
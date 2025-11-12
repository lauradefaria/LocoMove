// Exercise Details - Visualização detalhada de UM exercício específico

let currentUser = null;
let currentExercise = null;
let charts = {
    velocity: null,
    acceleration: null,
    distance: null
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('Exercise Details carregado');
    
    // Verifica autenticação
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser) {
        console.error('Usuário não autenticado');
        window.location.href = '../../login.html';
        return;
    }
    
    // Se for admin, adiciona botão de apagar
    if (currentUser.is_admin) {
        const deleteBtn = document.getElementById('deleteExerciseBtn');
        if (deleteBtn) {
            deleteBtn.style.display = 'block';
            deleteBtn.addEventListener('click', deleteExercise);
        }
    }
    
    // Botão voltar
    const backBtn = document.querySelector('.back-button');
    if (backBtn) {
        backBtn.addEventListener('click', goBack);
    }
    
    // Carrega dados do exercício
    const exerciseId = localStorage.getItem('selectedExerciseId');
    if (!exerciseId) {
        alert('Nenhum exercício selecionado');
        goBack();
        return;
    }
    
    console.log('ID do exercício selecionado:', exerciseId);
    loadExerciseDetails(exerciseId);
});

async function loadExerciseDetails(exerciseId) {
    console.log('=== Carregando detalhes do exercício ===');
    
    try {
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase não está configurado');
        }
        
        const { data, error } = await supabase
            .from('exercises')
            .select('*')
            .eq('id', exerciseId)
            .single();
        
        if (error) throw error;
        if (!data) throw new Error('Exercício não encontrado');
        
        currentExercise = data;
        console.log('✅ Exercício carregado:', currentExercise);
        
        displayExerciseDetails();
        displayExerciseCharts();
        
    } catch (error) {
        console.error('❌ Erro ao carregar exercício:', error);
        alert('Erro ao carregar exercício: ' + error.message);
        goBack();
    }
}

function displayExerciseDetails() {
    const exercise = currentExercise;
    
    // Data e hora do exercício
    const exerciseDate = new Date(exercise.created_at);
    document.getElementById('exerciseDate').textContent = 
        exerciseDate.toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long',
            year: 'numeric'
        }) + ' às ' + exerciseDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    // Valores
    const totalDuration = exercise.total_duration || 0;
    const totalDistance = exercise.total_distance || 0;
    const maxVelocity = exercise.max_velocity || 0;
    const minVelocity = exercise.min_velocity || 0;
    const avgVelocity = exercise.avg_velocity || 0;
    const avgAcceleration = exercise.avg_acceleration || 0;
    
    // Tempo total
    const minutes = (totalDuration / 60).toFixed(2);
    document.getElementById('detailTotalTime').textContent = minutes;
    
    // Distância
    document.getElementById('detailTotalDistance').textContent = (totalDistance / 1000).toFixed(2);
    
    // Velocidades
    document.getElementById('detailAvgVelocity').textContent = avgVelocity.toFixed(2);
    document.getElementById('detailMaxVelocity').textContent = maxVelocity.toFixed(2);
    document.getElementById('detailMinVelocity').textContent = minVelocity.toFixed(2);
    
    // Aceleração
    document.getElementById('detailAvgAcceleration').textContent = avgAcceleration.toFixed(4);
}

function displayExerciseCharts() {
    console.log('=== Exibindo gráficos do exercício ===');
    
    // Parse velocity_data
    let velocityData = [];
    try {
        if (currentExercise.velocity_data) {
            if (typeof currentExercise.velocity_data === 'string') {
                velocityData = JSON.parse(currentExercise.velocity_data);
            } else {
                velocityData = currentExercise.velocity_data;
            }
        }
    } catch (e) {
        console.error('Erro ao parsear velocity_data:', e);
    }
    
    console.log('Dados de velocidade:', velocityData);
    
    if (!velocityData || velocityData.length === 0) {
        showNoDataMessage();
        return;
    }
    
    // Prepara dados para os gráficos
    const timestamps = velocityData.map(d => formatTimestamp(d.timestamp));
    const velocities = velocityData.map(d => (d.velocity / 3.6).toFixed(2)); // converte km/h para m/s
    
    // CALCULA ACELERAÇÃO a partir da velocidade
    const accelerations = [];
    for (let i = 0; i < velocities.length; i++) {
        if (i === 0) {
            accelerations.push(0); // primeira aceleração é zero
        } else {
            // aceleração = (velocidade_atual - velocidade_anterior) / intervalo_tempo
            // intervalo entre leituras é 1 segundo
            const acc = (parseFloat(velocities[i]) - parseFloat(velocities[i - 1])) / 1.0;
            accelerations.push(acc.toFixed(4));
        }
    }
    
    console.log('Acelerações calculadas:', accelerations.length, 'valores');
    
    // Calcula distância acumulada
    let distances = [];
    let accumulatedDistance = 0;
    velocityData.forEach(d => {
        accumulatedDistance += (d.velocity / 3.6); // m/s * 1s = metros
        distances.push((accumulatedDistance / 1000).toFixed(3)); // em km
    });
    
    // Gráfico de Velocidade
    createChart('velocityChart', 'velocity', {
        labels: timestamps,
        datasets: [{
            label: 'Velocidade (m/s)',
            data: velocities,
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 2,
            pointHoverRadius: 5
        }]
    }, 'Velocidade ao Longo do Exercício');
    
    // Gráfico de Aceleração
    createChart('accelerationChart', 'acceleration', {
        labels: timestamps,
        datasets: [{
            label: 'Aceleração (m/s²)',
            data: accelerations,
            borderColor: '#764ba2',
            backgroundColor: 'rgba(118, 75, 162, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 2,
            pointHoverRadius: 5
        }]
    }, 'Aceleração ao Longo do Exercício');
    
    // Gráfico de Distância Acumulada
    createChart('distanceChart', 'distance', {
        labels: timestamps,
        datasets: [{
            label: 'Distância Acumulada (km)',
            data: distances,
            borderColor: '#2ecc71',
            backgroundColor: 'rgba(46, 204, 113, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 2,
            pointHoverRadius: 5
        }]
    }, 'Distância Acumulada ao Longo do Exercício');
}

function formatTimestamp(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function createChart(canvasId, chartKey, data, title) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error('Canvas não encontrado:', canvasId);
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    if (charts[chartKey]) {
        charts[chartKey].destroy();
    }
    
    charts[chartKey] = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: true,
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    ticks: { font: { size: 11 } }
                },
                x: {
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    ticks: { 
                        font: { size: 11 },
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

function showNoDataMessage() {
    const chartsSection = document.querySelector('.details-section:last-child');
    if (chartsSection) {
        chartsSection.innerHTML = `
            <h2>Dados do Exercício</h2>
            <p class="no-data">Nenhum dado detalhado foi registrado durante este exercício.</p>
        `;
    }
}

async function deleteExercise() {
    if (!confirm('Tem certeza que deseja APAGAR este exercício? Esta ação é irreversível!')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('exercises')
            .delete()
            .eq('id', currentExercise.id);
        
        if (error) throw error;
        
        alert('Exercício apagado com sucesso!');
        goBack();
        
    } catch (error) {
        console.error('Erro ao apagar exercício:', error);
        alert('Erro ao apagar exercício: ' + error.message);
    }
}

function goBack() {
    if (currentUser.is_admin) {
        window.location.href = 'user-profile.html';
    } else {
        window.location.href = 'user.html';
    }
}
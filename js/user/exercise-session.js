// Sessão de Exercício - LASID HIIT System
// Integrado com tabela exercises existente

let exerciseState = 'waiting'; // waiting, countdown, active, finished
let countdownValue = 5;
let exerciseStartTime = null;
let exerciseEndTime = null;
let currentExerciseId = null;
let exerciseInterval = null;
let countdownInterval = null;
let sensorSubscription = null;

// Configurações do sensor (baseado no código ESP8266)
const RAIO_RODA = 30.48; // cm - aro 24
const COMPRIMENTO_RODA = (2 * Math.PI * RAIO_RODA) / 100; // em metros

// Dados da sessão
let sessionData = {
    velocities: [],      // Array de objetos {timestamp, velocity}
    velocityData: [],    // Para armazenar no JSONB
    distances: [],
    timestamps: [],
    accelerations: []
};

let lastRotationCount = 0;
let lastRotationTime = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Exercise Session carregado');
    
    // Verifica autenticação
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser) {
        console.error('Usuário não autenticado');
        alert('Você precisa estar logado para iniciar um exercício');
        window.close();
        return;
    }
    
    // Event listeners
    document.getElementById('controlBtn').addEventListener('click', handleControlButton);
    document.getElementById('finishBtn')?.addEventListener('click', finishExercise);

    document.getElementById('backBtn')?.addEventListener('click', () => {
        window.location.href = 'user.html';
    });
});

function handleControlButton() {
    if (exerciseState === 'waiting') {
        startCountdown();
    } else if (exerciseState === 'active') {
        stopExercise();
    }
}

function startCountdown() {
    console.log('Iniciando contagem regressiva...');
    exerciseState = 'countdown';
    
    // UI
    document.getElementById('statusBadge').textContent = 'Preparando...';
    document.getElementById('statusBadge').className = 'status-badge waiting';
    document.getElementById('controlBtn').disabled = true;
    document.getElementById('countdownSection').style.display = 'block';
    
    countdownValue = 5;
    document.getElementById('countdownDisplay').textContent = countdownValue;
    
    countdownInterval = setInterval(() => {
        countdownValue--;
        
        if (countdownValue > 0) {
            document.getElementById('countdownDisplay').textContent = countdownValue;
        } else {
            clearInterval(countdownInterval);
            document.getElementById('countdownSection').style.display = 'none';
            startExercise();
        }
    }, 1000);
}

async function startExercise() {
    console.log('Iniciando exercício...');
    exerciseState = 'active';
    exerciseStartTime = new Date();
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    try {
        // Cria exercício
        const { data: exerciseData, error: exerciseError } = await supabase
            .from('exercises')
            .insert([{
                user_id: currentUser.id,
                exercise_date: exerciseStartTime.toISOString(),
                velocity_data: JSON.stringify([])
            }])
            .select()
            .single();
        
        if (exerciseError) throw exerciseError;
        
        currentExerciseId = exerciseData.id;
        
        // Sinal para ESP iniciar
        const { error: sensorError } = await supabase
            .from('sensor_realtime')
            .upsert({
                user_id: currentUser.id,
                exercise_id: currentExerciseId,
                is_active: true,
                command: 'START',
                rotations_count: 0,
                current_velocity: 0,
                last_rotation_time: 0
            });
        
        if (sensorError) throw sensorError;
        
        // UI
        document.getElementById('statusBadge').textContent = 'Exercício em Andamento';
        document.getElementById('statusBadge').className = 'status-badge active';
        document.getElementById('controlBtn').textContent = 'Parar';
        document.getElementById('controlBtn').className = 'btn-exercise btn-stop';
        document.getElementById('controlBtn').disabled = false;
        
        startRealTimeUpdates();
        subscribeToSensorData();
        
    } catch (error) {
        console.error('Erro ao iniciar exercício:', error);
        alert('Erro ao iniciar exercício: ' + error.message);
        exerciseState = 'waiting';
    }
}

function subscribeToSensorData() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    sensorSubscription = supabase
        .channel('sensor-realtime-channel')
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'sensor_realtime',
                filter: `user_id=eq.${currentUser.id}`
            },
            (payload) => {
                if (payload.new.is_active && exerciseState === 'active') {
                    processSensorData(payload.new);
                }
            }
        )
        .subscribe();
}

function processSensorData(sensorData) {
    const sensorVelocity = parseFloat(sensorData.current_velocity) || 0;
    
    if (sensorVelocity > 0) {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - exerciseStartTime.getTime()) / 1000);
        
        sessionData.velocities.push(sensorVelocity);
        sessionData.velocityData.push({
            timestamp: elapsedSeconds,
            velocity: sensorVelocity
        });
        
        console.log(`Velocidade recebida: ${sensorVelocity.toFixed(2)} km/h aos ${elapsedSeconds}s`);
    }
    
    lastRotationCount = sensorData.rotations_count;
}

function updateMetrics() {
    const now = new Date();
    const elapsedSeconds = Math.floor((now - exerciseStartTime) / 1000);
    
    // Tempo
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    document.getElementById('timeDisplay').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Velocidade
    let currentVelocity = 0;
    if (sessionData.velocities.length > 0) {
        currentVelocity = sessionData.velocities[sessionData.velocities.length - 1];
    }
    const velocityMs = currentVelocity / 3.6;
    document.getElementById('velocityDisplay').textContent = velocityMs.toFixed(2);
    
    // Aceleração - CALCULADA a partir das velocidades
    let currentAcceleration = 0;
    if (sessionData.velocities.length >= 2) {
        const lastVel = sessionData.velocities[sessionData.velocities.length - 1] / 3.6;
        const prevVel = sessionData.velocities[sessionData.velocities.length - 2] / 3.6;
        currentAcceleration = lastVel - prevVel; // diferença entre leituras (1 segundo)
    }
    document.getElementById('accelerationDisplay').textContent = currentAcceleration.toFixed(4);
    
    // Distância
    const totalDistanceMeters = sessionData.velocities.reduce((sum, v) => sum + (v / 3.6), 0);
    document.getElementById('distanceDisplay').textContent = (totalDistanceMeters / 1000).toFixed(2);
    
    sessionData.timestamps.push(elapsedSeconds);
    sessionData.distances.push(totalDistanceMeters);
    
    return { currentVelocity, currentAcceleration, totalDistanceMeters, elapsedSeconds };
}

async function stopExercise() {
    console.log('Parando exercício...');
    exerciseState = 'finished';
    exerciseEndTime = new Date();
    
    clearInterval(exerciseInterval);
    
    if (sensorSubscription) {
        supabase.removeChannel(sensorSubscription);
    }
    
    // Sinal para ESP parar
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    await supabase
        .from('sensor_realtime')
        .update({ 
            is_active: false,
            command: 'STOP'
        })
        .eq('user_id', currentUser.id)
        .eq('exercise_id', currentExerciseId);
    
    // UI
    document.getElementById('statusBadge').textContent = 'Exercício Finalizado';
    document.getElementById('statusBadge').className = 'status-badge finished';
    document.getElementById('controlBtn').style.display = 'none';
    
    const results = calculateResults();
    
    // Atualiza com dados finais
    await supabase
        .from('exercises')
        .update({
            velocity_data: JSON.stringify(sessionData.velocityData),
            max_velocity: results.maxVelocity,
            min_velocity: results.minVelocity,
            avg_velocity: results.avgVelocity,
            avg_acceleration: results.avgAcceleration,
            total_duration: results.totalDuration,
            total_distance: results.totalDistance
        })
        .eq('id', currentExerciseId);
    
    displayResults(results);
}

function calculateResults() {
    const totalDuration = Math.floor((exerciseEndTime - exerciseStartTime) / 1000);
    const totalDistance = sessionData.distances.length > 0 
        ? sessionData.distances[sessionData.distances.length - 1] 
        : 0;
    
    if (sessionData.velocities.length === 0) {
        return {
            totalDuration,
            totalDistance,
            maxVelocity: 0,
            minVelocity: 0,
            avgVelocity: 0,
            avgAcceleration: 0
        };
    }
    
    // Converte velocidades de km/h para m/s
    const velocitiesMs = sessionData.velocities.map(v => v / 3.6);
    
    // Velocidade máxima e mínima (excluindo primeiros e últimos 30 segundos)
    const startExclude = Math.min(30, Math.floor(velocitiesMs.length * 0.2));
    const endExclude = Math.max(0, velocitiesMs.length - Math.min(30, Math.floor(velocitiesMs.length * 0.2)));
    const middleVelocities = velocitiesMs.slice(startExclude, endExclude);
    
    const maxVelocity = middleVelocities.length > 0 ? Math.max(...middleVelocities) : 0;
    const minVelocity = middleVelocities.length > 0 ? Math.min(...middleVelocities.filter(v => v > 0)) : 0;
    
    // Velocidade média (excluindo primeiros 30 e últimos 15 segundos)
    const avgStartExclude = Math.min(30, Math.floor(velocitiesMs.length * 0.2));
    const avgEndExclude = Math.max(0, velocitiesMs.length - Math.min(15, Math.floor(velocitiesMs.length * 0.1)));
    const avgVelocities = velocitiesMs.slice(avgStartExclude, avgEndExclude);
    const avgVelocity = avgVelocities.length > 0 
        ? avgVelocities.reduce((sum, v) => sum + v, 0) / avgVelocities.length 
        : 0;
    
    // CALCULA ACELERAÇÃO a partir das velocidades
    let accelerations = [];
    for (let i = 1; i < velocitiesMs.length; i++) {
        // aceleração = (velocidade_atual - velocidade_anterior) / intervalo_tempo (1 segundo)
        accelerations.push(velocitiesMs[i] - velocitiesMs[i - 1]);
    }
    
    // Aceleração média (mesma faixa da velocidade média)
    const avgAccelerations = accelerations.slice(avgStartExclude, Math.min(avgEndExclude, accelerations.length));
    const avgAcceleration = avgAccelerations.length > 0
        ? avgAccelerations.reduce((sum, a) => sum + a, 0) / avgAccelerations.length
        : 0;
    
    console.log('Resultados calculados:', {
        totalDuration,
        totalDistance,
        maxVelocity,
        minVelocity,
        avgVelocity,
        avgAcceleration,
        totalVelocities: velocitiesMs.length,
        totalAccelerations: accelerations.length
    });
    
    return {
        totalDuration,
        totalDistance,
        maxVelocity: parseFloat(maxVelocity.toFixed(2)),
        minVelocity: parseFloat(minVelocity.toFixed(2)),
        avgVelocity: parseFloat(avgVelocity.toFixed(2)),
        avgAcceleration: parseFloat(avgAcceleration.toFixed(4))
    };
}

async function saveReading() {
    if (!exerciseActive || sessionData.velocities.length === 0) return;
    
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - exerciseStartTime.getTime()) / 1000);
    const currentVelocity = sessionData.velocities[sessionData.velocities.length - 1];
    const currentDistance = sessionData.distances[sessionData.distances.length - 1];
    
    try {
        await supabase
            .from('exercise_readings')
            .insert([{
                exercise_id: currentExerciseId,
                timestamp: elapsedSeconds,
                velocity: currentVelocity / 3.6, // converte para m/s
                distance: currentDistance,
                rotations: lastRotationCount
            }]);
    } catch (error) {
        console.error('Erro ao salvar leitura:', error);
    }
}

function startRealTimeUpdates() {
    exerciseInterval = setInterval(() => {
        updateMetrics();
        saveReading(); // ADICIONAR - salva a cada 1s
    }, 1000);
}

function displayResults(results) {
    // Exibe seção de resultados
    document.getElementById('resultsSection').style.display = 'block';
    
    // Preenche valores
    const minutes = Math.floor(results.totalDuration / 60);
    const seconds = results.totalDuration % 60;
    document.getElementById('resultTotalTime').textContent = 
        `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    document.getElementById('resultTotalDistance').textContent = 
        (results.totalDistance / 1000).toFixed(2);
    
    document.getElementById('resultAvgVelocity').textContent = 
        results.avgVelocity.toFixed(2);
    
    document.getElementById('resultMaxVelocity').textContent = 
        results.maxVelocity.toFixed(2);
    
    document.getElementById('resultMinVelocity').textContent = 
        results.minVelocity.toFixed(2);
    
    document.getElementById('resultAvgAcceleration').textContent = 
        results.avgAcceleration.toFixed(4);
}

function finishExercise() {
    console.log('Finalizando e retornando ao dashboard...');
    window.location.href = 'user.html';
}
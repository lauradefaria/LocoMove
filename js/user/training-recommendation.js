// training-recommendation.js - Sistema de Recomendação de Treino com IA

const trainingRecommendation = {
    /**
     * Obtém recomendação de treino para o usuário
     * @param {string} userId - ID do usuário
     * @returns {Object} Recomendação de treino
     */
    async getRecommendation(userId) {
        console.log('🤖 Iniciando geração de recomendação para usuário:', userId);
        
        try {
            // 1. Buscar treino ativo existente
            const { data: activeWorkout } = await supabase
                .from('treinos_recomendados')
                .select('*')
                .eq('user_id', userId)
                .eq('ativo', true)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();
            
            // Se tem treino ativo e ainda válido (menos de 3 meses), retornar ele
            if (activeWorkout && !this.needsRegeneration(activeWorkout.updated_at)) {
                console.log('✓ Treino ativo encontrado e ainda válido');
                
                // Verificar se foi ajustado manualmente
                if (activeWorkout.ajustado_manualmente) {
                    return this.formatRecommendation(activeWorkout, 'manual');
                }
                
                return this.formatRecommendation(activeWorkout, 'existing');
            }
            
            // 2. Verificar se usuário tem exercícios
            const { data: userExercises, error: exError } = await supabase
                .from('exercises')
                .select('*')
                .eq('user_id', userId)
                .order('exercise_date', { ascending: false });
            
            if (exError) throw exError;
            
            // OPÇÃO 3: Sem exercícios
            if (!userExercises || userExercises.length === 0) {
                console.log('⚠️ Usuário sem exercícios - retornando null');
                return null;
            }
            
            console.log(`✓ Usuário possui ${userExercises.length} exercício(s)`);
            
            console.log('🔄 Gerando nova recomendação...');
            
            // 3. Gerar nova recomendação
            return await this.generateNewRecommendation(userId, userExercises);
            
        } catch (error) {
            console.error('❌ Erro ao gerar recomendação:', error);
            throw error;
        }
    },
    
    /**
     * Gera nova recomendação de treino
     */
    async generateNewRecommendation(userId, userExercises) {
        try {
            // Buscar dados do usuário atual
            const { data: currentUser, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
            
            if (userError) throw userError;
            
            console.log('✓ Dados do usuário carregados:', currentUser.name);
            
            // Buscar outros usuários (não admin e diferente do atual)
            const { data: allUsers, error: usersError } = await supabase
                .from('users')
                .select('*')
                .eq('is_admin', false)
                .neq('id', userId);
            
            if (usersError) throw usersError;
            
            console.log(`✓ ${allUsers?.length || 0} usuário(s) encontrado(s) para comparação`);
            
            let recommendation = null;
            let source = null;
            
            // OPÇÃO 1: Tentar KNN com usuários similares
            if (allUsers && allUsers.length > 0) {
                const usersWithExercises = await this.getUsersWithRecentExercises(allUsers);
                
                console.log(`✓ ${usersWithExercises.length} usuário(s) com exercícios recentes`);
                
                if (usersWithExercises.length > 0) {
                    // Filtrar apenas usuários com progresso estável
                    const usersWithStableProgress = usersWithExercises.filter(({ exercises }) => 
                        this.checkProgressStability(exercises)
                    );
                    
                    console.log(`✓ ${usersWithStableProgress.length} usuário(s) com progresso estável`);
                    
                    if (usersWithStableProgress.length > 0) {
                        recommendation = await this.generateKNNRecommendation(
                            currentUser, 
                            usersWithStableProgress, 
                            userExercises
                        );
                        source = 'knn';
                        
                        console.log(`KNN gerado - Confiança: ${recommendation?.confidence}%`);
                    }
                }
            }
            
            // OPÇÃO 2: Se confiança baixa ou sem KNN, usar melhor exercício próprio
            if (!recommendation || recommendation.confidence < 70) {
                console.log('⚠️ Confiança baixa ou KNN indisponível - usando melhor exercício');
                recommendation = this.generateFromBestExercise(userExercises);
                source = 'best_exercise';
            }
            
            // Salvar no banco
            await this.saveRecommendation(userId, recommendation);
            
            console.log('✓ Recomendação salva no banco');
            
            // Formatar e retornar
            return this.formatRecommendation(recommendation, source);
            
        } catch (error) {
            console.error('❌ Erro ao gerar nova recomendação:', error);
            throw error;
        }
    },
    
    /**
     * Busca usuários com exercícios recentes (últimos 3 meses)
     */
    async getUsersWithRecentExercises(users) {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        const usersWithExercises = [];
        
        for (const user of users) {
            const { data: exercises } = await supabase
                .from('exercises')
                .select('*')
                .eq('user_id', user.id)
                .gte('exercise_date', threeMonthsAgo.toISOString())
                .order('exercise_date', { ascending: false })
                .limit(10);
            
            if (exercises && exercises.length >= 3) {
                usersWithExercises.push({ user, exercises });
            }
        }
        
        return usersWithExercises;
    },
    
    /**
     * Verifica se o progresso do usuário está estável ou melhorando
     */
    checkProgressStability(exercises) {
        if (exercises.length < 3) return false;
        
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        const recentExercises = exercises.filter(ex => 
            new Date(ex.exercise_date) >= threeMonthsAgo
        );
        
        if (recentExercises.length < 3) return false;
        
        // Analisar velocidades
        const velocities = recentExercises.map(ex => ex.avg_velocity || 0);
        
        const firstHalf = velocities.slice(0, Math.floor(velocities.length / 2));
        const secondHalf = velocities.slice(Math.floor(velocities.length / 2));
        
        const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        
        const changePercent = Math.abs(((avgSecond - avgFirst) / avgFirst) * 100);
        
        // Estável (mudança < 10%) ou progredindo (segunda metade >= primeira)
        return changePercent < 10 || avgSecond >= avgFirst;
    },
    
    /**
     * Gera recomendação usando KNN
     */
    async generateKNNRecommendation(currentUser, usersWithExercises, userExercises) {
        // Calcular distâncias entre usuários
        const distances = usersWithExercises.map(({ user, exercises }) => ({
            user,
            exercises,
            distance: this.calculateUserDistance(currentUser, user)
        }));
        
        // K=5 vizinhos mais próximos
        const kNearest = distances
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 5);
        
        if (kNearest.length === 0) return null;
        
        console.log(`✓ ${kNearest.length} vizinhos mais próximos encontrados`);
        
        // Calcular métricas médias dos vizinhos
        const allExercises = kNearest.flatMap(k => k.exercises);
        const avgVelocity = allExercises.reduce((sum, ex) => sum + (ex.avg_velocity || 0), 0) / allExercises.length;
        const avgDuration = allExercises.reduce((sum, ex) => sum + (ex.total_duration || 0), 0) / allExercises.length;
        const avgDistance = allExercises.reduce((sum, ex) => sum + (ex.total_distance || 0), 0) / allExercises.length;
        const avgAcceleration = allExercises.reduce((sum, ex) => sum + (ex.avg_acceleration || 0), 0) / allExercises.length;
        
        // Calcular confiança
        const userScore = Math.min(kNearest.length / 5, 1) * 40; // Até 40% pela quantidade de usuários
        const exerciseScore = Math.min(allExercises.length / 20, 1) * 60; // Até 60% pela quantidade de exercícios
        const confidence = Math.round(userScore + exerciseScore);
        
        console.log(`✓ Confiança calculada: ${confidence}% (usuários: ${userScore}%, exercícios: ${exerciseScore}%)`);
        
        return {
            velocidade_alvo: parseFloat((avgVelocity * 0.80).toFixed(2)), // 80% da média
            tempo_trabalho: Math.round(avgDuration * 0.30), // 30% do tempo como sprint
            tempo_descanso: Math.round(avgDuration * 0.30),
            repeticoes: 8,
            observacoes: `Baseado em ${kNearest.length} usuário(s) similar(es) com ${allExercises.length} exercício(s).`,
            confidence,
            targetDistance: parseFloat((avgDistance / 1000).toFixed(2)),
            targetAcceleration: parseFloat(avgAcceleration.toFixed(2)),
            similarProfiles: kNearest.map(k => ({
                name: k.user.name,
                age: k.user.age,
                sci_category: k.user.sci_category,
                sci_level: k.user.sci_level,
                exerciseCount: k.exercises.length,
                distance: k.distance
            }))
        };
    },
    
    /**
     * Calcula distância euclidiana entre dois usuários
     */
    calculateUserDistance(user1, user2) {
        let distance = 0;
        let totalWeight = 0;
        
        // Idade (peso 0.2)
        if (user1.age && user2.age) {
            const ageDiff = Math.abs(user1.age - user2.age);
            distance += 0.2 * (ageDiff / 100);
            totalWeight += 0.2;
        }
        
        // Gênero (peso 0.1)
        if (user1.gender && user2.gender) {
            distance += user1.gender === user2.gender ? 0 : 0.1;
            totalWeight += 0.1;
        }
        
        // Nível de lesão (peso 0.3)
        if (user1.sci_level && user2.sci_level) {
            distance += user1.sci_level === user2.sci_level ? 0 : 0.3;
            totalWeight += 0.3;
        }
        
        // Categoria (peso 0.25)
        if (user1.sci_category && user2.sci_category) {
            distance += user1.sci_category === user2.sci_category ? 0 : 0.25;
            totalWeight += 0.25;
        }
        
        // Severidade (peso 0.1)
        if (user1.sci_severity && user2.sci_severity) {
            distance += user1.sci_severity === user2.sci_severity ? 0 : 0.1;
            totalWeight += 0.1;
        }
        
        // Classe (peso 0.05)
        if (user1.sci_class && user2.sci_class) {
            distance += user1.sci_class === user2.sci_class ? 0 : 0.05;
            totalWeight += 0.05;
        }
        
        return totalWeight > 0 ? distance / totalWeight : 1;
    },
    
    /**
     * Gera recomendação baseada no melhor exercício do usuário
     */
    generateFromBestExercise(exercises) {
        // Encontrar exercício com melhor desempenho
        const bestExercise = exercises.reduce((best, current) => {
            const currentScore = (current.avg_velocity || 0) * (current.total_distance || 0);
            const bestScore = (best.avg_velocity || 0) * (best.total_distance || 0);
            return currentScore > bestScore ? current : best;
        });
        
        const baseVel = parseFloat(bestExercise.avg_velocity) || 8.0;
        const baseDuration = bestExercise.total_duration || 600;
        
        console.log(`✓ Melhor exercício: ${new Date(bestExercise.exercise_date).toLocaleDateString('pt-BR')}`);
        console.log(`  Velocidade: ${baseVel} m/s, Duração: ${baseDuration}s`);
        
        return {
            velocidade_alvo: parseFloat((baseVel * 0.85).toFixed(2)), // 85% da melhor velocidade
            tempo_trabalho: Math.round(baseDuration * 0.25),
            tempo_descanso: Math.round(baseDuration * 0.25),
            repeticoes: 6,
            observacoes: `Baseado no seu melhor exercício realizado em ${new Date(bestExercise.exercise_date).toLocaleDateString('pt-BR')}.`,
            confidence: 65,
            targetDistance: parseFloat(((bestExercise.total_distance || 0) / 1000 * 0.85).toFixed(2)),
            targetAcceleration: parseFloat(((bestExercise.avg_acceleration || 0) * 0.85).toFixed(2))
        };
    },
    
    /**
     * Salva recomendação no banco de dados
     */
    async saveRecommendation(userId, recommendation) {
        // Desativar treinos anteriores
        await supabase
            .from('treinos_recomendados')
            .update({ ativo: false })
            .eq('user_id', userId);
        
        // Inserir novo
        const { error } = await supabase
            .from('treinos_recomendados')
            .insert({
                user_id: userId,
                velocidade_alvo: recommendation.velocidade_alvo,
                tempo_trabalho: recommendation.tempo_trabalho,
                tempo_descanso: recommendation.tempo_descanso,
                repeticoes: recommendation.repeticoes,
                observacoes: recommendation.observacoes,
                gerado_por_ia: true,
                ajustado_manualmente: false,
                ativo: true
            });
        
        if (error) throw error;
    },
    
    /**
     * Formata recomendação para exibição
     */
    formatRecommendation(workout, source) {
        const confidence = workout.confidence || 65;
        
        return {
            velocidade_alvo: workout.velocidade_alvo,
            tempo_trabalho: workout.tempo_trabalho,
            tempo_descanso: workout.tempo_descanso,
            repeticoes: workout.repeticoes,
            observacoes: workout.observacoes,
            confidence,
            targetDistance: workout.targetDistance || ((workout.velocidade_alvo * workout.tempo_trabalho) / 1000).toFixed(2),
            targetAcceleration: workout.targetAcceleration || 0.5,
            similarProfiles: workout.similarProfiles || [],
            duration: (workout.tempo_trabalho + workout.tempo_descanso) * workout.repeticoes,
            targetVelocity: workout.velocidade_alvo,
            message: this.getConfidenceMessage(confidence, source)
        };
    },
    
    /**
     * Mensagem baseada na confiança e origem
     */
    getConfidenceMessage(confidence, source) {
        if (source === 'manual') {
            return 'Este treino foi ajustado manualmente por um profissional.';
        } else if (source === 'existing') {
            return 'Seu treino atual ainda está válido e personalizado para você.';
        } else if (source === 'knn') {
            if (confidence >= 70) {
                return 'Recomendação baseada em usuários similares com alta confiabilidade.';
            } else {
                return 'Recomendação baseada em usuários similares, mas com dados limitados.';
            }
        } else if (source === 'best_exercise') {
            return 'Recomendação baseada no seu melhor desempenho anterior.';
        }
        return 'Recomendação personalizada gerada.';
    },
    
    /**
     * Verifica se precisa regenerar treino (mais de 3 meses)
     */
    needsRegeneration(updatedAt) {
        const lastUpdate = new Date(updatedAt);
        const now = new Date();
        const diffMonths = (now.getFullYear() - lastUpdate.getFullYear()) * 12 + 
                          (now.getMonth() - lastUpdate.getMonth());
        return diffMonths >= 3;
    }
};

// Disponibilizar globalmente
window.trainingRecommendation = trainingRecommendation;
/*
 * Sistema de Monitoramento HIIT - Supabase
 * Duas tabelas: exercise_readings (tempo real) + exercises (dados finais)
*/

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// ============ CONFIGURAÇÕES ============
const char* WIFI_SSID = "NOME_DA_REDE_WIFI";
const char* WIFI_PASSWORD = "SENHA_DA_REDE_WIFI";
const char* SUPABASE_URL = "https://<YOUR_PROJECT>.supabase.co";
const char* SUPABASE_KEY = "<YOUR_SERVICE_ROLE_KEY>";

// ============ PINOS ============
#define SENSOR_PIN D8
#define LED_BUILTIN D4

// ============ VARIÁVEIS GLOBAIS ============
WiFiClientSecure client;

// Controle de exercício
bool exerciseActive = false;
String currentExerciseId = "";
String currentUserId = "";
unsigned int checkCounter = 0;

// Sensor e contadores
bool sensorFlag = false;
unsigned long rotationCount = 0;
unsigned long tempCount = 0;

// Velocidade e distância
float velocidade_atual = 0.0;
float distAcumulada = 0.0;
float velocidade_maxima = 0.0;
float velocidade_minima = 999.0;
float soma_velocidades = 0.0;
int count_velocidades = 0;

const float RAIO_RODA = 30.48; // cm (aro 24)
float comprimentoRoda = 0.0;

// Timers
unsigned long exerciseStartTime = 0;
unsigned long lastVelocityCalcTime = 0;
unsigned long lastUpdateTime = 0;
const unsigned long VELOCITY_CALC_INTERVAL = 3000; // 3s
const unsigned long UPDATE_INTERVAL = 5000;        // 5s

// ============ FUNÇÕES ============

void connectWiFi() {
  Serial.print("Conectando WiFi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" OK!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println(" FALHOU!");
  }
}

void checkActiveExercise() {
  HTTPClient http;
  
  // Busca exercício ativo na tabela exercises
  String url = String(SUPABASE_URL) + "/rest/v1/exercises?id=eq." + 
               String(currentExerciseId) + "&select=id,user_id,total_duration";
  
  // Se não tem exercício ativo, busca novo
  if (!exerciseActive) {
    url = String(SUPABASE_URL) + "/rest/v1/exercises?total_duration=is.null&order=created_at.desc&limit=1";
  }
  
  http.begin(client, url);
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    DynamicJsonDocument doc(512);
    
    if (deserializeJson(doc, payload) == DeserializationError::Ok && doc.size() > 0) {
      if (!exerciseActive) {
        // Inicia novo exercício
        exerciseActive = true;
        currentExerciseId = doc[0]["id"].as<String>();
        currentUserId = doc[0]["user_id"].as<String>();
        
        rotationCount = 0;
        tempCount = 0;
        velocidade_atual = 0.0;
        distAcumulada = 0.0;
        velocidade_maxima = 0.0;
        velocidade_minima = 999.0;
        soma_velocidades = 0.0;
        count_velocidades = 0;
        
        exerciseStartTime = millis();
        lastVelocityCalcTime = millis();
        lastUpdateTime = millis();
        
        Serial.println("\n═══ EXERCÍCIO INICIADO ═══");
        Serial.print("User: ");
        Serial.print(currentUserId);
        Serial.print(" | Exercise: ");
        Serial.println(currentExerciseId);
      }
    } else {
      if (exerciseActive) {
        encerraExercicio();
      }
    }
  }
  
  http.end();
}

void readSensor() {
  int sensorValue = digitalRead(SENSOR_PIN);
  
  if (!sensorValue && !sensorFlag) {
    sensorFlag = true;
    rotationCount++;
    tempCount++;
    digitalWrite(LED_BUILTIN, LOW);
    delay(10);
    digitalWrite(LED_BUILTIN, HIGH);
  } else if (sensorValue && sensorFlag) {
    sensorFlag = false;
  }
}

void calculateVelocity() {
  float distancia = tempCount * comprimentoRoda;
  distAcumulada += distancia;
  velocidade_atual = (3.6 * distancia) / 3; // km/h
  
  if (velocidade_atual > 0.1) {
    // Atualiza estatísticas
    if (velocidade_atual > velocidade_maxima) {
      velocidade_maxima = velocidade_atual;
    }
    if (velocidade_atual < velocidade_minima) {
      velocidade_minima = velocidade_atual;
    }
    soma_velocidades += velocidade_atual;
    count_velocidades++;
    
    Serial.print("Vel: ");
    Serial.print(velocidade_atual, 1);
    Serial.print(" km/h | Dist: ");
    Serial.print(distAcumulada, 2);
    Serial.println(" m");
  }
  
  tempCount = 0;
}

void sendReadingToSupabase() {
  if (!exerciseActive || velocidade_atual < 0.1) return;
  
  HTTPClient http;
  String url = String(SUPABASE_URL) + "/rest/v1/exercise_readings";
  
  int timestamp_segundos = (millis() - exerciseStartTime) / 1000;
  
  StaticJsonDocument<256> doc;
  doc["exercise_id"] = currentExerciseId.toInt();
  doc["timestamp"] = timestamp_segundos;
  doc["velocity"] = velocidade_atual;
  doc["distance"] = distAcumulada;
  doc["rotations"] = rotationCount;
  
  String json;
  serializeJson(doc, json);
  
  http.begin(client, url);
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");
  
  int httpCode = http.POST(json);
  
  if (httpCode > 0) {
    Serial.print(".");
  } else {
    Serial.print("x");
  }
  
  http.end();
}

void encerraExercicio() {
  exerciseActive = false;
  
  int duracao_total = (millis() - exerciseStartTime) / 1000; // segundos
  float velocidade_media = (count_velocidades > 0) ? (soma_velocidades / count_velocidades) : 0.0;
  
  Serial.println("\n═══ EXERCÍCIO FINALIZADO ═══");
  Serial.print("Duração: ");
  Serial.print(duracao_total);
  Serial.println(" s");
  Serial.print("Distância: ");
  Serial.print(distAcumulada, 2);
  Serial.println(" m");
  Serial.print("Vel média: ");
  Serial.print(velocidade_media, 2);
  Serial.println(" km/h");
  
  // Atualiza tabela exercises com dados finais
  HTTPClient http;
  String url = String(SUPABASE_URL) + "/rest/v1/exercises?id=eq." + currentExerciseId;
  
  StaticJsonDocument<512> doc;
  doc["total_duration"] = duracao_total;
  doc["total_distance"] = distAcumulada;
  doc["max_velocity"] = velocidade_maxima;
  doc["min_velocity"] = (velocidade_minima < 999.0) ? velocidade_minima : 0.0;
  doc["avg_velocity"] = velocidade_media;
  
  String json;
  serializeJson(doc, json);
  
  http.begin(client, url);
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");
  
  http.PATCH(json);
  http.end();
  
  // Reset
  currentExerciseId = "";
  rotationCount = 0;
  tempCount = 0;
  velocidade_atual = 0.0;
  distAcumulada = 0.0;
}

// ============ SETUP ============
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n═══ SISTEMA HIIT ═══");
  
  pinMode(SENSOR_PIN, INPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);
  
  comprimentoRoda = (2 * PI * RAIO_RODA) / 100;
  
  connectWiFi();
  client.setInsecure();
  
  Serial.println("✓ Pronto! Aguardando exercício...\n");
}

// ============ LOOP ============
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }
  
  checkCounter++;
  if (checkCounter >= 1000) {
    checkCounter = 0;
    checkActiveExercise();
  }
  
  if (exerciseActive) {
    readSensor();
    
    unsigned long now = millis();
    
    if (now - lastVelocityCalcTime >= VELOCITY_CALC_INTERVAL) {
      calculateVelocity();
      lastVelocityCalcTime = now;
    }
    
    if (now - lastUpdateTime >= UPDATE_INTERVAL) {
      sendReadingToSupabase();
      lastUpdateTime = now;
    }
  }
  
  delay(1);
}
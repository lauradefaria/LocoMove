
<a href='https://github.com/shivamkapasia0' target="_blank"><img alt='HTML5' src='https://img.shields.io/badge/HTML5-100000?style=for-the-badge&logo=HTML5&logoColor=white&labelColor=E34F26&color=E34F26'/></a>
<a href='https://github.com/shivamkapasia0' target="_blank"><img alt='css' src='https://img.shields.io/badge/css-100000?style=for-the-badge&logo=css&logoColor=white&labelColor=663399&color=663399'/></a>
  <a href='https://github.com/shivamkapasia0' target="_blank"><img alt='javascript' src='https://img.shields.io/badge/javascript-100000?style=for-the-badge&logo=javascript&logoColor=white&labelColor=F7DF1E&color=F7DF1E'/></a>
<br><br>

# <img src="assets/logo/locomove.png" alt="LocoMove Logo" width="45" style="vertical-align:middle; margin-right:10px;"> LocoMove

**LocoMove** é uma plataforma web de **monitoramento, recomendação e análise de treinos voltados a indivíduos com lesão medular**, integrando sensores e inteligência computacional para promover **acessibilidade, reabilitação e autonomia motora**.

O sistema permite registrar, acompanhar e ajustar sessões de exercício com base em dados capturados em tempo real, visando auxiliar profissionais da saúde e pesquisadores no acompanhamento personalizado da evolução dos usuários.

---

## 🧩 Sumário

- [Sobre o Projeto](#-sobre-o-projeto)
- [Arquitetura do Sistema](#-arquitetura-do-sistema)
- [Principais Funcionalidades](#-principais-funcionalidades)
- [Modelagem de Dados](#-modelagem-de-dados)
- [Configuração de Credenciais](#-configuracao-de-credenciais)
- [Execução Local](#-execução-local)
- [Autoria e Orientação](#-autoria-e-orientação)
- [Licença](#-licença)

---

## 💡 Sobre o Projeto

O **LocoMove** foi desenvolvido como parte de um projeto de pesquisa em acessibilidade e tecnologias assistivas.  
Seu objetivo principal é **monitorar variáveis de movimento e desempenho físico** de pessoas com **lesão medular (SCI — Spinal Cord Injury)**, fornecendo métricas como velocidade, distância e aceleração, além de recomendar treinos personalizados com base em dados históricos.

A proposta busca **transformar o sedentarismo em movimento** e **a tecnologia em inclusão**, aproximando ciência, inovação e impacto social.

---

## ⚙️ Arquitetura do Sistema

O sistema segue uma arquitetura **cliente-servidor** baseada em banco de dados relacional e integração com sensores físicos:

```text
┌─────────────────────────────────────────────────────────────────┐
│                         CAMADA FÍSICA                           │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │  Ergômetro   │────────▶│  TCRT5000    │                     │
│  │ (Roda c/     │         │ (Sensor      │                     │
│  │  marcação)   │         │  Óptico)     │                     │
│  └──────────────┘         └──────┬───────┘                     │
└─────────────────────────────────────┼───────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────┐
│                    CAMADA DE AQUISIÇÃO                          │
│  ┌──────────────────────────────────────────────────┐           │
│  │           NodeMCU ESP8266                        │           │
│  │  • Interrupt Service Routine (ISR)               │           │
│  │  • Cálculo de RPM (Rotações Por Minuto)          │           │
│  │  • Conversão para velocidade linear              │           │
│  │  • Cliente HTTP/HTTPS                            │           │
│  └───────────────────────┬──────────────────────────┘           │
└────────────────────────────┼────────────────────────────────────┘
                             │ WiFi (802.11 b/g/n)
                             │ HTTPS POST (1Hz)
┌────────────────────────────▼────────────────────────────────────┐
│                    CAMADA DE PERSISTÊNCIA                       │
│  ┌──────────────────────────────────────────────────┐           │
│  │              Supabase (PostgreSQL)               │           │
│  │  • Tabela: sensor_realtime                       │           │
│  │  • Tabela: exercises                             │           │
│  │  • Tabela: exercise_readings                     │           │
│  │  • Tabela: users                                 │           │
│  │  • Tabela: treinos_recomendados                  │           │
│  │  • Row Level Security (RLS)                      │           │
│  │  • Realtime subscriptions (WebSocket)            │           │
│  └───────────────────────┬──────────────────────────┘           │
└────────────────────────────┼────────────────────────────────────┘
                             │ REST API / WebSocket
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    CAMADA DE APLICAÇÃO                          │
│  ┌──────────────────────────────────────────────────┐           │
│  │          Interface Web (HTML/CSS/JS)             │           │
│  │                                                  │           │
│  │  ┌────────────────┐      ┌────────────────┐      │           │
│  │  │   Dashboard    │      │   Dashboard    │      │           │
│  │  │ Administrador  │      │    Usuário     │      │           │
│  │  └────────────────┘      └────────────────┘      │           │
│  │                                                  │           │
│  │  • Autenticação JWT                              │           │
│  │  • Atualização tempo real (WebSocket)            │           │
│  │  • Visualização de dados (Charts.js)             │           │
│  │  • Algoritmo KNN (JavaScript)                    │           │
│  └──────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

**Frontend:**
- HTML5, CSS3, JavaScript (Vanilla)
- Layout responsivo e acessível

**Backend / Banco de Dados:**
- Supabase (PostgreSQL)
- Realtime API
- Funções e triggers SQL para auditoria e consistência

**Ferramentas e Integrações:**
- Supabase Auth (autenticação)
- GitHub (controle de versão)
- Visual Studio Code (ambiente de desenvolvimento)

---

## 🚀 Principais Funcionalidades

-  **Monitoramento em tempo real** de treinos e rotações do sensor;
-  **Cálculo automático de velocidade, distância e aceleração**;
-  **Geração inteligente de treinos recomendados**, com possibilidade de ajustes manuais e administrativos;
-  **Gerenciamento de usuários**, com autenticação segura e perfis diferenciados (usuário e administrador);
-  **Histórico completo de treinos e métricas por data**;
-  **Atualizações automáticas via triggers** e sincronização em tempo real via Supabase Realtime.

---

## 🧱 Modelagem de Dados

A base de dados foi estruturada com foco em **integridade referencial e rastreabilidade temporal**.  
Os **arquivos contendo os schemas das tabelas, índices, triggers e funções SQL** estão localizados na pasta: `/supabase`

Abaixo estão os principais esquemas SQL utilizados:

### 🔹 `users`
Registra informações dos usuários do sistema, incluindo características clínicas (nível e causa da lesão).

### 🔹 `exercises`
Armazena dados agregados de cada sessão de exercício (médias, máximos e mínimos de velocidade, aceleração, duração e distância).

### 🔹 `exercise_readings`
Tabela de leituras contínuas, registrando valores de rotação, velocidade e distância ao longo do treino.

### 🔹 `sensor_realtime`
Controla a atividade em tempo real dos sensores, permitindo acompanhamento instantâneo de sessões em andamento.

### 🔹 `treinos_recomendados`
Tabela responsável pelos **treinos gerados automaticamente por IA**, podendo ser ajustados por administradores ou manualmente pelo próprio usuário.

Os índices e triggers SQL foram definidos para garantir **eficiência de consulta e atualização automática** (`updated_at`, controle de treino ativo, consistência entre usuários e exercícios, etc.).

---

## 🔐 Configuração de Credenciais

Para o correto funcionamento do sistema, é necessário configurar as **credenciais do Supabase** tanto na aplicação web quanto no código do microcontrolador (Arduino/NodeMCU).

### Supabase (Aplicação Web)

No diretório principal, localize o arquivo: `/assets/js/supabase-config.js`


Neste arquivo, substitua as chaves abaixo pelas suas credenciais do projeto no [Supabase](https://supabase.com/):

```javascript
const SUPABASE_URL = "https://<YOUR_PROJECT>.supabase.co";
const SUPABASE_ANON_KEY = "<YOUR_ANON_KEY>";
```

### NodeMCU ESP8266 (.ino)
No código do microcontrolador responsável pela coleta dos dados (camada de aquisição), também é necessário atualizar as credenciais de rede e da API Supabase. <br/>

Localize o trecho correspondente no código-fonte na pasta `.ino/Esp_code`

```cpp
const char* ssid = "NOME_DA_REDE_WIFI";
const char* password = "SENHA_DA_REDE_WIFI";

const char* supabase_url = "https://<YOUR_PROJECT>.supabase.co";
const char* supabase_api_key = "<YOUR_SERVICE_ROLE_KEY>";
```

Dica de Segurança:

- Nunca publique suas chaves diretamente em repositórios públicos.
- Recomenda-se criar um arquivo .env local (não versionado) e importar as variáveis no ambiente de execução.
- No Supabase, também é possível criar chaves restritas ou utilizar Row Level Security (RLS) para limitar o acesso aos dados.

---

## 💻 Execução Local

### Pré-requisitos
- Navegador moderno (Chrome, Edge, Firefox)
- Conta no [Supabase](https://supabase.com/)
- Node.js (opcional, para servidor local)

### Passos
1. Clone o repositório:
   ```bash
   git clone https://github.com/lauradefaria/LocoMove.git
2. Altere todas as `Configurações de Credenciais` mencionadas
3. Adicione todas as tabelas e políticas no supabase da pasta `/supabase`
   
## Autor 

| [<img loading="lazy" src="https://avatars.githubusercontent.com/u/45434515?v=4" width=115><br><sub>Laura de Faria</sub>](https://github.com/lauradefaria) | 
| :---: |

---

## License

[![License](http://img.shields.io/:license-mit-blue.svg?style=flat-square)](http://badges.mit-license.org)

- **[MIT license](http://opensource.org/licenses/mit-license.php)**

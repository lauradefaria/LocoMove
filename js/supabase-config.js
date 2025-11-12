// Configuração do Supabase
// IMPORTANTE: Substitua estas variáveis pelas suas credenciais do Supabase
const SUPABASE_URL = 'https://<YOUR_PROJECT>.supabase.co';
const SUPABASE_ANON_KEY = '<YOUR_ANON_KEY>';

// Inicializa o cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Exporta para uso em outros arquivos
window.supabase = supabase;
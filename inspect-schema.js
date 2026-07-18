const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://npskqtsnwqyllslgmoof.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wc2txdHNud3F5bGxzbGdtb29mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY4NjM4OCwiZXhwIjoyMDk3MjYyMzg4fQ.zevWe8u6Ys6vEloS5s2ZpU1Ot4Z5GOwQtPQs5vOQut8',
  { auth: { persistSession: false, autoRefreshToken: false } }
)

async function inspect() {
  // Tentar descobrir tabelas via information_schema
  // Primeiro vamos tentar tabelas prováveis
  const tables = ['subscriptions', 'assinaturas', 'plans', 'user_plans', 'user_subscriptions', 'generations']
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1)
    if (!error && data !== null) {
      console.log(`\n=== TABELA: ${table} ===`)
      console.log('Colunas:', data.length > 0 ? Object.keys(data[0]) : '(vazia)')
      if (data.length > 0) console.log('Amostra:', JSON.stringify(data[0], null, 2))
    } else {
      console.log(`✗ ${table}: ${error?.message || 'não encontrada'}`)
    }
  }
}

inspect()

/**
 * Adiciona coluna expires_at na tabela profiles
 * e grava as datas de expiração para todos os 194 usuários.
 * Usa o endpoint REST do Supabase com service_role + RPC custom ou SQL direto.
 */
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const SUPABASE_URL = 'https://npskqtsnwqyllslgmoof.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wc2txdHNud3F5bGxzbGdtb29mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY4NjM4OCwiZXhwIjoyMDk3MjYyMzg4fQ.zevWe8u6Ys6vEloS5s2ZpU1Ot4Z5GOwQtPQs5vOQut8'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

function parseDate(ddmm) {
  const [day, month] = ddmm.trim().split('/')
  return `2026-${month.padStart(2,'0')}-${day.padStart(2,'0')}T12:00:00.000Z`
}

// Tenta executar SQL via diferentes métodos disponíveis
async function execSQL(sql) {
  // Método 1: via RPC exec (se existir)
  const { data: rpc1, error: rpcErr1 } = await supabase.rpc('exec_sql', { sql })
  if (!rpcErr1) return { ok: true, method: 'rpc exec_sql' }

  // Método 2: via RPC query (se existir)
  const { data: rpc2, error: rpcErr2 } = await supabase.rpc('query', { query: sql })
  if (!rpcErr2) return { ok: true, method: 'rpc query' }

  // Método 3: Supabase Management REST API (requer project ref)
  const projectRef = 'npskqtsnwqyllslgmoof'
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({ query: sql })
  })
  if (res.ok) return { ok: true, method: 'management API' }
  
  return { ok: false, error: `RPC1: ${rpcErr1?.message} | RPC2: ${rpcErr2?.message} | MGMT: ${res.status}` }
}

const USERS = [
  { email: 'maxaioficial@gmail.com', date: '08/07' },
  { email: 'denis157boladaoo20@gmail.com', date: '10/07' },
  { email: 'kellylrincesa@gmail.com', date: '10/07' },
  { email: 'rgsuporte2@gmail.com', date: '10/07' },
  { email: 'lulagebarros@gmail.com', date: '10/07' },
  { email: 'rogerio.morandi@gmail.com', date: '11/07' },
  { email: 'xandyzap@hotmail.com', date: '11/07' },
  { email: 'cristianesalvinaesilva@gmail.com', date: '11/07' },
  { email: 'celsopereiracostacosta45@gmail.com', date: '11/07' },
  { email: 'caiiofelippe@gmail.com', date: '11/07' },
  { email: 'danielmattosilha@gmail.com', date: '11/07' },
  { email: 'paulo.cientista.dados@gmail.com', date: '11/07' },
  { email: 'dalvasan4321@gmail.com', date: '11/07' },
  { email: 'anaclaudialeiteferreira21@gmail.com', date: '11/07' },
  { email: 'danielmatttosilha@gmail.com', date: '11/07' },
  { email: 'aparecidoreinaldo411@gmail.com', date: '11/07' },
  { email: 'joaninhartesanato9@gmail.com', date: '12/07' },
  { email: 'juliatenorio550@gmail.com', date: '12/07' },
  { email: 'rhamonsoratto@gmail.com', date: '12/07' },
  { email: 'andersonmartinscamposs@gmail.com', date: '12/07' },
  { email: 'jairocravofurtado@gmail.com', date: '12/07' },
  { email: 'carlosmesquita098@gmail.com', date: '12/07' },
  { email: 'joselucielmendes@gmail.com', date: '12/07' },
  { email: 'gmenezes68@gmail.com', date: '12/07' },
  { email: 'valerialadeira79@gmail.com', date: '12/07' },
  { email: 'eduardomunhoz_cascavel@hotmail.com', date: '12/07' },
  { email: 'jcbeltrame@hotmail.com', date: '12/07' },
  { email: 'jakzimba@hotmail.com', date: '12/07' },
  { email: 'likamenezes1985@gmail.com', date: '12/07' },
  { email: 'lailsonsousaaraujo16@gmail.com', date: '12/07' },
  { email: 'rilenemamede@yahoo.com', date: '12/07' },
  { email: 'edvaldo.nunes.ribeiro@gmail.com', date: '12/07' },
  { email: 'anderson_teixeira81@yahoo.com.br', date: '12/07' },
  { email: 'pastor.lopes@gmail.com', date: '12/07' },
  { email: 'jcbqueirozfarias@gmail.com', date: '13/07' },
  { email: 'simone.a.noronha@gmail.com', date: '13/07' },
  { email: 'robkirtkirsamenag@hotmail.com', date: '13/07' },
  { email: 'markaomiani01@gmail.com', date: '13/07' },
  { email: 'renatovieirasantosjunior@gmail.com', date: '13/07' },
  { email: 'metroidcreative@gmail.com', date: '13/07' },
  { email: 'ci-anuh@hotmail.com', date: '13/07' },
  { email: 'paulopaes373@gmail.com', date: '13/07' },
  { email: 'stuart.smoking1306@gmail.com', date: '13/07' },
  { email: 'leonfenix30@gmail.com', date: '13/07' },
  { email: 'trabalhos1728@gmail.com', date: '13/07' },
  { email: 'rdcriayousds@gmail.com', date: '14/07' },
  { email: 'manuelaantunesvieira43@gmail.com', date: '14/07' },
  { email: 'educandariotiarita@gmail.com', date: '14/07' },
  { email: 'aatqvasco0@gmail.com', date: '14/07' },
  { email: 'ceciliaribeiro981@gmail.com', date: '14/07' },
  { email: 'igrejalivrecampinas@gmail.com', date: '14/07' },
  { email: 'viniciusboreck@gmail.com', date: '14/07' },
  { email: 'ivo.itajai@hotmail.com', date: '14/07' },
  { email: 'welita.silva@gmail.com', date: '14/07' },
  { email: 'demmyiptv@gmail.com', date: '14/07' },
  { email: 'eliveltobernardes273@gmail.com', date: '14/07' },
  { email: 'mauriciopavao@gmail.com', date: '15/07' },
  { email: 'cesarteixeira823@gmail.com', date: '15/07' },
  { email: 'well_c.gomes@hotmail.com', date: '15/07' },
  { email: 'djmarcielgo@gmail.com', date: '15/07' },
  { email: 'cvrss@live.com', date: '15/07' },
  { email: 'academiaedson@gmail.com', date: '15/07' },
  { email: 'desenvolvimentodgm@gmail.com', date: '15/07' },
  { email: 'reinaldo.vendasdiretas@gmail.com', date: '15/07' },
  { email: 'joaod4683@gmail.com', date: '15/07' },
  { email: 'ronaldomodasutilidades@gmail.com', date: '15/07' },
  { email: 'paula2023ad@gmail.com', date: '15/07' },
  { email: 'denizechatnovo@gmail.com', date: '15/07' },
  { email: 'cidaisaura_25@hotmail.com', date: '15/07' },
  { email: 'daviunb32@gmail.com', date: '15/07' },
  { email: 'gomesbotelhofilho@gmail.com', date: '15/07' },
  { email: 'marcioamiranda@gmail.com', date: '15/07' },
  { email: 'andreyseixas07@gmail.com', date: '15/07' },
  { email: 'dnielarodrigues708@gmail.com', date: '15/07' },
  { email: 'danielarodrigues708@gmail.com', date: '15/07' },
  { email: 'fernandapasinatto@gmail.com', date: '15/07' },
  { email: 'juniorsaphotos@gmail.com', date: '15/07' },
  { email: 'robsoncelta2012@gmail.com', date: '15/07' },
  { email: 'lucasssantosp@outlook.com', date: '15/07' },
  { email: 'guihermearaujosilv50@gmail.com', date: '16/07' },
  { email: 'guilhermearaujosilv50@gmail.com', date: '16/07' },
  { email: 'jheymesoficial23@gmail.com', date: '16/07' },
  { email: 'michaelsimoesdesene@gmail.com', date: '16/07' },
  { email: 'weslley.crodrigues@hotmail.com', date: '16/07' },
  { email: 'claudemir_santos-aju@hotmail.com', date: '16/07' },
  { email: 'silvioaraujo669@gmail.com', date: '16/07' },
  { email: 'profronaldooliveira@hotmail.com', date: '16/07' },
  { email: 'capitaoamazonas@yahoo.com.br', date: '16/07' },
  { email: 'vieiracristhian87@gmail.com', date: '16/07' },
  { email: 'yasminprado15@icloud.com', date: '16/07' },
  { email: 'seccoofabio@gmail.com', date: '16/07' },
  { email: 'diogobarber10@gmail.com', date: '16/07' },
  { email: 'werikrecomeso@gmail.com', date: '17/07' },
  { email: 'stephan_vidal@hotmail.com', date: '17/07' },
  { email: 'pierafrancis@gmail.com', date: '17/07' },
  { email: 'contato.welita@gmail.com', date: '17/07' },
  { email: 'peixotobarrosdebarros@gmail.com', date: '17/07' },
  { email: 'montesantominercao@gmail.com', date: '17/07' },
  { email: 'afcientista@gmail.com', date: '17/07' },
  { email: 'montesantomineracao@gmail.com', date: '17/07' },
  { email: 'vicentefbk@gmail.com', date: '17/07' },
  { email: 'rodriguesmariaines19@gmail.com', date: '17/07' },
  { email: 'modesto9790@gmail.com', date: '17/07' },
  { email: 'rosangelajackson36@gmail.com', date: '17/07' },
  { email: 'kursoskarlos@gmail.com', date: '17/07' },
  { email: 'ronaldoevan75@gmail.com', date: '18/07' },
  { email: 'joaoalvesnanda220@gmail.com', date: '18/07' },
  { email: 'sanderacalmon@gmail.com', date: '18/07' },
  { email: 'welder.wpw@gmail.com', date: '18/07' },
  { email: 'emersonalmeidaneves369@gmail.com', date: '18/07' },
  { email: 'marcioabensuruber@gmail.com', date: '18/07' },
  { email: 'marcelopopovit@gmail.com', date: '18/07' },
  { email: 'edmilsongarciab@gmail.com', date: '18/07' },
  { email: 'w7reis@gmail.com', date: '18/07' },
  { email: 'angel.garciia23@hotmail.com', date: '19/07' },
  { email: 'gilprcampos@hotmail.com', date: '19/07' },
  { email: 'lailsonsoaresa@gmail.com', date: '19/07' },
  { email: 'lailsonplay00@gmail.com', date: '19/07' },
  { email: 'jessicapalin3@gmail.com', date: '19/07' },
  { email: 'lemathioni@hotmail.com', date: '19/07' },
  { email: 'andersoncanva1977@gmail.com', date: '20/07' },
  { email: 'ingrid.hilariohp@gmail.com', date: '20/07' },
  { email: 'albertononatoandrade@gmail.com', date: '20/07' },
  { email: 'vaniarmiranda2010@gmail.com', date: '20/07' },
  { email: 'gomesrosagilson281@gmail.com', date: '21/07' },
  { email: 'nivaldopires1000@gmail.com', date: '21/07' },
  { email: 'reismultimidia@gmail.com', date: '22/07' },
  { email: 'raniere.workana@gmail.com', date: '22/07' },
  { email: 'alan.dy.oficial@gmail.com', date: '22/07' },
  { email: 'o.vinisouza626@gmail.com', date: '22/07' },
  { email: 'aguiarsetembrino@gmail.com', date: '23/07' },
  { email: 'lanhousabc@gmail.com', date: '23/07' },
  { email: 's_oficialsantos@hotmail.com', date: '23/07' },
  { email: 'matosvaldiclei15@gmail.com', date: '23/07' },
  { email: 'vrodas5.hp@gmail.com', date: '23/07' },
  { email: 'ksg49173@gmail.com', date: '23/07' },
  { email: 'payprimesolucoes@gmail.com', date: '23/07' },
  { email: 'fabimcrepaldi@gmail.com', date: '23/07' },
  { email: 'fmaroni10@gmail.com', date: '23/07' },
  { email: 'xxnetboxx@gmail.com', date: '24/07' },
  { email: 'allea8711@gmail.com', date: '24/07' },
  { email: 'ramonnamorais6@gmail.com', date: '24/07' },
  { email: 'santanasolidus@gmail.com', date: '25/07' },
  { email: 'djelisondemuana@gmail.com', date: '25/07' },
  { email: 'lurdinha.molina80@gmail.com', date: '25/07' },
  { email: 'alvesitamar06@gmail.com', date: '25/07' },
  { email: 'deboraborgesferraz@gmail.com', date: '26/07' },
  { email: 'rgeanmeira@gmail.com', date: '27/07' },
  { email: 'carlaovitorino@yahoo.com.br', date: '27/07' },
  { email: 'rayanepaulasousa@gmail.com', date: '28/07' },
  { email: 'dr.felipedemelo@hotmail.com', date: '28/07' },
  { email: 'thiaguinhocarmo3@gmail.com', date: '29/07' },
  { email: 'mylenamelodesousa2004@gmail.com', date: '29/07' },
  { email: 'andreiaro.sousa@gmail.com', date: '29/07' },
  { email: 'danielcarmosouza1603@gmail.com', date: '29/07' },
  { email: 'silvio.alessandro1973@gmail.com', date: '29/07' },
  { email: 'grumzinha@gmail.com', date: '29/07' },
  { email: 'aparecidademouraandrea@gmail.com', date: '29/07' },
  { email: 'delimaandreribeiro2026@gmail.com', date: '30/07' },
  { email: 'marcyannee.mf@gmail.com', date: '30/07' },
  { email: 'mahmirim1@gmail.com', date: '30/07' },
  { email: 'renata0702.cristina@gmail.com', date: '30/07' },
  { email: 'delimaandreribeiro128@gmail.com', date: '31/07' },
  { email: 'sabrynnathayalla13@gmail.com', date: '31/07' },
  { email: 'elton.cis@hotmail.com', date: '01/08' },
  { email: 'david.w.brilhante@gmail.com', date: '01/08' },
  { email: 'please-listen1@hotmail.com', date: '01/08' },
  { email: 'visaored7@gmail.com', date: '01/08' },
  { email: 'adoremaisoficial@gmail.com', date: '02/08' },
  { email: 'gilmarduartecardoso@gmail.com', date: '02/08' },
  { email: 'oficinatopmodel@gmail.com', date: '02/08' },
  { email: 'andreportugal66@gmail.com', date: '03/08' },
  { email: 'idealmidiaofc@gmail.com', date: '03/08' },
  { email: 'elizeumds01041981@gmail.com', date: '04/08' },
  { email: 'daisyk.22ketellen@gmail.com', date: '04/08' },
  { email: 'dannykarolly@hotmail.com', date: '04/08' },
  { email: 'clubevipstudio8@gmail.com', date: '05/08' },
  { email: 'anuncieaquipublic@gmail.com', date: '05/08' },
  { email: 'andersoncruz50@gmail.com', date: '05/08' },
  { email: 'thaisealvesdelima1@gmail.com', date: '05/08' },
  { email: 'florafrutaemdelta@gmail.com', date: '05/08' },
  { email: 'friends.producoes.2015@gmail.com', date: '06/08' },
  { email: 'xantillyn@gmail.com', date: '06/08' },
  { email: 'luistiago.gv16@gmail.com', date: '06/08' },
  { email: 'alexraiderversales7@gmail.com', date: '07/08' },
  { email: 'pr.rildofreire@gmail.com', date: '07/08' },
  { email: 'jaquedasimba@gmail.com', date: '07/08' },
  { email: 'anandadevivegetariana@gmail.com', date: '07/08' },
  { email: 'juliane.lumiar@gmail.com', date: '08/08' },
  { email: 'wesleymendes195@gmail.com', date: '08/08' },
  { email: 'brunagk26@gmail.com', date: '08/08' },
  { email: 'lribeiro.ba@gmail.com', date: '08/08' },
  { email: 'juniorhannaluiza@gmail.com', date: '08/08' },
  { email: 'gabrieljesus2030@gmail.com', date: '31/12' },
]

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log('║   ADICIONANDO expires_at + gravando datas        ║')
  console.log('╚══════════════════════════════════════════════════╝\n')

  // ── Passo 1: Adicionar coluna via SQL ──────────────────────────────────────
  console.log('🔧 Tentando adicionar coluna expires_at via SQL...')
  const sqlResult = await execSQL(
    'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expires_at timestamptz;'
  )
  if (sqlResult.ok) {
    console.log(`✅ Coluna adicionada via: ${sqlResult.method}\n`)
  } else {
    console.log(`⚠️  SQL não executado: ${sqlResult.error}`)
    console.log('   Tentando alternativa via Supabase REST direto...\n')
  }

  // ── Passo 2: Verificar se a coluna existe agora ───────────────────────────
  const { data: testRow } = await supabase.from('profiles').select('*').limit(1)
  const hasExpiresAt = testRow && testRow.length > 0 && 'expires_at' in testRow[0]
  
  if (!hasExpiresAt) {
    console.log('❌ Coluna expires_at ainda não existe.')
    console.log('📋 Colunas disponíveis:', testRow && testRow.length > 0 ? Object.keys(testRow[0]) : 'N/A')
    console.log('\n⚠️  Você precisa adicionar a coluna manualmente no Supabase Dashboard:')
    console.log('   Table Editor → profiles → Add column → expires_at (type: timestamptz)')
    console.log('   Ou execute no SQL Editor:')
    console.log('   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expires_at timestamptz;\n')
    
    // Salvar script SQL para execução manual
    fs.writeFileSync('add-expires-at.sql', 
      '-- Execute este script no Supabase SQL Editor:\n' +
      'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expires_at timestamptz;\n',
      'utf8'
    )
    console.log('📄 Script SQL salvo em: add-expires-at.sql')
    console.log('   Após executar no Dashboard, rode: node set-expiry-dates.js\n')
    return
  }

  console.log('✅ Coluna expires_at confirmada! Gravando datas...\n')

  // ── Passo 3: Buscar todos os perfis para mapear email → id ───────────────
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('id, email')
  if (profErr) { console.error('FATAL:', profErr.message); process.exit(1) }
  
  const profileMap = {}
  for (const p of profiles || []) profileMap[p.email.toLowerCase()] = p.id

  // ── Passo 4: Atualizar expires_at para cada usuário ───────────────────────
  let ok = 0, fail = 0
  for (let i = 0; i < USERS.length; i++) {
    const { email: rawEmail, date } = USERS[i]
    const email = rawEmail.toLowerCase()
    const expiresAt = parseDate(date)
    const num = String(i+1).padStart(3,'0')
    const profileId = profileMap[email]

    process.stdout.write(`[${num}/${USERS.length}] ${email.padEnd(45)} `)

    if (!profileId) {
      console.log(`⚠️  Perfil não encontrado`)
      fail++
      continue
    }

    const { error } = await supabase
      .from('profiles')
      .update({ expires_at: expiresAt })
      .eq('id', profileId)

    if (error) {
      console.log(`❌ ${error.message}`)
      fail++
    } else {
      console.log(`✅ ${date} → ${expiresAt}`)
      ok++
    }
  }

  console.log('\n' + '═'.repeat(60))
  console.log(`  ✅ Datas gravadas : ${ok}`)
  console.log(`  ❌ Falhas         : ${fail}`)
  console.log('═'.repeat(60))
  console.log('\n✅ Concluído!\n')
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })

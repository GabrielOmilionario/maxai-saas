/**
 * Passo 1: Adicionar coluna expires_at na tabela profiles (se não existir)
 * Passo 2: Executar migração completa de todos os 194 usuários
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

const USERS = [
  { email: 'maxaioficial@gmail.com', plan: 'Criador', credits: 858, date: '08/07' },
  { email: 'denis157boladaoo20@gmail.com', plan: 'Iniciante', credits: 3000, date: '10/07' },
  { email: 'kellylrincesa@gmail.com', plan: 'Iniciante', credits: 3000, date: '10/07' },
  { email: 'rgsuporte2@gmail.com', plan: 'Iniciante', credits: 18180, date: '10/07' },
  { email: 'lulagebarros@gmail.com', plan: 'Iniciante', credits: 2960, date: '10/07' },
  { email: 'rogerio.morandi@gmail.com', plan: 'Iniciante', credits: 2300, date: '11/07' },
  { email: 'xandyzap@hotmail.com', plan: 'Iniciante', credits: 3000, date: '11/07' },
  { email: 'cristianesalvinaesilva@gmail.com', plan: 'Iniciante', credits: 2740, date: '11/07' },
  { email: 'celsopereiracostacosta45@gmail.com', plan: 'Iniciante', credits: 0, date: '11/07' },
  { email: 'caiiofelippe@gmail.com', plan: 'Empresas', credits: 20000, date: '11/07' },
  { email: 'danielmattosilha@gmail.com', plan: 'Iniciante', credits: 3000, date: '11/07' },
  { email: 'paulo.cientista.dados@gmail.com', plan: 'Iniciante', credits: 0, date: '11/07' },
  { email: 'dalvasan4321@gmail.com', plan: 'Iniciante', credits: 2940, date: '11/07' },
  { email: 'anaclaudialeiteferreira21@gmail.com', plan: 'Iniciante', credits: 2780, date: '11/07' },
  { email: 'danielmatttosilha@gmail.com', plan: 'Iniciante', credits: 3000, date: '11/07' },
  { email: 'aparecidoreinaldo411@gmail.com', plan: 'Iniciante', credits: 2140, date: '11/07' },
  { email: 'joaninhartesanato9@gmail.com', plan: 'Iniciante', credits: 3000, date: '12/07' },
  { email: 'juliatenorio550@gmail.com', plan: 'Iniciante', credits: 3000, date: '12/07' },
  { email: 'rhamonsoratto@gmail.com', plan: 'Iniciante', credits: 3000, date: '12/07' },
  { email: 'andersonmartinscamposs@gmail.com', plan: 'Iniciante', credits: 900, date: '12/07' },
  { email: 'jairocravofurtado@gmail.com', plan: 'Iniciante', credits: 2720, date: '12/07' },
  { email: 'carlosmesquita098@gmail.com', plan: 'Empresas', credits: 18880, date: '12/07' },
  { email: 'joselucielmendes@gmail.com', plan: 'Iniciante', credits: 3000, date: '12/07' },
  { email: 'gmenezes68@gmail.com', plan: 'Iniciante', credits: 1780, date: '12/07' },
  { email: 'valerialadeira79@gmail.com', plan: 'Iniciante', credits: 40, date: '12/07' },
  { email: 'eduardomunhoz_cascavel@hotmail.com', plan: 'Iniciante', credits: 3000, date: '12/07' },
  { email: 'jcbeltrame@hotmail.com', plan: 'Iniciante', credits: 3000, date: '12/07' },
  { email: 'jakzimba@hotmail.com', plan: 'Criador', credits: 5720, date: '12/07' },
  { email: 'likamenezes1985@gmail.com', plan: 'Iniciante', credits: 2500, date: '12/07' },
  { email: 'lailsonsousaaraujo16@gmail.com', plan: 'Iniciante', credits: 3000, date: '12/07' },
  { email: 'rilenemamede@yahoo.com', plan: 'Iniciante', credits: 3000, date: '12/07' },
  { email: 'edvaldo.nunes.ribeiro@gmail.com', plan: 'Iniciante', credits: 3000, date: '12/07' },
  { email: 'anderson_teixeira81@yahoo.com.br', plan: 'Iniciante', credits: 3000, date: '12/07' },
  { email: 'pastor.lopes@gmail.com', plan: 'Criador', credits: 5960, date: '12/07' },
  { email: 'jcbqueirozfarias@gmail.com', plan: 'Iniciante', credits: 2880, date: '13/07' },
  { email: 'simone.a.noronha@gmail.com', plan: 'Iniciante', credits: 2660, date: '13/07' },
  { email: 'robkirtkirsamenag@hotmail.com', plan: 'Iniciante', credits: 2040, date: '13/07' },
  { email: 'markaomiani01@gmail.com', plan: 'Iniciante', credits: 3000, date: '13/07' },
  { email: 'renatovieirasantosjunior@gmail.com', plan: 'Empresas', credits: 19980, date: '13/07' },
  { email: 'metroidcreative@gmail.com', plan: 'Criador', credits: 4938, date: '13/07' },
  { email: 'ci-anuh@hotmail.com', plan: 'Iniciante', credits: 0, date: '13/07' },
  { email: 'paulopaes373@gmail.com', plan: 'Iniciante', credits: 3000, date: '13/07' },
  { email: 'stuart.smoking1306@gmail.com', plan: 'Empresas', credits: 18140, date: '13/07' },
  { email: 'leonfenix30@gmail.com', plan: 'Iniciante', credits: 3000, date: '13/07' },
  { email: 'trabalhos1728@gmail.com', plan: 'Iniciante', credits: 2960, date: '13/07' },
  { email: 'rdcriayousds@gmail.com', plan: 'Iniciante', credits: 3000, date: '14/07' },
  { email: 'manuelaantunesvieira43@gmail.com', plan: 'Iniciante', credits: 3000, date: '14/07' },
  { email: 'educandariotiarita@gmail.com', plan: 'Iniciante', credits: 3000, date: '14/07' },
  { email: 'aatqvasco0@gmail.com', plan: 'Iniciante', credits: 3000, date: '14/07' },
  { email: 'ceciliaribeiro981@gmail.com', plan: 'Iniciante', credits: 3000, date: '14/07' },
  { email: 'igrejalivrecampinas@gmail.com', plan: 'Iniciante', credits: 3000, date: '14/07' },
  { email: 'viniciusboreck@gmail.com', plan: 'Criador', credits: 6000, date: '14/07' },
  { email: 'ivo.itajai@hotmail.com', plan: 'Iniciante', credits: 2620, date: '14/07' },
  { email: 'welita.silva@gmail.com', plan: 'Iniciante', credits: 2920, date: '14/07' },
  { email: 'demmyiptv@gmail.com', plan: 'Iniciante', credits: 2580, date: '14/07' },
  { email: 'eliveltobernardes273@gmail.com', plan: 'Iniciante', credits: 3000, date: '14/07' },
  { email: 'mauriciopavao@gmail.com', plan: 'Iniciante', credits: 3000, date: '15/07' },
  { email: 'cesarteixeira823@gmail.com', plan: 'Empresas', credits: 19800, date: '15/07' },
  { email: 'well_c.gomes@hotmail.com', plan: 'Empresas', credits: 19818, date: '15/07' },
  { email: 'djmarcielgo@gmail.com', plan: 'Iniciante', credits: 3000, date: '15/07' },
  { email: 'cvrss@live.com', plan: 'Criador', credits: 5726, date: '15/07' },
  { email: 'academiaedson@gmail.com', plan: 'Empresas', credits: 19980, date: '15/07' },
  { email: 'desenvolvimentodgm@gmail.com', plan: 'Iniciante', credits: 2640, date: '15/07' },
  { email: 'reinaldo.vendasdiretas@gmail.com', plan: 'Criador', credits: 5860, date: '15/07' },
  { email: 'joaod4683@gmail.com', plan: 'Iniciante', credits: 2280, date: '15/07' },
  { email: 'ronaldomodasutilidades@gmail.com', plan: 'Iniciante', credits: 2740, date: '15/07' },
  { email: 'paula2023ad@gmail.com', plan: 'Iniciante', credits: 2960, date: '15/07' },
  { email: 'denizechatnovo@gmail.com', plan: 'Iniciante', credits: 3000, date: '15/07' },
  { email: 'cidaisaura_25@hotmail.com', plan: 'Iniciante', credits: 2360, date: '15/07' },
  { email: 'daviunb32@gmail.com', plan: 'Iniciante', credits: 3000, date: '15/07' },
  { email: 'gomesbotelhofilho@gmail.com', plan: 'Iniciante', credits: 0, date: '15/07' },
  { email: 'marcioamiranda@gmail.com', plan: 'Iniciante', credits: 3000, date: '15/07' },
  { email: 'andreyseixas07@gmail.com', plan: 'Empresas', credits: 17880, date: '15/07' },
  { email: 'dnielarodrigues708@gmail.com', plan: 'Iniciante', credits: 3000, date: '15/07' },
  { email: 'danielarodrigues708@gmail.com', plan: 'Iniciante', credits: 0, date: '15/07' },
  { email: 'fernandapasinatto@gmail.com', plan: 'Empresas', credits: 19400, date: '15/07' },
  { email: 'juniorsaphotos@gmail.com', plan: 'Iniciante', credits: 3000, date: '15/07' },
  { email: 'robsoncelta2012@gmail.com', plan: 'Iniciante', credits: 3000, date: '15/07' },
  { email: 'lucasssantosp@outlook.com', plan: 'Criador', credits: 6000, date: '15/07' },
  { email: 'guihermearaujosilv50@gmail.com', plan: 'Iniciante', credits: 0, date: '16/07' },
  { email: 'guilhermearaujosilv50@gmail.com', plan: 'Empresas', credits: 20000, date: '16/07' },
  { email: 'jheymesoficial23@gmail.com', plan: 'Iniciante', credits: 2880, date: '16/07' },
  { email: 'michaelsimoesdesene@gmail.com', plan: 'Iniciante', credits: 2760, date: '16/07' },
  { email: 'weslley.crodrigues@hotmail.com', plan: 'Iniciante', credits: 1920, date: '16/07' },
  { email: 'claudemir_santos-aju@hotmail.com', plan: 'Iniciante', credits: 3000, date: '16/07' },
  { email: 'silvioaraujo669@gmail.com', plan: 'Iniciante', credits: 20, date: '16/07' },
  { email: 'profronaldooliveira@hotmail.com', plan: 'Empresas', credits: 20000, date: '16/07' },
  { email: 'capitaoamazonas@yahoo.com.br', plan: 'Iniciante', credits: 2940, date: '16/07' },
  { email: 'vieiracristhian87@gmail.com', plan: 'Iniciante', credits: 1380, date: '16/07' },
  { email: 'yasminprado15@icloud.com', plan: 'Iniciante', credits: 1140, date: '16/07' },
  { email: 'seccoofabio@gmail.com', plan: 'Iniciante', credits: 3000, date: '16/07' },
  { email: 'diogobarber10@gmail.com', plan: 'Criador', credits: 6000, date: '16/07' },
  { email: 'werikrecomeso@gmail.com', plan: 'Iniciante', credits: 3000, date: '17/07' },
  { email: 'stephan_vidal@hotmail.com', plan: 'Empresas', credits: 19680, date: '17/07' },
  { email: 'pierafrancis@gmail.com', plan: 'Iniciante', credits: 3000, date: '17/07' },
  { email: 'contato.welita@gmail.com', plan: 'Iniciante', credits: 2980, date: '17/07' },
  { email: 'peixotobarrosdebarros@gmail.com', plan: 'Iniciante', credits: 3000, date: '17/07' },
  { email: 'montesantominercao@gmail.com', plan: 'Iniciante', credits: 3000, date: '17/07' },
  { email: 'afcientista@gmail.com', plan: 'Iniciante', credits: 3000, date: '17/07' },
  { email: 'montesantomineracao@gmail.com', plan: 'Iniciante', credits: 0, date: '17/07' },
  { email: 'vicentefbk@gmail.com', plan: 'Criador', credits: 6000, date: '17/07' },
  { email: 'rodriguesmariaines19@gmail.com', plan: 'Iniciante', credits: 3000, date: '17/07' },
  { email: 'modesto9790@gmail.com', plan: 'Iniciante', credits: 1620, date: '17/07' },
  { email: 'rosangelajackson36@gmail.com', plan: 'Iniciante', credits: 1800, date: '17/07' },
  { email: 'kursoskarlos@gmail.com', plan: 'Iniciante', credits: 3000, date: '17/07' },
  { email: 'ronaldoevan75@gmail.com', plan: 'Criador', credits: 5960, date: '18/07' },
  { email: 'joaoalvesnanda220@gmail.com', plan: 'Iniciante', credits: 3000, date: '18/07' },
  { email: 'sanderacalmon@gmail.com', plan: 'Iniciante', credits: 3000, date: '18/07' },
  { email: 'welder.wpw@gmail.com', plan: 'Iniciante', credits: 3000, date: '18/07' },
  { email: 'emersonalmeidaneves369@gmail.com', plan: 'Iniciante', credits: 0, date: '18/07' },
  { email: 'marcioabensuruber@gmail.com', plan: 'Iniciante', credits: 3000, date: '18/07' },
  { email: 'marcelopopovit@gmail.com', plan: 'Empresas', credits: 19980, date: '18/07' },
  { email: 'edmilsongarciab@gmail.com', plan: 'Empresas', credits: 19698, date: '18/07' },
  { email: 'w7reis@gmail.com', plan: 'Criador', credits: 4880, date: '18/07' },
  { email: 'angel.garciia23@hotmail.com', plan: 'Empresas', credits: 17600, date: '19/07' },
  { email: 'gilprcampos@hotmail.com', plan: 'Iniciante', credits: 2920, date: '19/07' },
  { email: 'lailsonsoaresa@gmail.com', plan: 'Iniciante', credits: 2920, date: '19/07' },
  { email: 'lailsonplay00@gmail.com', plan: 'Iniciante', credits: 3000, date: '19/07' },
  { email: 'jessicapalin3@gmail.com', plan: 'Empresas', credits: 20000, date: '19/07' },
  { email: 'lemathioni@hotmail.com', plan: 'Iniciante', credits: 2600, date: '19/07' },
  { email: 'andersoncanva1977@gmail.com', plan: 'Iniciante', credits: 3000, date: '20/07' },
  { email: 'ingrid.hilariohp@gmail.com', plan: 'Criador', credits: 5340, date: '20/07' },
  { email: 'albertononatoandrade@gmail.com', plan: 'Iniciante', credits: 0, date: '20/07' },
  { email: 'vaniarmiranda2010@gmail.com', plan: 'Iniciante', credits: 2680, date: '20/07' },
  { email: 'gomesrosagilson281@gmail.com', plan: 'Iniciante', credits: 3000, date: '21/07' },
  { email: 'nivaldopires1000@gmail.com', plan: 'Iniciante', credits: 2760, date: '21/07' },
  { email: 'reismultimidia@gmail.com', plan: 'Iniciante', credits: 2820, date: '22/07' },
  { email: 'raniere.workana@gmail.com', plan: 'Iniciante', credits: 0, date: '22/07' },
  { email: 'alan.dy.oficial@gmail.com', plan: 'Empresas', credits: 19840, date: '22/07' },
  { email: 'o.vinisouza626@gmail.com', plan: 'Iniciante', credits: 3000, date: '22/07' },
  { email: 'aguiarsetembrino@gmail.com', plan: 'Empresas', credits: 19960, date: '23/07' },
  { email: 'lanhousabc@gmail.com', plan: 'Iniciante', credits: 1480, date: '23/07' },
  { email: 's_oficialsantos@hotmail.com', plan: 'Empresas', credits: 19880, date: '23/07' },
  { email: 'matosvaldiclei15@gmail.com', plan: 'Empresas', credits: 19700, date: '23/07' },
  { email: 'vrodas5.hp@gmail.com', plan: 'Empresas', credits: 20000, date: '23/07' },
  { email: 'ksg49173@gmail.com', plan: 'Iniciante', credits: 2520, date: '23/07' },
  { email: 'payprimesolucoes@gmail.com', plan: 'Empresas', credits: 20000, date: '23/07' },
  { email: 'fabimcrepaldi@gmail.com', plan: 'Iniciante', credits: 3000, date: '23/07' },
  { email: 'fmaroni10@gmail.com', plan: 'Iniciante', credits: 2178, date: '23/07' },
  { email: 'xxnetboxx@gmail.com', plan: 'Iniciante', credits: 240, date: '24/07' },
  { email: 'allea8711@gmail.com', plan: 'Iniciante', credits: 3000, date: '24/07' },
  { email: 'ramonnamorais6@gmail.com', plan: 'Iniciante', credits: 3000, date: '24/07' },
  { email: 'santanasolidus@gmail.com', plan: 'Empresas', credits: 20000, date: '25/07' },
  { email: 'djelisondemuana@gmail.com', plan: 'Iniciante', credits: 2780, date: '25/07' },
  { email: 'lurdinha.molina80@gmail.com', plan: 'Iniciante', credits: 2820, date: '25/07' },
  { email: 'alvesitamar06@gmail.com', plan: 'Iniciante', credits: 2460, date: '25/07' },
  { email: 'deboraborgesferraz@gmail.com', plan: 'Iniciante', credits: 2520, date: '26/07' },
  { email: 'rgeanmeira@gmail.com', plan: 'Iniciante', credits: 3000, date: '27/07' },
  { email: 'carlaovitorino@yahoo.com.br', plan: 'Empresas', credits: 19560, date: '27/07' },
  { email: 'rayanepaulasousa@gmail.com', plan: 'Iniciante', credits: 0, date: '28/07' },
  { email: 'dr.felipedemelo@hotmail.com', plan: 'Iniciante', credits: 3000, date: '28/07' },
  { email: 'thiaguinhocarmo3@gmail.com', plan: 'Iniciante', credits: 3000, date: '29/07' },
  { email: 'mylenamelodesousa2004@gmail.com', plan: 'Iniciante', credits: 3000, date: '29/07' },
  { email: 'andreiaro.sousa@gmail.com', plan: 'Empresas', credits: 20000, date: '29/07' },
  { email: 'danielcarmosouza1603@gmail.com', plan: 'Criador', credits: 5400, date: '29/07' },
  { email: 'silvio.alessandro1973@gmail.com', plan: 'Empresas', credits: 19720, date: '29/07' },
  { email: 'grumzinha@gmail.com', plan: 'Iniciante', credits: 2760, date: '29/07' },
  { email: 'aparecidademouraandrea@gmail.com', plan: 'Iniciante', credits: 2800, date: '29/07' },
  { email: 'delimaandreribeiro2026@gmail.com', plan: 'Iniciante', credits: 3000, date: '30/07' },
  { email: 'marcyannee.mf@gmail.com', plan: 'Iniciante', credits: 0, date: '30/07' },
  { email: 'mahmirim1@gmail.com', plan: 'Empresas', credits: 19800, date: '30/07' },
  { email: 'renata0702.cristina@gmail.com', plan: 'Iniciante', credits: 3000, date: '30/07' },
  { email: 'delimaandreribeiro128@gmail.com', plan: 'Empresas', credits: 20000, date: '31/07' },
  { email: 'sabrynnathayalla13@gmail.com', plan: 'Iniciante', credits: 2580, date: '31/07' },
  { email: 'elton.cis@hotmail.com', plan: 'Iniciante', credits: 2800, date: '01/08' },
  { email: 'david.w.brilhante@gmail.com', plan: 'Empresas', credits: 18700, date: '01/08' },
  { email: 'please-listen1@hotmail.com', plan: 'Iniciante', credits: 2720, date: '01/08' },
  { email: 'visaored7@gmail.com', plan: 'Iniciante', credits: 2460, date: '01/08' },
  { email: 'adoremaisoficial@gmail.com', plan: 'Iniciante', credits: 2960, date: '02/08' },
  { email: 'gilmarduartecardoso@gmail.com', plan: 'Empresas', credits: 19580, date: '02/08' },
  { email: 'oficinatopmodel@gmail.com', plan: 'Iniciante', credits: 2720, date: '02/08' },
  { email: 'andreportugal66@gmail.com', plan: 'Empresas', credits: 19360, date: '03/08' },
  { email: 'idealmidiaofc@gmail.com', plan: 'Empresas', credits: 18998, date: '03/08' },
  { email: 'elizeumds01041981@gmail.com', plan: 'Empresas', credits: 18180, date: '04/08' },
  { email: 'daisyk.22ketellen@gmail.com', plan: 'Criador', credits: 4000, date: '04/08' },
  { email: 'dannykarolly@hotmail.com', plan: 'Criador', credits: 6000, date: '04/08' },
  { email: 'clubevipstudio8@gmail.com', plan: 'Iniciante', credits: 320, date: '05/08' },
  { email: 'anuncieaquipublic@gmail.com', plan: 'Iniciante', credits: 860, date: '05/08' },
  { email: 'andersoncruz50@gmail.com', plan: 'Iniciante', credits: 0, date: '05/08' },
  { email: 'thaisealvesdelima1@gmail.com', plan: 'Iniciante', credits: 180, date: '05/08' },
  { email: 'florafrutaemdelta@gmail.com', plan: 'Empresas', credits: 19860, date: '05/08' },
  { email: 'friends.producoes.2015@gmail.com', plan: 'Iniciante', credits: 2880, date: '06/08' },
  { email: 'xantillyn@gmail.com', plan: 'Iniciante', credits: 2240, date: '06/08' },
  { email: 'luistiago.gv16@gmail.com', plan: 'Iniciante', credits: 2740, date: '06/08' },
  { email: 'alexraiderversales7@gmail.com', plan: 'Iniciante', credits: 2920, date: '07/08' },
  { email: 'pr.rildofreire@gmail.com', plan: 'Empresas', credits: 19000, date: '07/08' },
  { email: 'jaquedasimba@gmail.com', plan: 'Criador', credits: 5940, date: '07/08' },
  { email: 'anandadevivegetariana@gmail.com', plan: 'Iniciante', credits: 2540, date: '07/08' },
  { email: 'juliane.lumiar@gmail.com', plan: 'Criador', credits: 4200, date: '08/08' },
  { email: 'wesleymendes195@gmail.com', plan: 'Iniciante', credits: 5280, date: '08/08' },
  { email: 'brunagk26@gmail.com', plan: 'Empresas', credits: 19840, date: '08/08' },
  { email: 'lribeiro.ba@gmail.com', plan: 'Iniciante', credits: 3000, date: '08/08' },
  { email: 'juniorhannaluiza@gmail.com', plan: 'Iniciante', credits: 2920, date: '08/08' },
  { email: 'gabrieljesus2030@gmail.com', plan: 'Criador', credits: 5860, date: '31/12' },
]

const results = []
let created = 0, updated = 0, errors = 0

function log(emoji, email, msg) {
  const line = `${emoji} ${email.padEnd(45)} ${msg}`
  console.log(line)
  results.push(line)
}

async function addExpiresAtColumn() {
  console.log('\n🔧 Verificando/adicionando coluna expires_at...')
  // Usar a REST API diretamente para executar SQL via rpc ou management API
  // Como não temos acesso direto ao SQL via supabase-js sem rpc customizado,
  // vamos tentar fazer um update com expires_at em um registro e ver se funciona
  // Primeiro vamos tentar uma abordagem: usar fetch direto para a management API
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql: "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expires_at timestamptz;" })
  })
  
  if (response.ok) {
    console.log('✅ Coluna expires_at verificada/adicionada via RPC.')
    return true
  }
  
  // RPC não existe — tentar via query direta (supabase só permite via management API)
  // Vamos usar o endpoint de administração do Supabase
  const mgmtResponse = await fetch(`https://api.supabase.com/v1/projects/npskqtsnwqyllslgmoof/database/query`, {
    method: 'POST', 
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({ query: "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expires_at timestamptz;" })
  })

  if (mgmtResponse.ok) {
    console.log('✅ Coluna expires_at adicionada via Management API.')
    return true
  }

  // Fallback: tentar descobrir o nome correto da coluna testando um update
  console.log('⚠️  Não foi possível adicionar coluna via API. Tentando direto...')
  return false
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log('║        MIGRAÇÃO DE USUÁRIOS — Max AI 2.0         ║')
  console.log(`║        Total: ${USERS.length} usuários                         ║`)
  console.log('╚══════════════════════════════════════════════════╝')

  // ── 1. Adicionar coluna expires_at se não existir ────────────────────────
  await addExpiresAtColumn()

  // ── 2. Buscar perfis existentes ──────────────────────────────────────────
  console.log('\n🔍 Buscando perfis existentes...')
  const { data: existingProfiles, error: profErr } = await supabase
    .from('profiles').select('id, email')
  if (profErr) { console.error('❌ FATAL:', profErr.message); process.exit(1) }

  const profileMap = {}
  for (const p of existingProfiles || []) profileMap[p.email.toLowerCase()] = p.id
  console.log(`✅ ${Object.keys(profileMap).length} perfis no banco.`)

  // ── 3. Buscar auth users ─────────────────────────────────────────────────
  console.log('🔍 Buscando usuários no Auth...')
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const authMap = {}
  for (const u of authData?.users || []) authMap[u.email.toLowerCase()] = u.id
  console.log(`✅ ${Object.keys(authMap).length} usuários no Auth.\n`)
  console.log('─'.repeat(60))

  // ── 4. Processar cada usuário ─────────────────────────────────────────────
  for (let i = 0; i < USERS.length; i++) {
    const { email: rawEmail, plan, credits, date } = USERS[i]
    const email = rawEmail.toLowerCase().trim()
    const expiresAt = parseDate(date)
    const num = String(i + 1).padStart(3, '0')

    process.stdout.write(`[${num}/${USERS.length}] ${email.padEnd(45)} `)

    try {
      const profileId = profileMap[email]
      let authId = authMap[email]

      if (profileId) {
        // ── UPDATE ─────────────────────────────────────────────────────────
        // Tentar com expires_at, mas também atualizar credit_limit e credits
        const updatePayload = { plan, credit_limit: credits, credits, expires_at: expiresAt }
        
        const { error: updateErr } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', profileId)

        if (updateErr) {
          // Se expires_at falhou, tentar sem ela
          if (updateErr.message.includes('expires_at')) {
            const { error: updateErr2 } = await supabase
              .from('profiles')
              .update({ plan, credit_limit: credits, credits })
              .eq('id', profileId)
            if (updateErr2) throw new Error('Update sem expires_at: ' + updateErr2.message)
            console.log(`⚠️  ATUALIZADO sem expires_at (coluna ausente)`)
            log('⚠️ ', email, `ATUALIZADO (sem data) | plano=${plan} | créditos=${credits}`)
          } else {
            throw new Error('Update: ' + updateErr.message)
          }
        } else {
          console.log(`✅ ATUALIZADO (plano=${plan}, créditos=${credits}, expira=${date})`)
          log('✅', email, `ATUALIZADO | plano=${plan} | créditos=${credits} | expira=${date}`)
        }
        updated++

      } else {
        // ── CREATE ─────────────────────────────────────────────────────────
        if (!authId) {
          const tempPwd = `Mx${Math.random().toString(36).slice(2,8)}Aa!9`
          const { data: newAuth, error: createErr } = await supabase.auth.admin.createUser({
            email, password: tempPwd, email_confirm: true,
            user_metadata: { name: email.split('@')[0], plan }
          })
          if (createErr) {
            if (createErr.message.includes('already') || createErr.message.includes('registered')) {
              const { data: retry } = await supabase.auth.admin.listUsers({ perPage: 1000 })
              const found = retry?.users?.find(u => u.email.toLowerCase() === email)
              if (found) authId = found.id
              else throw new Error('Auth: ' + createErr.message)
            } else throw new Error('Auth: ' + createErr.message)
          } else {
            authId = newAuth.user.id
          }
          await new Promise(r => setTimeout(r, 600))
        }

        const profilePayload = {
          id: authId, email,
          name: email.split('@')[0],
          plan, credit_limit: credits, credits,
          credit_used: 0,
          expires_at: expiresAt
        }

        const { error: upsertErr } = await supabase
          .from('profiles')
          .upsert(profilePayload, { onConflict: 'id' })

        if (upsertErr) {
          // Tentar sem expires_at
          if (upsertErr.message.includes('expires_at')) {
            delete profilePayload.expires_at
            const { error: upsertErr2 } = await supabase
              .from('profiles')
              .upsert(profilePayload, { onConflict: 'id' })
            if (upsertErr2) throw new Error('Upsert sem expires_at: ' + upsertErr2.message)
            console.log(`⚠️  CRIADO sem expires_at`)
            log('⚠️ ', email, `CRIADO (sem data) | plano=${plan} | créditos=${credits}`)
          } else {
            throw new Error('Upsert: ' + upsertErr.message)
          }
        } else {
          console.log(`🆕 CRIADO (plano=${plan}, créditos=${credits}, expira=${date})`)
          log('🆕', email, `CRIADO     | plano=${plan} | créditos=${credits} | expira=${date}`)
        }
        created++
      }
    } catch (err) {
      console.log(`❌ ERRO: ${err.message}`)
      log('❌', email, `ERRO | ${err.message}`)
      errors++
    }
  }

  // ── 5. Relatório ──────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60))
  console.log('                  RELATÓRIO FINAL')
  console.log('═'.repeat(60))
  console.log(`  Total      : ${USERS.length}`)
  console.log(`  ✅ Atualizados : ${updated}`)
  console.log(`  🆕 Criados     : ${created}`)
  console.log(`  ❌ Erros       : ${errors}`)
  console.log('═'.repeat(60))

  if (errors > 0) {
    console.log('\n⚠️  Usuários com erro:')
    results.filter(r => r.startsWith('❌')).forEach(r => console.log(' ', r))
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const logFile = `migration-log-${timestamp}.txt`
  fs.writeFileSync(logFile, [
    `MIGRAÇÃO: ${new Date().toISOString()}`,
    `Total: ${USERS.length} | Criados: ${created} | Atualizados: ${updated} | Erros: ${errors}`,
    '─'.repeat(60),
    ...results
  ].join('\n'), 'utf8')
  console.log(`\n📄 Log: ${logFile}\n✅ Concluído!\n`)
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })

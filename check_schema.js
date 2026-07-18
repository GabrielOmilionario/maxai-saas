const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    acc[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
  return acc;
}, {});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY; // USE SERVICE ROLE
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: user, error: userErr } = await supabase.from('profiles').select('*').eq('email', 'elizeumds01041981@gmail.com');
  console.log('User Profile:', user);

  // Read schema of chat_messages and generations
  const { data: msg } = await supabase.from('chat_messages').select('*').limit(1);
  console.log('chat_messages keys:', msg && msg[0] ? Object.keys(msg[0]) : 'no data');

  const { data: gen } = await supabase.from('generations').select('*').limit(1);
  console.log('generations keys:', gen && gen[0] ? Object.keys(gen[0]) : 'no data');
}
run();

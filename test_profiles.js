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
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Try to use pg_meta or standard SQL if we had access, but we don't via JS client.
  // Let's just check profiles
  const { data: profiles, error } = await supabase.from('profiles').select('id, email, plan, credit_limit, credit_used').limit(1);
  console.log('Profiles data structure:', profiles);
  console.log('Error if any:', error);
}
run();

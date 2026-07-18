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
  const userId = '44495263-aa17-4838-9dcc-08dd22859c86';

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profile) {
    console.log('Current credit_used:', profile.credit_used);
    const newCreditUsed = Math.max(0, profile.credit_used - 900);
    
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({ credit_used: newCreditUsed })
      .eq('id', userId)
      .select()
      .single();
      
    if (error) console.error('Error updating:', error);
    else console.log('Successfully refunded 900 credits. New credit_used:', updated.credit_used);
  }
}
run();

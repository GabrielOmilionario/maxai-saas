const fs = require('fs');
const path = require('path');
function loadEnv() {
  try {
    const envConfig = fs.readFileSync(path.resolve(__dirname, '.env'), 'utf8');
    envConfig.split('\n').forEach(line => {
      if (line.trim().startsWith('#')) return;
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim();
      }
    });
  } catch (e) {}
}
loadEnv();

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanOldMedia() {
  console.log('Iniciando limpeza de mídias antigas (mais de 1 dia)...');

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const oneDayAgoStr = oneDayAgo.toISOString();

  console.log(`Buscando gerações anteriores a: ${oneDayAgoStr}`);

  // Buscar gerações antigas
  const { data: oldGenerations, error: fetchError } = await supabase
    .from('generations')
    .select('id, result_url, type')
    .lt('created_at', oneDayAgoStr);

  if (fetchError) {
    console.error('Erro ao buscar gerações:', fetchError);
    return;
  }

  console.log(`Encontradas ${oldGenerations.length} gerações antigas.`);

  if (oldGenerations.length === 0) {
    console.log('Nenhuma mídia para limpar.');
    return;
  }

  const filesToDelete = [];

  for (const gen of oldGenerations) {
    if (gen.result_url && gen.result_url.includes('supabase.co/storage/v1/object/public/media/')) {
      const urlParts = gen.result_url.split('/media/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1].split('?')[0]; // remover query params se houver
        filesToDelete.push(filePath);
      }
    }
  }

  console.log(`Encontrados ${filesToDelete.length} arquivos no bucket para exclusão.`);

  // Deletar arquivos do bucket em lotes de 100
  if (filesToDelete.length > 0) {
    for (let i = 0; i < filesToDelete.length; i += 100) {
      const batch = filesToDelete.slice(i, i + 100);
      const { data: deleteData, error: deleteError } = await supabase.storage.from('media').remove(batch);
      
      if (deleteError) {
        console.error('Erro ao deletar lote do storage:', deleteError);
      } else {
        console.log(`Lote de ${batch.length} arquivos deletados do storage.`);
      }
    }
  }

  // Deletar os registros do banco de dados
  const idsToDelete = oldGenerations.map(g => g.id);
  
  if (idsToDelete.length > 0) {
    for (let i = 0; i < idsToDelete.length; i += 100) {
      const batchIds = idsToDelete.slice(i, i + 100);
      const { error: dbDeleteError } = await supabase
        .from('generations')
        .delete()
        .in('id', batchIds);
        
      if (dbDeleteError) {
        console.error('Erro ao deletar lote de gerações do banco:', dbDeleteError);
      } else {
        console.log(`Lote de ${batchIds.length} registros deletados da tabela generations.`);
      }
    }
  }

  // Atualizar a tabela chat_messages que referenciam mídias deletadas
  console.log('Atualizando mensagens de chat com mídia expirada...');
  const { error: updateChatError } = await supabase
    .from('chat_messages')
    .update({
      media_url: null,
      status: 'failed',
      error_msg: 'A mídia expirou e foi removida do servidor para liberar espaço.'
    })
    .lt('created_at', oneDayAgoStr)
    .not('media_url', 'is', null);

  if (updateChatError) {
    console.error('Erro ao atualizar chat_messages:', updateChatError);
  } else {
    console.log('Mensagens antigas do chat atualizadas.');
  }

  console.log('Limpeza concluída com sucesso!');
}

cleanOldMedia().catch(console.error);

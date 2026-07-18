const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

let createClient;
try {
  createClient = require('@supabase/supabase-js').createClient;
} catch (e) {
  console.log('===================================================');
  console.log('  Notice: @supabase/supabase-js is not installed.');
  console.log('  Please run `npm install` to load Supabase dependencies.');
  console.log('===================================================');
}

const app = express();
const PORT = process.env.PORT || 3000;

/* ==========================================================================
   SUPABASE CLIENT SETUP
   ========================================================================== */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
let supabaseAdmin = null;
let useSupabaseMock = true;

const isPlaceholder = (key) => !key || key.includes('COLE_SUA_') || key.length < 10;
const hasValidKeys = SUPABASE_URL && !isPlaceholder(SUPABASE_ANON_KEY) && !isPlaceholder(SUPABASE_SERVICE_ROLE_KEY);

if (hasValidKeys && createClient) {
  try {
    // Public client (anon key) for auth validation
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Admin client (service role key) for backend DB operations (bypasses RLS safely on server)
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    useSupabaseMock = false;
    console.log('===================================================');
    console.log('  ✅ Supabase client initialized successfully.');
    console.log(`  Project: ${SUPABASE_URL}`);
    console.log('===================================================');
  } catch (err) {
    console.error('Error initializing Supabase client:', err.message);
  }
} else {
  console.log('===================================================');
  console.log('  ⚠️  Supabase credentials missing or are placeholders.');
  console.log('  Running in Mock/Simulated database mode.');
  console.log('  Please set valid SUPABASE_URL, SUPABASE_ANON_KEY, and');
  console.log('  SUPABASE_SERVICE_ROLE_KEY in your .env file to enable');
  console.log('  live database, auth, and gallery saving.');
  console.log('===================================================');
}

/* ==========================================================================
   EXPRESS MIDDLEWARE
   ========================================================================== */

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create required directories
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 20 * 1024 * 1024 } });

/* ==========================================================================
   IN-MEMORY MOCK SYSTEM
   ========================================================================== */

const mockTasks = {};

const mockContent = {
  video: [
    { keywords: ['city', 'cyberpunk', 'futuristic', 'neon', 'car', 'flying'], url: 'https://cdn.pixabay.com/video/2021/04/17/71360-539606822_large.mp4' },
    { keywords: ['nature', 'sunset', 'lake', 'mountain', 'serene', 'calm', 'water'], url: 'https://cdn.pixabay.com/video/2020/09/24/51048-463870876_large.mp4' },
    { keywords: ['space', 'cosmic', 'portal', 'galaxy', 'universe', 'star'], url: 'https://cdn.pixabay.com/video/2021/10/11/91629-617865249_large.mp4' },
    { keywords: ['abstract', 'color', 'fluid', 'animation', 'art'], url: 'https://cdn.pixabay.com/video/2020/09/21/50821-463286082_large.mp4' }
  ],
  image: [
    { keywords: ['city', 'cyberpunk', 'futuristic', 'neon', 'car', 'flying'], url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80' },
    { keywords: ['nature', 'sunset', 'lake', 'mountain', 'serene', 'calm', 'water'], url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80' },
    { keywords: ['space', 'cosmic', 'portal', 'galaxy', 'universe', 'star'], url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80' },
    { keywords: ['abstract', 'color', 'fluid', 'animation', 'art'], url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=80' }
  ]
};

function getMockMedia(type, prompt) {
  const list = mockContent[type];
  const lowerPrompt = (prompt || '').toLowerCase();
  for (const item of list) {
    if (item.keywords.some(k => lowerPrompt.includes(k))) return item.url;
  }
  return type === 'video'
    ? 'https://cdn.pixabay.com/video/2021/04/17/71360-539606822_large.mp4'
    : 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80';
}

function createMockTask(type, prompt) {
  const uuid = 'mock-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  mockTasks[uuid] = {
    uuid, status: 1, status_percentage: 0, type, prompt,
    result_url: getMockMedia(type, prompt), created_at: new Date().toISOString()
  };
  return uuid;
}

/* ==========================================================================
   JSON FILE DB HELPERS (FALLBACK WHEN SUPABASE UNAVAILABLE)
   ========================================================================== */

const getHistory = () => {
  try {
    const f = path.join(dataDir, 'history.json');
    return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
  } catch { return []; }
};
const saveHistory = (h) => {
  try { fs.writeFileSync(path.join(dataDir, 'history.json'), JSON.stringify(h, null, 2)); } catch { }
};
const getProfile = () => {
  try {
    const f = path.join(dataDir, 'profile.json');
    return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
  } catch { return {}; }
};
const saveProfile = (p) => {
  try { fs.writeFileSync(path.join(dataDir, 'profile.json'), JSON.stringify(p, null, 2)); } catch { }
};
const getMediaHistory = () => {
  try {
    const f = path.join(dataDir, 'media_history.json');
    return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
  } catch { return []; }
};
const saveMediaHistory = (list) => {
  try { fs.writeFileSync(path.join(dataDir, 'media_history.json'), JSON.stringify(list, null, 2)); } catch { }
};

/* ==========================================================================
   AUTH MIDDLEWARE
   ========================================================================== */

async function requireAuth(req, res, next) {
  // Mock mode: auto-inject demo user
  if (useSupabaseMock || !supabase) {
    req.user = {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'demo@maxai.com',
      user_metadata: { name: 'Usuário Demo' }
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autorização não fornecido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido ou expirado. Faça login novamente.' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Erro interno na validação do token' });
  }
}

/* ==========================================================================
   SUPABASE STORAGE HELPERS
   ========================================================================== */

async function uploadRemoteUrlToSupabase(remoteUrl, fileType) {
  if (useSupabaseMock || !supabaseAdmin) return remoteUrl;
  try {
    const response = await axios.get(remoteUrl, { responseType: 'arraybuffer', timeout: 30000 });
    const buffer = Buffer.from(response.data, 'binary');
    const ext = fileType === 'video' ? '.mp4' : '.png';
    const uniqueName = `generated-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const contentType = fileType === 'video' ? 'video/mp4' : 'image/png';

    const { error } = await supabaseAdmin.storage
      .from('media')
      .upload(uniqueName, buffer, { contentType, cacheControl: '3600', upsert: true });

    if (error) {
      console.error('Supabase Storage upload error:', error.message);
      return remoteUrl;
    }

    const { data: { publicUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(uniqueName);
    return publicUrl;
  } catch (err) {
    console.error('Error uploading to Supabase:', err.message);
    return remoteUrl;
  }
}

async function uploadLocalFileToSupabase(localFilePath, originalName) {
  if (useSupabaseMock || !supabaseAdmin) return `/uploads/${path.basename(localFilePath)}`;
  try {
    const fileBuffer = fs.readFileSync(localFilePath);
    const ext = path.extname(originalName || localFilePath).toLowerCase();
    const uniqueName = `ref-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    let contentType = 'application/octet-stream';
    if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.mp4') contentType = 'video/mp4';
    else if (ext === '.webm') contentType = 'video/webm';

    const { error } = await supabaseAdmin.storage
      .from('media')
      .upload(uniqueName, fileBuffer, { contentType, cacheControl: '3600', upsert: true });

    if (error) return `/uploads/${path.basename(localFilePath)}`;
    const { data: { publicUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(uniqueName);
    return publicUrl;
  } catch (err) {
    console.error('Error uploading local file to Supabase:', err.message);
    return `/uploads/${path.basename(localFilePath)}`;
  }
}

async function uploadBase64ToSupabase(base64Data) {
  if (!base64Data || !base64Data.startsWith('data:')) return base64Data;
  if (useSupabaseMock || !supabaseAdmin) return base64Data;
  try {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches) return base64Data;
    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    let ext = '.png';
    if (contentType === 'image/jpeg') ext = '.jpg';
    else if (contentType === 'image/gif') ext = '.gif';
    const uniqueName = `attachment-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const { error } = await supabaseAdmin.storage
      .from('media')
      .upload(uniqueName, buffer, { contentType, cacheControl: '3600', upsert: true });
    if (error) return base64Data;
    const { data: { publicUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(uniqueName);
    return publicUrl;
  } catch (err) {
    console.error('Error uploading base64 to Supabase:', err.message);
    return base64Data;
  }
}

/* ==========================================================================
   AUTH ROUTES
   ========================================================================== */

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
  }

  if (useSupabaseMock || !supabase) {
    return res.json({
      success: true,
      message: 'Cadastro simulado com sucesso (Modo Demo)',
      session: {
        access_token: 'mock-session-token-' + Date.now(),
        user: { id: '00000000-0000-0000-0000-000000000000', email, user_metadata: { name: name || 'Usuário' } }
      }
    });
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name || 'Usuário' } }
    });

    if (error) {
      let msg = error.message;
      if (msg.includes('already registered')) msg = 'Este e-mail já está cadastrado. Faça login.';
      return res.status(400).json({ error: msg });
    }

    res.json({
      success: true,
      message: 'Usuário cadastrado com sucesso!',
      session: data.session,
      user: data.user
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Erro ao cadastrar usuário' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
  }

  if (useSupabaseMock || !supabase) {
    return res.json({
      success: true,
      session: {
        access_token: 'mock-session-token-' + Date.now(),
        user: { id: '00000000-0000-0000-0000-000000000000', email, user_metadata: { name: 'Usuário Demo' } }
      }
    });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      let msg = error.message;
      if (msg.includes('Invalid login credentials')) msg = 'E-mail ou senha inválidos.';
      return res.status(400).json({ error: msg });
    }
    res.json({ success: true, session: data.session, user: data.user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erro ao realizar login' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', async (req, res) => {
  if (useSupabaseMock || !supabase) return res.json({ success: true });
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      await supabase.auth.admin?.signOut(token);
    }
    res.json({ success: true });
  } catch (err) {
    res.json({ success: true }); // Silently succeed on logout
  }
});

/* ==========================================================================
   USER PROFILE ROUTES
   ========================================================================== */

// GET /api/profile
app.get('/api/profile', requireAuth, async (req, res) => {
  const userId = req.user.id;

  if (useSupabaseMock || !supabaseAdmin) {
    return res.json(getProfile());
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Profile not found — create it
        const defaultProfile = {
          id: userId,
          name: req.user.user_metadata?.name || 'Usuário',
          email: req.user.email,
          plan: 'Free',
          credit_used: 0,
          credit_limit: 100
        };
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from('profiles').insert(defaultProfile).select().single();
        if (insertError) throw insertError;
        return res.json(inserted);
      }
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error('Fetch profile error:', err);
    res.status(500).json({ error: 'Erro ao buscar perfil do usuário' });
  }
});

// POST /api/profile
app.post('/api/profile', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const updates = req.body;

  if (useSupabaseMock || !supabaseAdmin) {
    const current = getProfile();
    const updated = { ...current, ...updates };
    saveProfile(updated);
    return res.json(updated);
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        name: updates.name,
        plan: updates.plan,
        credit_used: updates.credit_used,
        credit_limit: updates.credit_limit,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

/* ==========================================================================
   CHAT HISTORY ROUTES
   ========================================================================== */

// GET /api/history
app.get('/api/history', requireAuth, async (req, res) => {
  const userId = req.user.id;

  if (useSupabaseMock || !supabaseAdmin) {
    return res.json(getHistory());
  }

  try {
    const { data: sessions, error: sError } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (sError) throw sError;

    const { data: messages, error: mError } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (mError) throw mError;

    const history = (sessions || []).map(s => ({
      id: s.id,
      title: s.title,
      model: s.model,
      messages: (messages || [])
        .filter(m => m.session_id === s.id)
        .map(m => ({
          id: m.id,
          role: m.role,
          text: m.text,
          attachments: m.attachments || [],
          mediaUrl: m.media_url,
          mediaType: m.media_type,
          modelName: m.model_name,
          status: m.status,
          progress: m.progress,
          error: m.error_msg
        }))
    }));

    res.json(history);
  } catch (err) {
    console.error('Fetch history error:', err);
    res.status(500).json({ error: 'Erro ao buscar histórico de conversas' });
  }
});

// POST /api/history
app.post('/api/history', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const history = req.body;

  if (useSupabaseMock || !supabaseAdmin) {
    saveHistory(history);
    return res.json({ success: true });
  }

  try {
    if (!Array.isArray(history)) {
      return res.status(400).json({ error: 'Formato inválido de histórico' });
    }

    const sessionIds = history.map(s => s.id);
    const messageIds = [];
    const sessionUpserts = [];
    const messageUpserts = [];

    for (const s of history) {
      sessionUpserts.push({ id: s.id, user_id: userId, title: s.title, model: s.model });

      if (Array.isArray(s.messages)) {
        for (const m of s.messages) {
          const processedAttachments = [];
          if (Array.isArray(m.attachments)) {
            for (const att of m.attachments) {
              if (att && att.startsWith('data:')) {
                processedAttachments.push(await uploadBase64ToSupabase(att));
              } else if (att) {
                processedAttachments.push(att);
              }
            }
          }
          messageIds.push(m.id);
          messageUpserts.push({
            id: m.id,
            session_id: s.id,
            user_id: userId,
            role: m.role,
            text: m.text || '',
            attachments: processedAttachments,
            media_url: m.mediaUrl || null,
            media_type: m.mediaType || null,
            model_name: m.modelName || null,
            status: m.status || 'success',
            progress: m.progress || 100,
            error_msg: m.error || null
          });
        }
      }
    }

    // Delete removed sessions
    const { data: dbSessions } = await supabaseAdmin
      .from('chat_sessions').select('id').eq('user_id', userId);
    if (dbSessions && dbSessions.length > 0) {
      const toDelete = dbSessions.filter(ds => !sessionIds.includes(ds.id)).map(ds => ds.id);
      if (toDelete.length > 0) {
        await supabaseAdmin.from('chat_sessions').delete().in('id', toDelete);
      }
    }

    // Upsert sessions
    if (sessionUpserts.length > 0) {
      const { error: sErr } = await supabaseAdmin.from('chat_sessions').upsert(sessionUpserts);
      if (sErr) throw sErr;
    }

    // Upsert messages
    if (messageUpserts.length > 0) {
      const { error: mErr } = await supabaseAdmin.from('chat_messages').upsert(messageUpserts);
      if (mErr) throw mErr;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Save history error:', err);
    res.status(500).json({ error: 'Erro ao salvar histórico de conversas' });
  }
});

/* ==========================================================================
   MEDIA GALLERY ROUTES
   ========================================================================== */

// GET /api/media-history — returns all media generations for the user
app.get('/api/media-history', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  if (useSupabaseMock || !supabaseAdmin) {
    const all = getMediaHistory().filter(m => m.user_id === userId || userId === '00000000-0000-0000-0000-000000000000');
    return res.json({ data: all.slice(offset, offset + limit), total: all.length });
  }

  try {
    const { data, error, count } = await supabaseAdmin
      .from('media_generations')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    res.json({ data: data || [], total: count || 0 });
  } catch (err) {
    console.error('Fetch media history error:', err);
    res.status(500).json({ error: 'Erro ao buscar histórico de mídia' });
  }
});

// POST /api/media-history — save a completed generation
app.post('/api/media-history', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { media_type, model_name, prompt, media_url, session_id, message_id } = req.body;

  if (!media_type || !model_name || !prompt || !media_url) {
    return res.status(400).json({ error: 'media_type, model_name, prompt e media_url são obrigatórios' });
  }

  if (useSupabaseMock || !supabaseAdmin) {
    const list = getMediaHistory();
    const entry = {
      id: 'gen-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      media_type, model_name, prompt, media_url, session_id, message_id,
      created_at: new Date().toISOString()
    };
    list.unshift(entry);
    saveMediaHistory(list.slice(0, 500)); // Keep max 500 entries
    return res.json({ success: true, data: entry });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('media_generations')
      .insert({
        user_id: userId,
        media_type,
        model_name,
        prompt,
        media_url,
        session_id: session_id || null,
        message_id: message_id || null
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Save media history error:', err);
    res.status(500).json({ error: 'Erro ao salvar geração de mídia' });
  }
});

// DELETE /api/media-history/:id — delete a specific generation
app.delete('/api/media-history/:id', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  if (useSupabaseMock || !supabaseAdmin) {
    const list = getMediaHistory().filter(m => m.id !== id);
    saveMediaHistory(list);
    return res.json({ success: true });
  }

  try {
    const { error } = await supabaseAdmin
      .from('media_generations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId); // Ensures users can only delete their own
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Delete media error:', err);
    res.status(500).json({ error: 'Erro ao deletar geração' });
  }
});

/* ==========================================================================
   VIDEO GENERATION — GROK (GeminiGen.ai)
   ========================================================================== */

app.post('/api/generate/grok', requireAuth, upload.array('files'), async (req, res) => {
  const { prompt, resolution, aspect_ratio, duration, mode, useMock } = req.body;

  if (useMock === 'true' || !process.env.GEMINIGEN_API_KEY) {
    const uuid = createMockTask('video', prompt);
    return res.json({
      uuid, model_name: 'grok-3', input_text: prompt, type: 'video',
      status: 1, status_desc: 'Simulando geração com Grok-3 (Mock)...', status_percentage: 0
    });
  }

  try {
    const form = new FormData();
    form.append('prompt', prompt || '');
    form.append('model', 'grok-3');
    form.append('resolution', resolution || '480p');
    form.append('aspect_ratio', aspect_ratio || 'landscape');
    form.append('duration', duration || '6');
    form.append('mode', mode || 'custom');

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        form.append('files', fs.createReadStream(file.path), file.originalname);
      });
    }

    const response = await axios.post('https://api.geminigen.ai/uapi/v1/video-gen/grok', form, {
      headers: { ...form.getHeaders(), 'x-api-key': process.env.GEMINIGEN_API_KEY },
      timeout: 60000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Grok generation error:', error.response?.data || error.message);
    const uuid = createMockTask('video', prompt);
    res.json({
      uuid, model_name: 'grok-3', input_text: prompt, type: 'video',
      status: 1, status_desc: 'Erro na API. Fallback para Simulação...', status_percentage: 0, is_fallback: true
    });
  }
});

/* ==========================================================================
   VIDEO GENERATION — VEO 3 (GeminiGen.ai)
   ========================================================================== */

app.post('/api/generate/veo', requireAuth, upload.array('files'), async (req, res) => {
  const { prompt, model, resolution, duration, aspect_ratio, mode_image, useMock } = req.body;

  if (useMock === 'true' || !process.env.GEMINIGEN_API_KEY) {
    const uuid = createMockTask('video', prompt);
    return res.json({
      uuid, model_name: model || 'veo-3.1', input_text: prompt, type: 'video',
      status: 1, status_desc: `Simulando com ${model || 'Veo 3.1'} (Mock)...`, status_percentage: 0
    });
  }

  try {
    const form = new FormData();
    form.append('prompt', prompt || '');
    form.append('model', model || 'veo-3.1');
    form.append('resolution', resolution || '720p');
    form.append('duration', duration || '8');
    form.append('aspect_ratio', aspect_ratio || '16:9');
    form.append('mode_image', mode_image || 'frame');

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        form.append('ref_images', fs.createReadStream(file.path), file.originalname);
      });
    }

    const response = await axios.post('https://api.geminigen.ai/uapi/v1/video-gen/veo', form, {
      headers: { ...form.getHeaders(), 'x-api-key': process.env.GEMINIGEN_API_KEY },
      timeout: 60000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Veo generation error:', error.response?.data || error.message);
    const uuid = createMockTask('video', prompt);
    res.json({
      uuid, model_name: model || 'veo-3.1', input_text: prompt, type: 'video',
      status: 1, status_desc: 'Erro na API. Fallback para Simulação...', status_percentage: 0, is_fallback: true
    });
  }
});

/* ==========================================================================
   VIDEO EXTENSION — GROK
   ========================================================================== */

app.post('/api/video-extend/grok', requireAuth, async (req, res) => {
  const { prompt, ref_history, useMock } = req.body;

  if (useMock === 'true' || !process.env.GEMINIGEN_API_KEY || (ref_history && ref_history.startsWith('mock-'))) {
    const uuid = createMockTask('video', `${prompt} (Extended)`);
    return res.json({
      uuid, model_name: 'grok-3', input_text: prompt, type: 'video',
      status: 1, status_desc: 'Simulando extensão Grok-3 (Mock)...', status_percentage: 0
    });
  }

  try {
    const form = new FormData();
    form.append('prompt', prompt || '');
    form.append('ref_history', ref_history || '');

    const response = await axios.post('https://api.geminigen.ai/uapi/v1/video-extend/grok', form, {
      headers: { ...form.getHeaders(), 'x-api-key': process.env.GEMINIGEN_API_KEY },
      timeout: 60000
    });
    res.json(response.data);
  } catch (error) {
    console.error('Grok extend error:', error.response?.data || error.message);
    const uuid = createMockTask('video', prompt);
    res.json({ uuid, model_name: 'grok-3', input_text: prompt, type: 'video', status: 1, status_percentage: 0 });
  }
});

/* ==========================================================================
   VIDEO EXTENSION — VEO
   ========================================================================== */

app.post('/api/video-extend/veo', requireAuth, async (req, res) => {
  const { prompt, ref_history, useMock } = req.body;

  if (useMock === 'true' || !process.env.GEMINIGEN_API_KEY || (ref_history && ref_history.startsWith('mock-'))) {
    const uuid = createMockTask('video', `${prompt} (Extended)`);
    return res.json({
      uuid, model_name: 'veo-2', input_text: prompt, type: 'video',
      status: 1, status_desc: 'Simulando extensão Veo-2 (Mock)...', status_percentage: 0
    });
  }

  try {
    const form = new FormData();
    form.append('prompt', prompt || '');
    form.append('ref_history', ref_history || '');

    const response = await axios.post('https://api.geminigen.ai/uapi/v1/video-extend/veo', form, {
      headers: { ...form.getHeaders(), 'x-api-key': process.env.GEMINIGEN_API_KEY },
      timeout: 60000
    });
    res.json(response.data);
  } catch (error) {
    console.error('Veo extend error:', error.response?.data || error.message);
    const uuid = createMockTask('video', prompt);
    res.json({ uuid, model_name: 'veo-2', input_text: prompt, type: 'video', status: 1, status_percentage: 0 });
  }
});

/* ==========================================================================
   IMAGE GENERATION — GPT IMAGE (KIE AI)
   ========================================================================== */

app.post('/api/generate/gpt-image', requireAuth, upload.array('files'), async (req, res) => {
  const { prompt, aspect_ratio, useMock } = req.body;

  if (useMock === 'true' || !process.env.KIE_API_KEY) {
    const taskId = createMockTask('image', prompt);
    return res.json({
      taskId, task_id: taskId, code: 200, msg: 'success',
      data: { taskId, task_id: taskId }
    });
  }

  try {
    const isImgToImg = req.files && req.files.length > 0;
    const model = isImgToImg ? 'gpt-image-2-image-to-image' : 'gpt-image-2-text-to-image';

    const inputPayload = {
      prompt: prompt || '',
      aspect_ratio: aspect_ratio || 'auto'
    };

    if (isImgToImg) {
      const hostname = req.get('host');
      const protocol = req.protocol;
      inputPayload.image_urls = req.files.map(f => `${protocol}://${hostname}/uploads/${f.filename}`);
    }

    const response = await axios.post('https://api.kie.ai/api/v1/jobs/createTask',
      { model, input: inputPayload },
      {
        headers: { 'Authorization': `Bearer ${process.env.KIE_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('GPT Image error:', error.response?.data || error.message);
    const taskId = createMockTask('image', prompt);
    res.json({
      taskId, task_id: taskId, code: 200, msg: 'Fallback ativo',
      data: { taskId, task_id: taskId }
    });
  }
});

/* ==========================================================================
   STATUS POLLING — VIDEO (GeminiGen.ai)
   ========================================================================== */

app.get('/api/status/video/:uuid', async (req, res) => {
  const { uuid } = req.params;

  if (uuid.startsWith('mock-')) {
    const task = mockTasks[uuid];
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (task.status === 1) {
      task.status_percentage += 15 + Math.floor(Math.random() * 10);
      if (task.status_percentage >= 100) {
        task.status_percentage = 100;
        task.status = 2;
      }
    }
    return res.json({
      id: 9999, uuid: task.uuid, model_name: 'mock-model', input_text: task.prompt,
      type: 'video', status: task.status,
      status_desc: task.status === 2 ? 'Completed' : 'Generating...',
      status_percentage: task.status_percentage,
      video_url: task.status === 2 ? task.result_url : null,
      url: task.status === 2 ? task.result_url : null,
      created_at: task.created_at
    });
  }

  try {
    const response = await axios.get(`https://api.geminigen.ai/uapi/v1/history/${uuid}`, {
      headers: { 'x-api-key': process.env.GEMINIGEN_API_KEY },
      timeout: 15000
    });
    const data = response.data;

    // On completion, attempt to archive to Supabase Storage
    if (data && data.status === 2) {
      const originalUrl = data.video_url || data.url;
      if (originalUrl && !originalUrl.includes('supabase.co')) {
        const supabaseUrl = await uploadRemoteUrlToSupabase(originalUrl, 'video');
        if (data.video_url) data.video_url = supabaseUrl;
        if (data.url) data.url = supabaseUrl;
      }
    }

    res.json(data);
  } catch (error) {
    console.error(`Video status error for ${uuid}:`, error.message);
    res.status(500).json({ error: 'Erro ao verificar status do vídeo' });
  }
});

/* ==========================================================================
   STATUS POLLING — IMAGE (KIE AI)
   ========================================================================== */

app.get('/api/status/image/:taskId', async (req, res) => {
  const { taskId } = req.params;

  if (taskId.startsWith('mock-')) {
    const task = mockTasks[taskId];
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (task.status === 1) {
      task.status_percentage += 20 + Math.floor(Math.random() * 15);
      if (task.status_percentage >= 100) {
        task.status_percentage = 100;
        task.status = 2;
      }
    }
    const stateMap = { 1: 'generating', 2: 'success', 3: 'fail' };
    const resultObj = task.status === 2 ? { resultUrls: [task.result_url] } : {};
    return res.json({
      code: 200, msg: 'success',
      data: { taskId: task.uuid, state: stateMap[task.status], resultJson: JSON.stringify(resultObj), result: resultObj }
    });
  }

  try {
    const response = await axios.get(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
      headers: { 'Authorization': `Bearer ${process.env.KIE_API_KEY}` },
      timeout: 15000
    });
    const data = response.data;
    const taskData = data.data || data;

    if (taskData && taskData.state === 'success') {
      const getResultUrl = (td) => {
        if (td.resultUrls?.length > 0) return td.resultUrls[0];
        if (td.result?.resultUrls?.length > 0) return td.result.resultUrls[0];
        if (td.resultJson) {
          try {
            const parsed = typeof td.resultJson === 'string' ? JSON.parse(td.resultJson) : td.resultJson;
            if (parsed?.resultUrls?.length > 0) return parsed.resultUrls[0];
          } catch { }
        }
        return null;
      };

      const resultUrl = getResultUrl(taskData);
      if (resultUrl && !resultUrl.includes('supabase.co')) {
        const supabaseUrl = await uploadRemoteUrlToSupabase(resultUrl, 'image');
        if (taskData.resultUrls) taskData.resultUrls[0] = supabaseUrl;
        if (taskData.result?.resultUrls) taskData.result.resultUrls[0] = supabaseUrl;
      }
    }

    res.json(data);
  } catch (error) {
    console.error(`Image status error for ${taskId}:`, error.message);
    res.status(500).json({ error: 'Erro ao verificar status da imagem' });
  }
});

/* ==========================================================================
   HEALTH CHECK
   ========================================================================== */

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    supabase: !useSupabaseMock ? 'connected' : 'mock',
    apis: {
      geminigen: !!process.env.GEMINIGEN_API_KEY,
      kie: !!process.env.KIE_API_KEY
    }
  });
});

/* ==========================================================================
   START SERVER
   ========================================================================== */

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`  🚀 MAX AI SaaS Server on http://localhost:${PORT}`);
  console.log(`  Mode: ${useSupabaseMock ? '⚠️  MOCK (configure .env)' : '✅ LIVE (Supabase connected)'}`);
  console.log(`  GeminiGen API: ${process.env.GEMINIGEN_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`  KIE AI API: ${process.env.KIE_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`===================================================`);
});

// ============================================================
// lib/kling-config.js
// Configuração centralizada para Kling 3.0 Motion Control
// ============================================================

// ⚠️ IMPORTANTE: A API Key deve SOMENTE ficar em variáveis de ambiente do servidor.
// Nunca inclua a chave diretamente neste arquivo em produção.
// Configure no seu ambiente:
//   .env.local (desenvolvimento): KLING_API_KEY=sua_chave_aqui
//   Vercel Dashboard > Settings > Environment Variables (produção)

export const KLING_CONFIG = {
  // Endpoint base da API do Kling (Singapore)
  API_BASE_URL: process.env.KLING_MOTION_API_BASE_URL || 'https://api-singapore.klingai.com',

  // Endpoints
  ENDPOINTS: {
    CREATE_TASK: '/motion-control/kling-3.0',
    QUERY_TASK: '/tasks',
  },

  // Preços em créditos MAX AI por segundo de vídeo gerado
  CREDITS_PER_SECOND: {
    standard: parseInt(process.env.KLING_MOTION_STANDARD_CREDITS_PER_SECOND || '120', 10),
    professional: parseInt(process.env.KLING_MOTION_PRO_CREDITS_PER_SECOND || '160', 10),
  },

  // Limites de duração por orientação (em segundos)
  DURATION_LIMITS: {
    image: { min: 3, max: 10 },
    video: { min: 3, max: 30 },
  },

  // Limites de arquivo
  FILE_LIMITS: {
    image: {
      maxBytes: 50 * 1024 * 1024, // 50 MB
      minDimension: 300,
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
      allowedExtensions: ['jpg', 'jpeg', 'png'],
    },
    video: {
      maxBytes: 100 * 1024 * 1024, // 100 MB
      minDimension: 340,
      maxDimension: 3850,
      allowedTypes: ['video/mp4', 'video/quicktime'],
      allowedExtensions: ['mp4', 'mov'],
    },
  },

  // Resoluções suportadas
  RESOLUTIONS: ['720p', '1080p'],

  // Modos de qualidade
  MODES: ['standard', 'professional'],

  // Orientações
  ORIENTATIONS: ['image', 'video'],

  // Watermark (sempre false no primeiro lançamento)
  WATERMARK_ENABLED: false,

  // Timeout para requests à API Kling (em ms)
  REQUEST_TIMEOUT_MS: 55000,

  // Configurações de retry
  RETRY: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    // Códigos HTTP que devem ser retentados
    retryableStatusCodes: [429, 500, 502, 503],
  },
}

/**
 * Calcula o custo em créditos MAX AI para uma geração Kling Motion Control
 * @param {string} mode - 'standard' | 'professional'
 * @param {number} durationSeconds - duração em segundos
 * @returns {number} custo em créditos
 */
export function calculateKlingCredits(mode, durationSeconds) {
  const rate = KLING_CONFIG.CREDITS_PER_SECOND[mode] || KLING_CONFIG.CREDITS_PER_SECOND.standard
  return Math.ceil(durationSeconds * rate)
}

/**
 * Retorna a chave da API Kling (somente server-side)
 * @returns {string|null}
 */
export function getKlingApiKey() {
  return process.env.KLING_API_KEY || null
}

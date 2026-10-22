/**
 * Configurações, precificação e utilitários para a ferramenta Grok 1.5 Lite Video
 * Baseado na documentação oficial da API Snapgen.
 */

// ─── Tabela de créditos oficial MAX AI ───────────────────────────────────────
// Resolução x Duração -> Créditos
export const GROK_LITE_PRICING = {
  '480p': {
    6: 29,
    10: 49,
    15: 68,
  },
  '720p': {
    6: 39,
    10: 68,
    15: 97,
  },
  '1080p': {
    6: 117,
    10: 194,
    15: 291,
  },
}

/**
 * Calcula os créditos exatos para uma geração ou extensão do Grok 1.5 Lite
 * @param {string} resolution - '480p' | '720p' | '1080p'
 * @param {number|string} duration - 6 | 10 | 15
 * @returns {number} Créditos necessários
 */
export function calculateGrokLiteCredits(resolution = '480p', duration = 6) {
  const res = String(resolution || '480p').toLowerCase()
  const dur = parseInt(duration, 10) || 6

  const resTable = GROK_LITE_PRICING[res] || GROK_LITE_PRICING['480p']
  return resTable[dur] || resTable[6] || 29
}

// ─── Opções oficiais suportadas pela API Snapgen ──────────────────────────────
export const GROK_LITE_CONFIG = {
  RESOLUTIONS: ['480p', '720p', '1080p'],
  DEFAULT_RESOLUTION: '480p',

  DURATIONS: [6, 10, 15],
  DEFAULT_DURATION: 6,

  ASPECT_RATIOS: [
    { value: 'landscape', label: 'Landscape (16:9)', ratio: '16:9' },
    { value: 'portrait', label: 'Portrait (9:16)', ratio: '9:16' },
    { value: 'square', label: 'Square (1:1)', ratio: '1:1' },
    { value: '3:2', label: '3:2', ratio: '3:2' },
    { value: '2:3', label: '2:3', ratio: '2:3' },
  ],
  DEFAULT_ASPECT_RATIO: 'landscape',

  MODES: [
    { value: 'custom', label: 'Custom', desc: 'Controle padrão e equilibrado' },
    { value: 'normal', label: 'Normal', desc: 'Comportamento natural e suave' },
    { value: 'extremely-crazy', label: 'Extremely Crazy', desc: 'Ação rápida e dinâmica' },
    { value: 'extremely-spicy-or-crazy', label: 'Extremely Spicy/Crazy', desc: 'Máxima criatividade e impacto' },
  ],
  DEFAULT_MODE: 'custom',

  ENDPOINTS: {
    GENERATE: 'https://api.snapgen.ai/uapi/v1/video-gen/grok-1.5-lite',
    EXTEND: 'https://api.snapgen.ai/uapi/v1/video-extend/grok-1.5-lite',
    HISTORY: 'https://api.snapgen.ai/uapi/v1/history',
  },
}

// ─── Mapeamento de Códigos de Erro da Snapgen para Mensagens Amigáveis ────────
export const GROK_LITE_ERROR_CODES = {
  EMPTY_PROMPT: 'O prompt de descrição do vídeo é obrigatório.',
  INVALID_VIDEO_LENGTH: 'Duração do vídeo inválida. Escolha entre 6, 10 ou 15 segundos.',
  INVALID_ASPECT_RATIO: 'Proporção de tela inválida. Escolha landscape, portrait, square, 3:2 ou 2:3.',
  UNSUPPORTED_IMAGE_FORMAT: 'Formato de imagem não suportado. Utilize arquivos JPG, PNG ou WEBP.',
  TOO_MANY_REFERENCE_FILES: 'Apenas uma imagem de referência é permitida por geração.',
  DOWNLOAD_FAILED: 'Não foi possível baixar a imagem de referência fornecida.',
  INVALID_HISTORY_TYPE: 'O histórico selecionado não é válido para extensão de vídeo.',
  NO_GENERATED_VIDEO: 'Nenhum vídeo concluído foi encontrado para este registro.',
  NO_LAST_FRAME: 'Não foi possível extrair o último quadro do vídeo para extensão.',
  NOT_ENOUGH_CREDIT: 'Créditos insuficientes no provedor de IA. Tente novamente mais tarde.',
  NOT_ENOUGH_AND_LOCK_CREDIT: 'Saldo insuficiente para bloquear créditos.',
  PREMIUM_PLAN_REQUIRED: 'Esta funcionalidade requer um plano superior. Verifique os planos disponíveis.',
  REF_IMAGE_FORBIDDEN: 'A imagem de referência foi bloqueada pelas políticas de moderação ou segurança.',
  REF_IMAGE_NOT_FOUND: 'A imagem de referência não foi encontrada.',
  HISTORY_NOT_FOUND: 'Vídeo anterior não encontrado para realizar a extensão.',
  INVALID_RESOLUTION: 'Resolução inválida. Escolha entre 480p, 720p ou 1080p.',
  MODEL_UNAVAILABLE: 'O modelo Grok 1.5 Lite está temporariamente indisponível. Tente novamente em instantes.',
}

/**
 * Traduz erros brutos da API para mensagens compreensíveis ao usuário
 * Nunca expõe chaves de API, URLs internas ou dados sensíveis.
 */
export function formatGrokErrorMessage(rawError) {
  if (!rawError) return 'Ocorreu um erro inesperado ao processar o vídeo.'

  if (typeof rawError === 'object') {
    rawError = rawError.message || rawError.error || rawError.code || JSON.stringify(rawError)
  }

  const errStr = String(rawError)

  // Ocultar dados sensíveis
  if (errStr.includes('x-api-key') || errStr.includes('GEMINIGEN') || errStr.includes('apiKey') || errStr.includes('Bearer')) {
    return 'Erro de autenticação com o provedor de IA.'
  }

  // Verificar correspondência com códigos documentados
  for (const [code, msg] of Object.entries(GROK_LITE_ERROR_CODES)) {
    if (errStr.includes(code)) {
      return msg
    }
  }

  // Status de moderação
  if (errStr === '-2' || errStr.includes('-2') || errStr.toLowerCase().includes('policy') || errStr.toLowerCase().includes('nsfw')) {
    return 'O prompt ou a imagem violou as diretrizes de moderação e conteúdo.'
  }

  if (errStr.includes('Timeout') || errStr.includes('TIMEOUT')) {
    return 'O servidor de geração demorou para responder. Tente novamente.'
  }

  return errStr
}

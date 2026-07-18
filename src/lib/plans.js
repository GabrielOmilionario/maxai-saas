import { createAdminClient } from '@/lib/supabase/server'
import { PLANS } from './plans-meta'

/**
 * Validates if the user can use the specified tool/model and has not exceeded generation limits.
 * @param {string} userId - The Supabase user ID
 * @param {string} modelName - The model being requested ('grok-3' or 'gpt-image')
 * @returns {Promise<{allowed: boolean, error?: string, profile?: any, outOfCredits?: boolean}>}
 */
export async function validatePlanLimits(userId, modelName) {
  const supabaseAdmin = createAdminClient()
  
  // 1. Fetch user profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
    
  if (profileError || !profile) {
    return { allowed: false, error: 'Perfil do usuário não encontrado' }
  }
  
  const userPlanName = (profile.plan || 'Free').trim()
  const userPlanNameLower = userPlanName.toLowerCase()
  const isAdmin = profile.email === 'gabrieljesus2030@gmail.com'
  
  if (isAdmin) {
    return { allowed: true, profile }
  }

  // 1.5. Validate credit depletion (Block immediately if 100% used)
  const remainingCredits = profile.credit_limit - profile.credit_used
  if (remainingCredits <= 0) {
    return {
      allowed: false,
      error: 'Você consumiu 100% dos seus créditos. Adquira um plano para continuar gerando.',
      outOfCredits: true
    }
  }
  
  // Get plan details
  let planKey = 'FREE'
  if (userPlanNameLower === 'iniciante' || userPlanNameLower === 'starter' || userPlanNameLower === 'super grok solo') planKey = 'INICIANTE'
  else if (userPlanNameLower === 'criador' || userPlanNameLower === 'creator') planKey = 'CRIADOR'
  else if (userPlanNameLower === 'empresas') planKey = 'EMPRESAS'
  else if (userPlanNameLower === 'pro') planKey = 'INICIANTE' // fallback compatibility
  else if (userPlanNameLower === 'premium') planKey = 'CRIADOR' // fallback compatibility
  
  const plan = PLANS[planKey]
  
  // 2. Validate tool permissions (All tools are allowed in all plans)
  const normalizedModel = modelName.toLowerCase()
  const isVideo = normalizedModel.includes('grok') || normalizedModel.includes('veo') || normalizedModel.includes('seedance')
  const isImage = normalizedModel.includes('gpt-image') || normalizedModel.includes('image')
  
  // 3. Validate video generation limits (only for Iniciante plan)
  if (isVideo && planKey === 'INICIANTE') {
    // Count user video generations today and this month
    const startOfToday = new Date()
    startOfToday.setUTCHours(0, 0, 0, 0)
    
    const startOfMonth = new Date()
    startOfMonth.setUTCDate(1)
    startOfMonth.setUTCHours(0, 0, 0, 0)
    
    // Query count of completed or processing videos today
    const { count: dailyCount, error: dailyErr } = await supabaseAdmin
      .from('generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'video')
      .neq('status', 'failed')
      .gte('created_at', startOfToday.toISOString())
      
    if (dailyErr) {
      console.error('[PLAN-VALIDATE] Error counting daily videos:', dailyErr.message)
    } else if (plan.dailyVideoLimit !== null && dailyCount >= plan.dailyVideoLimit) {
      return { 
        allowed: false, 
        error: `Você atingiu o limite diário de ${plan.dailyVideoLimit} vídeos do plano Iniciante.` 
      }
    }
    
    // Query count of completed or processing videos this month
    const { count: monthlyCount, error: monthlyErr } = await supabaseAdmin
      .from('generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'video')
      .neq('status', 'failed')
      .gte('created_at', startOfMonth.toISOString())
      
    if (monthlyErr) {
      console.error('[PLAN-VALIDATE] Error counting monthly videos:', monthlyErr.message)
    } else if (plan.monthlyVideoLimit !== null && monthlyCount >= plan.monthlyVideoLimit) {
      return { 
        allowed: false, 
        error: `Você atingiu o limite mensal de ${plan.monthlyVideoLimit} vídeos do plano Iniciante.` 
      }
    }
  }
  
  return { allowed: true, profile }
}

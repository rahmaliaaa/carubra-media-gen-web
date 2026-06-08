import { insert } from '@/lib/supabase'

function handleLogError(error: any, tableName: string) {
  const message = error?.message || String(error)
  if (message.includes(tableName) || message.includes('schema cache')) {
    console.warn(`Log table missing: ${tableName}.`, message)
    return null
  }
  throw error
}

export async function logUserActivity(
  userId: string | null,
  userEmail: string | null,
  action: string,
  description: string,
  metadata: Record<string, any> | null = null
) {
  try {
    return await insert('user_activity_logs', {
      user_id: userId,
      user_email: userEmail,
      action,
      description,
      metadata,
    })
  } catch (error: any) {
    return handleLogError(error, 'user_activity_logs')
  }
}

export async function logApiError(
  endpoint: string,
  errorMessage: string,
  statusCode: number | null = null,
  userId: string | null = null,
  userEmail: string | null = null,
  metadata: Record<string, any> | null = null
) {
  try {
    return await insert('api_error_logs', {
      endpoint,
      error_message: errorMessage,
      status_code: statusCode,
      user_id: userId,
      user_email: userEmail,
      metadata,
    })
  } catch (error: any) {
    return handleLogError(error, 'api_error_logs')
  }
}

export async function logAiUsage(
  userId: string | null,
  userEmail: string | null,
  apiName: string,
  model: string | null,
  promptTokens: number | null = null,
  completionTokens: number | null = null,
  totalTokens: number | null = null,
  quotaRemaining: number | null = null,
  metadata: Record<string, any> | null = null
) {
  try {
    return await insert('ai_usage_logs', {
      user_id: userId,
      user_email: userEmail,
      api_name: apiName,
      model,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      quota_remaining: quotaRemaining,
      metadata,
    })
  } catch (error: any) {
    return handleLogError(error, 'ai_usage_logs')
  }
}

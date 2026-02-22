import { db } from '@atena/database'
import { securityIncidents } from '@atena/database'
import { logger } from '../lib/logger.js'

type IncidentType =
  | 'injection_attempt'
  | 'prompt_leak'
  | 'off_topic'
  | 'over_promise'
  | 'validation_failed'
  | 'identity_leak'

type Severity = 'low' | 'medium' | 'high' | 'critical'

const SKIP_FLAGS = new Set(['explicit_handoff', 'truncated'])

export function classifySeverity(incidentType: IncidentType): Severity {
  switch (incidentType) {
    case 'injection_attempt':
    case 'prompt_leak':
      return 'high'
    case 'identity_leak':
      return 'high'
    case 'over_promise':
      return 'medium'
    case 'off_topic':
      return 'low'
    case 'validation_failed':
      return 'medium'
    default:
      return 'low'
  }
}

function mapReasonToIncidentType(reason?: string): IncidentType {
  switch (reason) {
    case 'prompt_leak':
      return 'prompt_leak'
    case 'identity_leak':
      return 'identity_leak'
    case 'off_topic':
      return 'off_topic'
    case 'over_promise':
      return 'over_promise'
    default:
      return 'validation_failed'
  }
}

export async function logSanitizationIncident(
  tenantId: string,
  conversationId: string,
  leadId: string,
  message: string,
  flags: string[],
): Promise<void> {
  // Skip if flags only contain non-security flags
  const securityFlags = flags.filter((f) => !SKIP_FLAGS.has(f))
  if (securityFlags.length === 0) return

  try {
    await db.insert(securityIncidents).values({
      tenantId,
      conversationId,
      leadId,
      incidentType: 'injection_attempt',
      severity: classifySeverity('injection_attempt'),
      leadMessage: message,
      detectionLayer: 'sanitization',
      actionTaken: 'blocked',
    })
  } catch (error) {
    logger.error({ error, tenantId, conversationId }, 'Failed to log sanitization incident')
  }
}

export async function logValidationIncident(
  tenantId: string,
  conversationId: string,
  leadId: string,
  message: string,
  aiResponse: string,
  validationResult: { reason?: string; severity?: Severity },
): Promise<void> {
  const incidentType = mapReasonToIncidentType(validationResult.reason)
  const severity = validationResult.severity ?? classifySeverity(incidentType)

  try {
    await db.insert(securityIncidents).values({
      tenantId,
      conversationId,
      leadId,
      incidentType,
      severity,
      leadMessage: message,
      aiResponse,
      detectionLayer: 'validation',
      actionTaken: 'generic_response',
    })
  } catch (error) {
    logger.error({ error, tenantId, conversationId }, 'Failed to log validation incident')
  }
}

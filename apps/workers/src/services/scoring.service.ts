import { db } from '@atena/database'
import { leads, leadEvents } from '@atena/database'
import { eq, and } from 'drizzle-orm'

export type LeadStage = 'new' | 'qualifying' | 'hot' | 'human' | 'converted' | 'lost'

export function evaluateStage(score: number): 'new' | 'qualifying' | 'hot' {
  if (score >= 61) return 'hot'
  if (score >= 21) return 'qualifying'
  return 'new'
}

export function shouldAutoHandoff(
  score: number,
  handoffRules: { score_threshold: number },
): boolean {
  return score >= handoffRules.score_threshold
}

export interface UpdateScoreResult {
  newScore: number
  oldStage: LeadStage
  newStage: LeadStage
  stageChanged: boolean
}

export async function updateScore(
  leadId: string,
  tenantId: string,
  currentScore: number,
  currentStage: LeadStage,
  scoreDelta: number,
  source: string,
): Promise<UpdateScoreResult> {
  // Score can never go below 0
  const newScore = Math.max(0, currentScore + scoreDelta)

  // Determine new stage based on score (only for non-terminal stages)
  const terminalStages: LeadStage[] = ['human', 'converted', 'lost']
  let newStage = currentStage
  if (!terminalStages.includes(currentStage)) {
    newStage = evaluateStage(newScore)
  }

  const stageChanged = newStage !== currentStage

  // Update lead score and stage
  await db
    .update(leads)
    .set({
      score: newScore,
      ...(stageChanged ? { stage: newStage } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))

  // Record score change event
  if (scoreDelta !== 0) {
    await db.insert(leadEvents).values({
      tenantId,
      leadId,
      eventType: 'score_change',
      fromValue: String(currentScore),
      toValue: String(newScore),
      createdBy: source,
    })
  }

  // Record stage change event
  if (stageChanged) {
    await db.insert(leadEvents).values({
      tenantId,
      leadId,
      eventType: 'stage_change',
      fromValue: currentStage,
      toValue: newStage,
      createdBy: source,
    })
  }

  return { newScore, oldStage: currentStage, newStage, stageChanged }
}

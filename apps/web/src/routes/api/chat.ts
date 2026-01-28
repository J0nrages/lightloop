import { streamText, convertToModelMessages, type UIMessage, tool } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/lib/db'
import { requireAuthUser, requireHirePaid, requireOrg } from '@/lib/auth/guards'
import { dbOps, type ConversationScope } from '@/lib/schema'
import { z } from 'zod'
import { createHash } from 'node:crypto'
import '@/lib/otel-langfuse'
import {
  deriveCheckpointTitle,
  deriveCheckpointSummary,
  deriveConversationTitleFromMessage,
} from '@/lib/checkpoints'

function extractTextFromParts(parts: unknown): string {
  if (!Array.isArray(parts)) return ''
  return parts
    .filter((p: any) => p?.type === 'text' && typeof p.text === 'string')
    .map((p: any) => p.text)
    .join('')
}

function stableUserIdHash(input: string): string {
  const salt = process.env.OBSERVABILITY_SALT
  if (!salt) return input
  return createHash('sha256').update(`${salt}:${input}`).digest('hex')
}

const RESUME_WINDOW_MS = 12 * 60 * 60 * 1000

function getEffectiveLastActiveAt(conversation: { last_active_at?: number | null; updated_at: number }) {
  if (conversation.last_active_at && conversation.last_active_at > 0) {
    return conversation.last_active_at
  }
  return conversation.updated_at
}

const showCandidatesParams = z.object({
  limit: z.number().int().min(1).max(50).default(5),
})

const salaryRangeParams = z.object({
  min: z.number().default(80000),
  max: z.number().default(250000),
  currency: z.string().default('USD'),
  current: z.number().optional(),
})

const quizParams = z.object({
  question: z.string(),
  options: z.array(z.string()).min(2),
})

const workspaceParams = z.object({ view: z.enum(['dashboard', 'candidates', 'settings']) })

const confirmActionParams = z.object({
  action: z.string(),
  details: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high']).default('medium'),
})

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authUser = await requireAuthUser(request)
        const now = Date.now()
        const {
          messages,
          conversationId,
          model: modelId,
          scope: requestedScope,
          orgId: requestedOrgId,
          projectId: requestedProjectId,
        }: {
          messages: UIMessage[]
          conversationId?: number
          model?: string
          scope?: ConversationScope
          orgId?: string
          projectId?: number
        } = await request.json()

        // Get or create conversation
        let activeConversationId = conversationId
        let createdConversation = false
        if (!activeConversationId) {
          const scope: ConversationScope = requestedScope ?? 'personal'
          if (!['personal', 'org_personal', 'org_group'].includes(scope)) {
            return Response.json({ error: 'Invalid conversation scope' }, { status: 400 })
          }

          let orgId: number | null = null
          let projectId: number | null = requestedProjectId ?? null

          if (scope !== 'personal') {
            const session = await requireOrg(request)
            if (requestedOrgId && requestedOrgId !== session.orgId) {
              return Response.json({ error: 'Organization mismatch' }, { status: 403 })
            }
            const org = dbOps.getOrgByClerkId(session.orgId!)
            if (!org) {
              return Response.json({ error: 'Organization not found' }, { status: 403 })
            }
            orgId = org.id

            if (projectId !== null) {
              const project = dbOps.getProjectById(projectId)
              if (!project || project.orgId !== org.id) {
                return Response.json({ error: 'Project not found' }, { status: 404 })
              }
              if (!dbOps.isProjectMember(projectId, authUser.id)) {
                return Response.json({ error: 'Forbidden' }, { status: 403 })
              }
            }
          } else {
            if (requestedOrgId || requestedProjectId) {
              return Response.json({ error: 'Personal conversations cannot include org context' }, { status: 400 })
            }
            projectId = null
          }

          type RecentConversation = {
            id: number
            user_id: number
            scope: ConversationScope
            org_id: number | null
            project_id: number | null
            updated_at: number
            last_active_at: number | null
          }

          // TODO: wrap resume-or-create in a transaction to avoid duplicate checkpoints/convos
          // under concurrent requests without a conversationId.
          let recentConversation: RecentConversation | null = null

          if (scope === 'personal') {
            recentConversation = db.prepare(`
              SELECT id, user_id, scope, org_id, project_id, updated_at, last_active_at
              FROM conversations
              WHERE user_id = ? AND scope = 'personal'
              ORDER BY COALESCE(NULLIF(last_active_at, 0), updated_at) DESC
              LIMIT 1
            `).get(authUser.id) as RecentConversation | null
          } else if (scope === 'org_personal') {
            recentConversation = db.prepare(`
              SELECT id, user_id, scope, org_id, project_id, updated_at, last_active_at
              FROM conversations
              WHERE user_id = ? AND scope = 'org_personal' AND org_id = ?
              AND project_id IS ?
              ORDER BY COALESCE(NULLIF(last_active_at, 0), updated_at) DESC
              LIMIT 1
            `).get(authUser.id, orgId, projectId) as RecentConversation | null
          } else {
            recentConversation = db.prepare(`
              SELECT c.id, c.user_id, c.scope, c.org_id, c.project_id, c.updated_at, c.last_active_at
              FROM conversations c
              JOIN conversation_participants p ON p.conversation_id = c.id
              WHERE c.scope = 'org_group' AND c.org_id = ? AND p.user_id = ?
              AND c.project_id IS ?
              ORDER BY COALESCE(NULLIF(c.last_active_at, 0), c.updated_at) DESC
              LIMIT 1
            `).get(orgId, authUser.id, projectId) as RecentConversation | null
          }

          if (recentConversation) {
            const lastActiveAt = getEffectiveLastActiveAt(recentConversation)
            if (now - lastActiveAt <= RESUME_WINDOW_MS) {
              activeConversationId = recentConversation.id
            } else {
              const lastCheckpoint = db.prepare(`
                SELECT created_at FROM conversation_checkpoints
                WHERE conversation_id = ?
                ORDER BY created_at DESC
                LIMIT 1
              `).get(recentConversation.id) as { created_at: number } | null

              if (!lastCheckpoint || lastCheckpoint.created_at < lastActiveAt) {
                const recentMessages = db.prepare(`
                  SELECT id, role, content
                  FROM messages
                  WHERE conversation_id = ?
                  ORDER BY created_at DESC
                  LIMIT 4
                `).all(recentConversation.id) as Array<{ id: number; role: string; content: string }>

                if (recentMessages.length > 0) {
                  const title = deriveCheckpointTitle(recentMessages)
                  const summary = deriveCheckpointSummary(recentMessages)
                  const anchorMessageId = recentMessages[0]?.id ?? null
                  db.prepare(`
                    INSERT INTO conversation_checkpoints (
                      conversation_id,
                      user_id,
                      title,
                      summary,
                      anchor_message_id,
                      checkpoint_type,
                      scope,
                      org_id,
                      project_id,
                      created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  `).run(
                    recentConversation.id,
                    authUser.id,
                    title,
                    summary,
                    anchorMessageId,
                    'session',
                    recentConversation.scope,
                    recentConversation.org_id,
                    recentConversation.project_id,
                    now
                  )
                }
              }
            }
          }

          if (!activeConversationId) {
            const result = db.prepare(`
              INSERT INTO conversations (user_id, title, scope, org_id, project_id, created_at, updated_at, last_active_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(authUser.id, 'New Chat', scope, orgId, projectId, now, now, now)
            activeConversationId = Number(result.lastInsertRowid)
            createdConversation = true

            if (scope === 'org_group') {
              dbOps.addConversationParticipant(activeConversationId, authUser.id)
            }
          }
        } else {
          const existing = db.prepare(`
            SELECT id, user_id, scope, org_id, project_id, updated_at, last_active_at FROM conversations WHERE id = ?
          `).get(activeConversationId) as {
            id: number
            user_id: number
            scope: ConversationScope
            org_id: number | null
            project_id: number | null
            updated_at: number
            last_active_at: number | null
          } | null

          if (!existing) {
            return Response.json({ error: 'Conversation not found' }, { status: 404 })
          }

          if (existing.scope === 'personal') {
            if (existing.user_id !== authUser.id) {
              return Response.json({ error: 'Conversation not found' }, { status: 404 })
            }
          } else if (existing.scope === 'org_personal') {
            const session = await requireOrg(request)
            const org = dbOps.getOrgByClerkId(session.orgId!)
            if (!org || org.id !== existing.org_id) {
              return Response.json({ error: 'Conversation not found' }, { status: 404 })
            }
            if (existing.user_id !== authUser.id) {
              return Response.json({ error: 'Conversation not found' }, { status: 404 })
            }
          } else {
            const session = await requireOrg(request)
            const org = dbOps.getOrgByClerkId(session.orgId!)
            if (!org || org.id !== existing.org_id) {
              return Response.json({ error: 'Conversation not found' }, { status: 404 })
            }
            if (!dbOps.isConversationParticipant(existing.id, authUser.id)) {
              return Response.json({ error: 'Conversation not found' }, { status: 404 })
            }
          }

          if (existing.project_id !== null) {
            const project = dbOps.getProjectById(existing.project_id)
            if (!project || !dbOps.isProjectMember(existing.project_id, authUser.id)) {
              return Response.json({ error: 'Forbidden' }, { status: 403 })
            }
          }
        }

        // Save the user's message (last message in array)
        const lastUserMessage = messages[messages.length - 1]
        if (lastUserMessage && lastUserMessage.role === 'user') {
          const userContent = extractTextFromParts(lastUserMessage.parts)

          db.prepare(`
            INSERT INTO messages (conversation_id, role, content, metadata, created_at)
            VALUES (?, ?, ?, ?, ?)
          `).run(
            activeConversationId,
            'user',
            userContent,
            JSON.stringify({ parts: lastUserMessage.parts }),
            now,
          )

          db.prepare(`
            UPDATE conversations SET last_active_at = ?, updated_at = ? WHERE id = ?
          `).run(now, now, activeConversationId)

          if (createdConversation && userContent.trim()) {
            const title = deriveConversationTitleFromMessage(userContent)
            db.prepare(`
              UPDATE conversations SET title = ? WHERE id = ? AND title = 'New Chat'
            `).run(title, activeConversationId)
          }
        }

        // Configure OpenAI adapter to use OpenRouter with Chat Completions API
        const broadcastUser = stableUserIdHash(authUser.clerkId)
        const openrouter = createOpenAI({
          apiKey: process.env.OPENROUTER_API_KEY,
          baseURL: 'https://openrouter.ai/api/v1',
          headers: {
            'HTTP-Referer': 'https://lightloop.app',
            'X-Title': 'Lightloop',
            // OpenRouter Broadcast: deterministic session grouping
            'x-session-id': String(activeConversationId),
          },
        })

        const selectedModel = modelId || 'anthropic/claude-sonnet-4.5'

        const result = streamText({
          // Use .chat() for Chat Completions API (OpenRouter doesn't support Responses API)
          model: openrouter.chat(selectedModel),
          system:
            'You are Lightloop, an AI-powered hiring assistant. When a user asks for structured UI (candidates, salary range, quizzes, or view switching), call the available tools instead of describing UI. Always keep any tool outputs concise and aligned to the user request.',
          messages: await convertToModelMessages(messages),
          experimental_telemetry: {
            isEnabled: true,
          },
          providerOptions: {
            openai: {
              user: broadcastUser,
              metadata: {
                session_id: String(activeConversationId),
              },
            },
          },
          tools: {
            showCandidates: tool({
              description: 'Display a table of candidate matches',
              inputSchema: showCandidatesParams,
              execute: async (input: z.infer<typeof showCandidatesParams>) => {
        await requireHirePaid(request)
                const { limit } = input
                const candidates = [
                  { id: '1', name: 'Alex Rivera', role: 'Senior Frontend', score: 9.2, status: 'interviewing' as const },
                  { id: '2', name: 'Jordan Smith', role: 'Frontend Engineer', score: 8.5, status: 'new' as const },
                  { id: '3', name: 'Sam Chen', role: 'Senior Frontend', score: 9.8, status: 'offered' as const },
                  { id: '4', name: 'Taylor Wong', role: 'Full Stack Engineer', score: 7.9, status: 'new' as const },
                  { id: '5', name: 'Casey Jones', role: 'Senior Frontend', score: 8.8, status: 'rejected' as const },
                ].slice(0, limit)
                return { candidates }
              },
            }),
            salaryRange: tool({
              description: 'Show and adjust target salary range',
              inputSchema: salaryRangeParams,
              execute: async (input: z.infer<typeof salaryRangeParams>) => input,
            }),
            quiz: tool({
              description: 'Render a short multiple-choice question',
              inputSchema: quizParams,
              execute: async (input: z.infer<typeof quizParams>) => input,
            }),
            setWorkspace: tool({
              description: 'Switch workspace view (dashboard, candidates, settings)',
              inputSchema: workspaceParams,
              execute: async (input: z.infer<typeof workspaceParams>) => ({ view: input.view }),
            }),
            confirmAction: tool({
              description: 'Request user approval for an action before proceeding',
              inputSchema: confirmActionParams,
              execute: async (input: z.infer<typeof confirmActionParams>) => input,
            }),
          },
        })

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ responseMessage }) => {
            const assistantText = extractTextFromParts(responseMessage.parts)

            db.prepare(`
              INSERT INTO messages (conversation_id, role, content, metadata, created_at)
              VALUES (?, ?, ?, ?, ?)
            `).run(
              activeConversationId,
              'assistant',
              assistantText,
              JSON.stringify({ parts: responseMessage.parts }),
              Date.now(),
            )

            db.prepare(`
              UPDATE conversations SET updated_at = ?, last_active_at = ? WHERE id = ?
            `).run(Date.now(), Date.now(), activeConversationId)
          },
          headers: {
            'X-Conversation-Id': String(activeConversationId),
          },
        })
      },
    },
  },
})

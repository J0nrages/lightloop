import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/lib/db'
import { requireAuthUser, requireOrg } from '@/lib/auth/guards'
import { dbOps } from '@/lib/schema'
import { deriveCheckpointSummary, deriveCheckpointTitle } from '@/lib/checkpoints'

interface DbCheckpointRow {
  id: number
  conversation_id: number
  user_id: number
  title: string
  summary: string | null
  anchor_message_id: number | null
  checkpoint_type: string
  scope: string
  org_id: number | null
  project_id: number | null
  created_at: number
}

export const Route = createFileRoute('/api/checkpoints')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authUser = await requireAuthUser(request)
        const body = (await request.json()) as {
          conversationId?: number
          checkpointType?: string
        }

        const conversationId = Number(body.conversationId)
        if (!conversationId || Number.isNaN(conversationId)) {
          return Response.json({ error: 'Invalid conversation ID' }, { status: 400 })
        }

        const conversation = db.prepare(`
          SELECT id, user_id, scope, org_id, project_id FROM conversations WHERE id = ?
        `).get(conversationId) as {
          id: number
          user_id: number
          scope: string
          org_id: number | null
          project_id: number | null
        } | null

        if (!conversation) {
          return Response.json({ error: 'Conversation not found' }, { status: 404 })
        }

        if (conversation.scope === 'personal') {
          if (conversation.user_id !== authUser.id) {
            return Response.json({ error: 'Conversation not found' }, { status: 404 })
          }
        } else if (conversation.scope === 'org_personal') {
          const session = await requireOrg(request)
          const org = dbOps.getOrgByClerkId(session.orgId!)
          if (!org || org.id !== conversation.org_id) {
            return Response.json({ error: 'Conversation not found' }, { status: 404 })
          }
          if (conversation.user_id !== authUser.id) {
            return Response.json({ error: 'Conversation not found' }, { status: 404 })
          }
        } else {
          const session = await requireOrg(request)
          const org = dbOps.getOrgByClerkId(session.orgId!)
          if (!org || org.id !== conversation.org_id) {
            return Response.json({ error: 'Conversation not found' }, { status: 404 })
          }
          if (!dbOps.isConversationParticipant(conversation.id, authUser.id)) {
            return Response.json({ error: 'Conversation not found' }, { status: 404 })
          }
        }

        if (conversation.project_id !== null) {
          const project = dbOps.getProjectById(conversation.project_id)
          if (!project || !dbOps.isProjectMember(conversation.project_id, authUser.id)) {
            return Response.json({ error: 'Forbidden' }, { status: 403 })
          }
        }

        const recentMessages = db.prepare(`
          SELECT id, role, content
          FROM messages
          WHERE conversation_id = ?
          ORDER BY created_at DESC
          LIMIT 4
        `).all(conversation.id) as Array<{ id: number; role: string; content: string }>

        if (recentMessages.length === 0) {
          return Response.json({ created: false })
        }

        const title = deriveCheckpointTitle(recentMessages)
        const summary = deriveCheckpointSummary(recentMessages)
        const anchorMessageId = recentMessages[0]?.id ?? null
        const checkpointType = body.checkpointType ?? 'manual'

        const result = db.prepare(`
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
          conversation.id,
          authUser.id,
          title,
          summary,
          anchorMessageId,
          checkpointType,
          conversation.scope,
          conversation.org_id,
          conversation.project_id,
          Date.now()
        )

        return Response.json({ created: true, checkpointId: Number(result.lastInsertRowid) })
      },
      GET: async ({ request }) => {
        const authUser = await requireAuthUser(request)

        const rows = db.prepare(`
          SELECT cp.*
          FROM conversation_checkpoints cp
          JOIN conversations c ON c.id = cp.conversation_id
          WHERE (c.scope IN ('personal', 'org_personal') AND c.user_id = ?)
             OR (c.scope = 'org_group' AND EXISTS (
               SELECT 1 FROM conversation_participants p
               WHERE p.conversation_id = c.id AND p.user_id = ?
             ))
          ORDER BY cp.created_at DESC
          LIMIT 50
        `).all(authUser.id, authUser.id) as DbCheckpointRow[]

        const checkpoints = rows.filter((row) => {
          if (row.project_id === null) return true
          return dbOps.isProjectMember(row.project_id, authUser.id)
        })

        return Response.json({
          checkpoints: checkpoints.map((row) => ({
            id: row.id,
            conversationId: row.conversation_id,
            title: row.title,
            summary: row.summary,
            anchorMessageId: row.anchor_message_id,
            checkpointType: row.checkpoint_type,
            scope: row.scope,
            orgId: row.org_id,
            projectId: row.project_id,
            createdAt: row.created_at,
          })),
        })
      },
    },
  },
})

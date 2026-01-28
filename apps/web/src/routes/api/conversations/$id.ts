import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/lib/db'
import { requireAuthUser, requireOrg } from '@/lib/auth/guards'
import { dbOps, type ConversationScope } from '@/lib/schema'

interface DbMessage {
  id: number
  conversation_id: number
  role: string
  content: string
  metadata: string | null
  created_at: number
}

export const Route = createFileRoute('/api/conversations/$id')({
  server: {
    handlers: {
      // GET /api/conversations/:id - get conversation with messages
      GET: async ({ params, request }) => {
        const authUser = await requireAuthUser(request)
        const conversationId = parseInt(params.id, 10)

        if (isNaN(conversationId)) {
          return Response.json({ error: 'Invalid conversation ID' }, { status: 400 })
        }

        const conversation = db.prepare(`
          SELECT id, user_id, scope, org_id, project_id FROM conversations WHERE id = ?
        `).get(conversationId) as {
          id: number
          user_id: number
          scope: ConversationScope
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
          if (!dbOps.isProjectMember(conversation.project_id, authUser.id)) {
            return Response.json({ error: 'Forbidden' }, { status: 403 })
          }
        }

        const messages = db.prepare(`
          SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC
        `).all(conversationId) as DbMessage[]

        // Convert to UI message format
        const uiMessages = messages.map((msg) => ({
          id: String(msg.id),
          role: msg.role as 'user' | 'assistant',
          parts: [{ type: 'text' as const, text: msg.content }],
        }))

        return Response.json({ messages: uiMessages, conversationId })
      },
    },
  },
})

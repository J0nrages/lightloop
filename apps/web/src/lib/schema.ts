import { db } from './db';
import type { 
  User, Conversation, Message, ConversationScope, Agent, Org, 
  OrgMember, OrgLicenseRow, UserLicenseRow, Project, ProjectMember, 
  ConversationParticipant, ConversationCheckpoint, ConversationCheckpointType
} from '@lightloop/core';

export type { 
  User, Conversation, Message, ConversationScope, Agent, Org, 
  OrgMember, OrgLicenseRow, UserLicenseRow, Project, ProjectMember, 
  ConversationParticipant, ConversationCheckpoint, ConversationCheckpointType
};

// Database initialization and helpers
export const createTables = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clerk_id TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      scope TEXT NOT NULL,
      org_id INTEGER,
      project_id INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_active_at INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      tools TEXT,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orgs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clerk_org_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS org_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE (org_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS org_licenses (
      org_id INTEGER NOT NULL,
      license TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE (org_id, license)
    );

    CREATE TABLE IF NOT EXISTS user_licenses (
      user_id INTEGER NOT NULL,
      license TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE (user_id, license)
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE (project_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS conversation_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE (conversation_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS conversation_checkpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      anchor_message_id INTEGER,
      checkpoint_type TEXT NOT NULL,
      scope TEXT NOT NULL,
      org_id INTEGER,
      project_id INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_last_active
      ON conversations (user_id, scope, org_id, project_id, last_active_at);

    CREATE INDEX IF NOT EXISTS idx_conversation_checkpoints_recent
      ON conversation_checkpoints (conversation_id, created_at);
  `);
};

// Database operations
export const dbOps = {
  // Users
  createUser: (user: Omit<User, 'id' | 'createdAt'>) => {
    const stmt = db.prepare(`
      INSERT INTO users (clerk_id, email, created_at) 
      VALUES (?, ?, ?)
    `);
    return stmt.run(user.clerkId, user.email, Date.now());
  },
  
  getUserByClerkId: (clerkId: string): User | null => {
    const stmt = db.prepare('SELECT * FROM users WHERE clerk_id = ?');
    return stmt.get(clerkId) as User | null;
  },

  // Conversations
  createConversation: (
    conversation: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt' | 'scope' | 'orgId' | 'projectId' | 'lastActiveAt'> & {
      scope?: ConversationScope;
      orgId?: number | null;
      projectId?: number | null;
    }
  ) => {
    const now = Date.now();
    const scope = conversation.scope ?? 'personal';
    const stmt = db.prepare(`
      INSERT INTO conversations (user_id, title, scope, org_id, project_id, created_at, updated_at, last_active_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      conversation.userId,
      conversation.title,
      scope,
      conversation.orgId ?? null,
      conversation.projectId ?? null,
      now,
      now,
      now
    );
  },

  updateConversationActivity: (conversationId: number) => {
    const stmt = db.prepare(`
      UPDATE conversations SET updated_at = ?, last_active_at = ? WHERE id = ?
    `);
    const now = Date.now();
    return stmt.run(now, now, conversationId);
  },

  getUserConversations: (userId: number): Conversation[] => {
    const stmt = db.prepare(`
      SELECT c.* FROM conversations c
      WHERE c.user_id = ? AND c.scope IN ('personal', 'org_personal')
      UNION
      SELECT c.* FROM conversations c
      JOIN conversation_participants p ON p.conversation_id = c.id
      WHERE c.scope = 'org_group' AND p.user_id = ?
      ORDER BY updated_at DESC
    `);
    return stmt.all(userId, userId) as Conversation[];
  },

  // Messages
  createMessage: (message: Omit<Message, 'id' | 'createdAt'>) => {
    const stmt = db.prepare(`
      INSERT INTO messages (conversation_id, role, content, metadata, created_at) 
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(message.conversationId, message.role, message.content, message.metadata || null, Date.now());
  },

  getConversationMessages: (conversationId: number): Message[] => {
    const stmt = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC');
    return stmt.all(conversationId) as Message[];
  },

  // Checkpoints
  createCheckpoint: (
    checkpoint: Omit<ConversationCheckpoint, 'id' | 'createdAt'> & {
      summary?: string | null;
      anchorMessageId?: number | null;
      orgId?: number | null;
      projectId?: number | null;
    }
  ) => {
    const now = Date.now();
    const stmt = db.prepare(`
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
    `);
    return stmt.run(
      checkpoint.conversationId,
      checkpoint.userId,
      checkpoint.title,
      checkpoint.summary ?? null,
      checkpoint.anchorMessageId ?? null,
      checkpoint.checkpointType,
      checkpoint.scope,
      checkpoint.orgId ?? null,
      checkpoint.projectId ?? null,
      now
    );
  },

  // Agents
  getAllAgents: (): Agent[] => {
    return db.query('SELECT * FROM agents WHERE is_active = 1').all() as Agent[];
  },

  // Orgs
  createOrg: (org: Omit<Org, 'id' | 'createdAt'>) => {
    const stmt = db.prepare(`
      INSERT INTO orgs (clerk_org_id, name, created_at)
      VALUES (?, ?, ?)
    `);
    return stmt.run(org.clerkOrgId, org.name, Date.now());
  },

  getOrgByClerkId: (clerkOrgId: string): Org | null => {
    const stmt = db.prepare('SELECT * FROM orgs WHERE clerk_org_id = ?');
    return stmt.get(clerkOrgId) as Org | null;
  },

  upsertOrgMember: (orgId: number, userId: number, role: string) => {
    const stmt = db.prepare(`
      INSERT INTO org_members (org_id, user_id, role, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (org_id, user_id) DO UPDATE SET role = excluded.role
    `);
    return stmt.run(orgId, userId, role, Date.now());
  },

  // Licenses
  grantOrgLicense: (orgId: number, license: string) => {
    const stmt = db.prepare(`
      INSERT INTO org_licenses (org_id, license, created_at)
      VALUES (?, ?, ?)
      ON CONFLICT (org_id, license) DO NOTHING
    `);
    return stmt.run(orgId, license, Date.now());
  },

  revokeOrgLicense: (orgId: number, license: string) => {
    const stmt = db.prepare('DELETE FROM org_licenses WHERE org_id = ? AND license = ?');
    return stmt.run(orgId, license);
  },

  getOrgLicenses: (clerkOrgId: string): string[] => {
    const org = dbOps.getOrgByClerkId(clerkOrgId);
    if (!org) return [];
    const stmt = db.prepare('SELECT license FROM org_licenses WHERE org_id = ?');
    return (stmt.all(org.id) as { license: string }[]).map((row) => row.license);
  },

  grantUserLicense: (clerkUserId: string, license: string) => {
    const user = dbOps.getUserByClerkId(clerkUserId);
    if (!user) {
      throw new Error('User not found');
    }
    const stmt = db.prepare(`
      INSERT INTO user_licenses (user_id, license, created_at)
      VALUES (?, ?, ?)
      ON CONFLICT (user_id, license) DO NOTHING
    `);
    return stmt.run(user.id, license, Date.now());
  },

  revokeUserLicense: (clerkUserId: string, license: string) => {
    const user = dbOps.getUserByClerkId(clerkUserId);
    if (!user) {
      throw new Error('User not found');
    }
    const stmt = db.prepare('DELETE FROM user_licenses WHERE user_id = ? AND license = ?');
    return stmt.run(user.id, license);
  },

  getUserLicenses: (clerkUserId: string): string[] => {
    const user = dbOps.getUserByClerkId(clerkUserId);
    if (!user) return [];
    const stmt = db.prepare('SELECT license FROM user_licenses WHERE user_id = ?');
    return (stmt.all(user.id) as { license: string }[]).map((row) => row.license);
  },

  // Projects
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO projects (org_id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(project.orgId, project.name, now, now);
  },

  upsertProjectMember: (projectId: number, userId: number, role: string) => {
    const stmt = db.prepare(`
      INSERT INTO project_members (project_id, user_id, role, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (project_id, user_id) DO UPDATE SET role = excluded.role
    `);
    return stmt.run(projectId, userId, role, Date.now());
  },

  getProjectById: (projectId: number): Project | null => {
    const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
    return stmt.get(projectId) as Project | null;
  },

  isProjectMember: (projectId: number, userId: number) => {
    const stmt = db.prepare(`
      SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?
    `);
    return Boolean(stmt.get(projectId, userId));
  },

  addConversationParticipant: (conversationId: number, userId: number) => {
    const stmt = db.prepare(`
      INSERT INTO conversation_participants (conversation_id, user_id, created_at)
      VALUES (?, ?, ?)
      ON CONFLICT (conversation_id, user_id) DO NOTHING
    `);
    return stmt.run(conversationId, userId, Date.now());
  },

  isConversationParticipant: (conversationId: number, userId: number) => {
    const stmt = db.prepare(`
      SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?
    `);
    return Boolean(stmt.get(conversationId, userId));
  },
};

// Initialize tables on import
createTables();

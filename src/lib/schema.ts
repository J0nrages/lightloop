import { db } from './db';

// Database Types
export interface User {
  id: number;
  clerkId: string;
  email: string;
  createdAt: number;
}

export interface Conversation {
  id: number;
  userId: number;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: string; // JSON for tool calls, UI components, etc.
  createdAt: number;
}

export interface Agent {
  id: number;
  name: string;
  description: string;
  systemPrompt: string;
  tools?: string; // JSON array of available tools
  isActive: boolean;
  createdAt: number;
}

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
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
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
  createConversation: (conversation: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO conversations (user_id, title, created_at, updated_at) 
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(conversation.userId, conversation.title, now, now);
  },

  getUserConversations: (userId: number): Conversation[] => {
    const stmt = db.prepare('SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC');
    return stmt.all(userId) as Conversation[];
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

  // Agents
  getAllAgents: (): Agent[] => {
    return db.query('SELECT * FROM agents WHERE is_active = 1').all() as Agent[];
  }
};

// Initialize tables on import
createTables();
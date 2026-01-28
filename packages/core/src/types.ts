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
  scope: ConversationScope;
  orgId?: number | null;
  projectId?: number | null;
  createdAt: number;
  updatedAt: number;
  lastActiveAt: number;
}

export interface Message {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: string; // JSON for tool calls, UI components, etc.
  createdAt: number;
}

export type ConversationScope = 'personal' | 'org_personal' | 'org_group';

export interface Agent {
  id: number;
  name: string;
  description: string;
  systemPrompt: string;
  tools?: string; // JSON array of available tools
  isActive: boolean;
  createdAt: number;
}

export interface Org {
  id: number;
  clerkOrgId: string;
  name: string;
  createdAt: number;
}

export interface OrgMember {
  id: number;
  orgId: number;
  userId: number;
  role: string;
  createdAt: number;
}

export interface OrgLicenseRow {
  orgId: number;
  license: string;
  createdAt: number;
  updatedAt?: number;
}

export interface UserLicenseRow {
  userId: number;
  license: string;
  createdAt: number;
  updatedAt?: number;
}

export interface Project {
  id: number;
  orgId: number;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  role: string;
  createdAt: number;
}

export interface ConversationParticipant {
  id: number;
  conversationId: number;
  userId: number;
  createdAt: number;
}

export type ConversationCheckpointType = 'session' | 'task' | 'manual';

export interface ConversationCheckpoint {
  id: number;
  conversationId: number;
  userId: number;
  title: string;
  summary?: string | null;
  anchorMessageId?: number | null;
  checkpointType: ConversationCheckpointType;
  scope: ConversationScope;
  orgId?: number | null;
  projectId?: number | null;
  createdAt: number;
}

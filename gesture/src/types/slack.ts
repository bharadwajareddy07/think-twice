export interface SlackUser {
  id: string;
  name: string;
  realName: string;
  displayName: string;
  avatarUrl: string;
  isBot: boolean;
  title?: string;
  timezone?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate?: boolean;
  topic?: string;
  purpose?: string;
  numMembers?: number;
}

export interface SlackReaction {
  name: string;
  count: number;
  users: string[];
}

export interface SlackMessage {
  id: string;
  channelId: string;
  channelName?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  timestamp: string;
  formattedDate: string;
  threadTs?: string;
  replyCount?: number;
  permalink?: string;
  reactions?: SlackReaction[];
  isBot?: boolean;
}

export interface McpToolSchema {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

export interface McpStatus {
  connected: boolean;
  transport: 'stdio' | 'sse' | 'http';
  serverName: string;
  serverVersion: string;
  tools: McpToolSchema[];
  resources: any[];
  prompts: any[];
  error?: string;
  lastPing?: string;
}

export interface QueryProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  detail?: string;
}

export interface GroundedAnswerSource {
  messageId: string;
  channelId: string;
  channelName: string;
  userName: string;
  timestamp: string;
  formattedDate: string;
  snippet: string;
  permalink?: string;
}

export interface AssistantAnswer {
  summary: string;
  keyPoints: string[];
  importantDiscussions: string[];
  peopleInvolved: string[];
  unresolvedIssues: string[];
  nextSteps: string[];
  sources: GroundedAnswerSource[];
  rawMessagesCount: number;
  channelsQueried: string[];
}

export interface AssistantQueryResult {
  prompt: string;
  answer: AssistantAnswer;
  steps: QueryProgressStep[];
  executedTools: Array<{ name: string; args: any; response: any }>;
  rawMessages: SlackMessage[];
  timestamp: string;
}

export interface ChatHistoryItem {
  id: string;
  title: string;
  prompt: string;
  result: AssistantQueryResult;
  createdAt: string;
}

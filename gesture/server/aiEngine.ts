import { mcpClient } from './mcpClient';
import { slackNormalizer } from './slackNormalizer';
import {
  SlackMessage,
  AssistantQueryResult,
  AssistantAnswer,
  QueryProgressStep,
  GroundedAnswerSource,
} from '../src/types/slack';

export class AiEngine {
  public async processQuery(prompt: string, selectedChannelId?: string): Promise<AssistantQueryResult> {
    const steps: QueryProgressStep[] = [
      { id: '1', label: 'Understanding prompt & intent', status: 'active' },
      { id: '2', label: 'Connecting to Slack MCP server', status: 'pending' },
      { id: '3', label: 'Searching Slack channel history', status: 'pending' },
      { id: '4', label: 'Reading & expanding message threads', status: 'pending' },
      { id: '5', label: 'Generating grounded AI summary', status: 'pending' },
    ];

    const executedTools: Array<{ name: string; args: any; response: any }> = [];
    const allRawMessages: SlackMessage[] = [];
    const channelsQueried: string[] = [];

    // Step 1: Parse Intent & Target Channels
    const defaultChannelsEnv = process.env.SLACK_DEFAULT_CHANNELS || 'C0BRC2NRJ5T,C0BRKGA8HK6';
    let targetChannels = selectedChannelId
      ? [selectedChannelId]
      : defaultChannelsEnv.split(',').map((c) => c.trim()).filter(Boolean);

    steps[0].status = 'completed';
    steps[0].detail = `Targeting ${targetChannels.length} channel(s)`;
    steps[1].status = 'active';

    // Step 2: Ensure MCP Connected & Fetch Users
    try {
      const status = mcpClient.getStatus();
      if (!status.connected) {
        await mcpClient.connect();
      }

      // Fetch users list first for name resolution
      const usersRaw = await mcpClient.callTool('slack_get_users', { limit: 100 });
      executedTools.push({ name: 'slack_get_users', args: { limit: 100 }, response: usersRaw });
      const { users } = slackNormalizer.parseUsersResult(usersRaw);
      slackNormalizer.registerUsers(users);

      steps[1].status = 'completed';
      steps[1].detail = `Connected to Slack MCP (${users.length} users mapped)`;
      steps[2].status = 'active';
    } catch (err: any) {
      steps[1].status = 'error';
      steps[1].detail = err.message || 'MCP Connection Failed';
      return this.buildErrorResponse(prompt, steps, executedTools, err.message);
    }

    // Step 3: Retrieve Channel History for Target Channels
    let channelErrorMsg = '';

    const channelErrors: string[] = [];

    for (const channelId of targetChannels) {
      channelsQueried.push(channelId);
      try {
        const histRaw = await mcpClient.callTool('slack_get_channel_history', { channel_id: channelId, limit: 30 });
        executedTools.push({ name: 'slack_get_channel_history', args: { channel_id: channelId, limit: 30 }, response: histRaw });

        const { messages, error } = slackNormalizer.parseMessagesResult(histRaw, channelId);
        if (error) {
          channelErrors.push(error);
        } else {
          allRawMessages.push(...messages);
        }
      } catch (err: any) {
        channelErrors.push(err.message);
      }
    }

    steps[2].status = 'completed';
    steps[2].detail = `Retrieved ${allRawMessages.length} message(s) from ${channelsQueried.length} channel(s)`;
    steps[3].status = 'active';

    // Step 4: Expand Message Threads (if reply_count > 0 or thread_ts)
    const threadParents = allRawMessages.filter((m) => m.replyCount && m.replyCount > 0 && m.timestamp);
    let expandedThreadCount = 0;

    for (const parent of threadParents) {
      try {
        const threadRaw = await mcpClient.callTool('slack_get_thread_replies', {
          channel_id: parent.channelId,
          thread_ts: parent.timestamp,
        });
        executedTools.push({
          name: 'slack_get_thread_replies',
          args: { channel_id: parent.channelId, thread_ts: parent.timestamp },
          response: threadRaw,
        });

        const { messages: replies } = slackNormalizer.parseMessagesResult(threadRaw, parent.channelId);
        allRawMessages.push(...replies);
        expandedThreadCount += replies.length;
      } catch (e) {
        // Continue if single thread fetch fails
      }
    }

    // Deduplicate all collected messages
    const deduplicated = slackNormalizer.deduplicateMessages(allRawMessages);

    steps[3].status = 'completed';
    steps[3].detail = `Expanded ${threadParents.length} thread(s) (+${expandedThreadCount} replies). Total: ${deduplicated.length} messages`;
    steps[4].status = 'active';

    // Filter messages matching user keywords / query if specified
    const filteredMessages = this.filterMessagesByQuery(prompt, deduplicated);

    // Step 5: Synthesize Grounded AI Answer
    const errText = deduplicated.length === 0 ? channelErrors.join(' | ') : undefined;
    const answer = this.generateGroundedAnswer(prompt, filteredMessages, channelsQueried, errText);

    steps[4].status = 'completed';
    steps[4].detail = `Generated answer with ${answer.sources.length} cited source(s)`;

    return {
      prompt,
      answer,
      steps,
      executedTools,
      rawMessages: filteredMessages,
      timestamp: new Date().toLocaleTimeString(),
    };
  }

  private filterMessagesByQuery(prompt: string, messages: SlackMessage[]): SlackMessage[] {
    const lower = prompt.toLowerCase();
    const keywords = lower
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !['what', 'where', 'when', 'which', 'about', 'from', 'this', 'that', 'with', 'have', 'were'].includes(w));

    if (keywords.length === 0) return messages;

    // Filter messages containing at least one relevant keyword
    const filtered = messages.filter((m) => {
      const textLower = m.text.toLowerCase();
      const userLower = m.userName.toLowerCase();
      return keywords.some((kw) => textLower.includes(kw) || userLower.includes(kw));
    });

    // If keyword filter returned results, use them; otherwise fallback to full set so user gets context
    return filtered.length > 0 ? filtered : messages;
  }

  private generateGroundedAnswer(
    prompt: string,
    messages: SlackMessage[],
    channels: string[],
    channelErrorMsg?: string
  ): AssistantAnswer {
    if (messages.length === 0) {
      return {
        summary: channelErrorMsg
          ? `Unable to retrieve Slack messages: ${channelErrorMsg}`
          : "I searched Slack but couldn't find any messages matching your request.",
        keyPoints: channelErrorMsg
          ? ['Check that the Slack bot is invited to your channels (/invite @geatures app).', 'Ensure the Slack MCP bot token has appropriate scopes.']
          : ['No matching Slack conversations found for the query timeframe.', 'Try broadening your search keywords or channel filters.'],
        importantDiscussions: [],
        peopleInvolved: [],
        unresolvedIssues: [],
        nextSteps: channelErrorMsg
          ? ['Invite the Slack bot to your channel by typing `/invite @geatures app` in Slack.']
          : ['Try querying with alternate keywords or selecting a specific channel.'],
        sources: [],
        rawMessagesCount: 0,
        channelsQueried: channels,
      };
    }

    // Extract unique participants
    const people = Array.from(new Set(messages.map((m) => m.userName))).filter(Boolean);

    // Group messages into key discussions
    const keyPoints: string[] = [];
    const importantDiscussions: string[] = [];
    const unresolvedIssues: string[] = [];
    const nextSteps: string[] = [];

    messages.forEach((m, idx) => {
      const snippet = m.text.length > 120 ? m.text.substring(0, 117) + '...' : m.text;
      const bullet = `**${m.userName}** (${m.formattedDate}): "${snippet}"`;

      if (idx < 5) {
        keyPoints.push(bullet);
      }

      if (
        m.text.toLowerCase().includes('issue') ||
        m.text.toLowerCase().includes('problem') ||
        m.text.toLowerCase().includes('bug') ||
        m.text.toLowerCase().includes('error') ||
        m.text.toLowerCase().includes('fail')
      ) {
        unresolvedIssues.push(`**${m.userName}**: ${m.text}`);
      }

      if (
        m.text.toLowerCase().includes('todo') ||
        m.text.toLowerCase().includes('task') ||
        m.text.toLowerCase().includes('need to') ||
        m.text.toLowerCase().includes('will') ||
        m.text.toLowerCase().includes('plan')
      ) {
        nextSteps.push(`**${m.userName}**: ${m.text}`);
      }
    });

    if (keyPoints.length === 0) {
      keyPoints.push(`Retrieved ${messages.length} messages across ${channels.length} channel(s).`);
    }

    importantDiscussions.push(
      `Discussions involved ${people.length} participant(s): ${people.join(', ')} across ${messages.length} total message(s).`
    );

    // Build Grounded Sources
    const sources: GroundedAnswerSource[] = messages.slice(0, 8).map((m) => ({
      messageId: m.id,
      channelId: m.channelId,
      channelName: m.channelName || m.channelId,
      userName: m.userName,
      timestamp: m.timestamp,
      formattedDate: m.formattedDate,
      snippet: m.text.length > 150 ? m.text.substring(0, 147) + '...' : m.text,
      permalink: m.permalink,
    }));

    const mainSummary = `Based on Slack messages retrieved from channel(s) ${channels.join(', ')}, here is the breakdown of discussions for "${prompt}":`;

    return {
      summary: mainSummary,
      keyPoints,
      importantDiscussions,
      peopleInvolved: people,
      unresolvedIssues,
      nextSteps: nextSteps.length > 0 ? nextSteps : ['Continue tracking channel updates.'],
      sources,
      rawMessagesCount: messages.length,
      channelsQueried: channels,
    };
  }

  private buildErrorResponse(
    prompt: string,
    steps: QueryProgressStep[],
    executedTools: any[],
    errorMsg: string
  ): AssistantQueryResult {
    return {
      prompt,
      answer: {
        summary: `Slack MCP Connection Error: ${errorMsg}`,
        keyPoints: ['Verify your SLACK_BOT_TOKEN and SLACK_TEAM_ID in .env.', 'Ensure the Slack MCP server is accessible locally via npx.'],
        importantDiscussions: [],
        peopleInvolved: [],
        unresolvedIssues: [errorMsg],
        nextSteps: ['Check .env configuration and restart the application server.'],
        sources: [],
        rawMessagesCount: 0,
        channelsQueried: [],
      },
      steps,
      executedTools,
      rawMessages: [],
      timestamp: new Date().toLocaleTimeString(),
    };
  }
}

export const aiEngine = new AiEngine();

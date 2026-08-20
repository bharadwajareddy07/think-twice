import { SlackMessage, SlackChannel, SlackUser } from '../src/types/slack';

export class SlackNormalizer {
  private userMap: Map<string, SlackUser> = new Map();
  private channelMap: Map<string, SlackChannel> = new Map();

  public registerUsers(users: SlackUser[]): void {
    for (const u of users) {
      this.userMap.set(u.id, u);
    }
  }

  public registerChannels(channels: SlackChannel[]): void {
    for (const c of channels) {
      this.channelMap.set(c.id, c);
    }
  }

  public parseChannelsResult(mcpResult: any): { channels: SlackChannel[]; error?: string } {
    const rawText = this.extractContentText(mcpResult);
    if (!rawText) return { channels: [] };

    try {
      const parsed = JSON.parse(rawText);
      if (!parsed.ok) {
        return { channels: [], error: parsed.error || 'Failed to list channels' };
      }

      const channels: SlackChannel[] = (parsed.channels || []).map((ch: any) => ({
        id: ch.id,
        name: ch.name || ch.id,
        isPrivate: ch.is_private,
        topic: ch.topic?.value || '',
        purpose: ch.purpose?.value || '',
        numMembers: ch.num_members,
      }));

      this.registerChannels(channels);
      return { channels };
    } catch (e: any) {
      return { channels: [], error: `Failed to parse channels JSON: ${e.message}` };
    }
  }

  public parseUsersResult(mcpResult: any): { users: SlackUser[]; error?: string } {
    const rawText = this.extractContentText(mcpResult);
    if (!rawText) return { users: [] };

    try {
      const parsed = JSON.parse(rawText);
      if (!parsed.ok) {
        return { users: [], error: parsed.error || 'Failed to list users' };
      }

      const users: SlackUser[] = (parsed.members || []).map((u: any) => ({
        id: u.id,
        name: u.name || u.real_name || u.id,
        realName: u.real_name || u.name || u.id,
        displayName: u.profile?.display_name || u.profile?.real_name || u.name || u.id,
        avatarUrl: u.profile?.image_48 || u.profile?.image_32 || '',
        isBot: u.is_bot || false,
        title: u.profile?.title || '',
        timezone: u.tz || '',
      }));

      this.registerUsers(users);
      return { users };
    } catch (e: any) {
      return { users: [], error: `Failed to parse users JSON: ${e.message}` };
    }
  }

  public parseMessagesResult(mcpResult: any, channelId: string): { messages: SlackMessage[]; error?: string } {
    const rawText = this.extractContentText(mcpResult);
    if (!rawText) return { messages: [] };

    try {
      const parsed = JSON.parse(rawText);
      if (!parsed.ok) {
        let err = parsed.error || 'Failed to get messages';
        if (err === 'not_in_channel') {
          err = `Bot is not in channel ${channelId}. Invite @geatures app to the channel (/invite @geatures app).`;
        }
        return { messages: [], error: err };
      }

      const rawMsgs = parsed.messages || [];
      const messages: SlackMessage[] = rawMsgs.map((m: any) => this.normalizeMessage(m, channelId));
      return { messages };
    } catch (e: any) {
      return { messages: [], error: `Failed to parse messages JSON: ${e.message}` };
    }
  }

  public normalizeMessage(m: any, channelId: string): SlackMessage {
    const userId = m.user || m.bot_id || 'UNKNOWN_USER';
    const userObj = this.userMap.get(userId);
    const channelObj = this.channelMap.get(channelId);

    const tsSeconds = parseFloat(m.ts || '0');
    const dateObj = tsSeconds > 0 ? new Date(tsSeconds * 1000) : new Date();
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const userName = userObj ? userObj.displayName || userObj.realName : userId;

    return {
      id: `${channelId}_${m.ts}`,
      channelId,
      channelName: channelObj ? `#${channelObj.name}` : channelId,
      userId,
      userName,
      userAvatar: userObj?.avatarUrl,
      text: m.text || '',
      timestamp: m.ts || '',
      formattedDate,
      threadTs: m.thread_ts,
      replyCount: m.reply_count || 0,
      permalink: m.permalink,
      reactions: (m.reactions || []).map((r: any) => ({
        name: r.name,
        count: r.count,
        users: r.users || [],
      })),
      isBot: m.bot_id ? true : false,
    };
  }

  public deduplicateMessages(messages: SlackMessage[]): SlackMessage[] {
    const seen = new Set<string>();
    const result: SlackMessage[] = [];

    for (const msg of messages) {
      const key = `${msg.channelId}_${msg.timestamp}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(msg);
      }
    }

    return result.sort((a, b) => parseFloat(a.timestamp) - parseFloat(b.timestamp));
  }

  private extractContentText(mcpResult: any): string | null {
    if (!mcpResult || !mcpResult.content || !Array.isArray(mcpResult.content)) {
      return null;
    }
    const textItem = mcpResult.content.find((item: any) => item.type === 'text');
    return textItem ? textItem.text : null;
  }
}

export const slackNormalizer = new SlackNormalizer();

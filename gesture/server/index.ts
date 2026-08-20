import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { mcpClient } from './mcpClient';
import { aiEngine } from './aiEngine';
import { slackNormalizer } from './slackNormalizer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize MCP connection on startup
mcpClient.connect().catch((err) => {
  console.warn('Initial MCP connection warning:', err.message);
});

// 1. MCP Health & Status Endpoint
app.get('/api/mcp/status', (req, res) => {
  const status = mcpClient.getStatus();
  res.json(status);
});

// 2. List Configured & Discovered Channels
app.get('/api/slack/channels', async (req, res) => {
  try {
    const raw = await mcpClient.callTool('slack_list_channels', { limit: 100 });
    const { channels, error } = slackNormalizer.parseChannelsResult(raw);

    if (error && channels.length === 0) {
      // Fallback to configured default channels if list_channels missing scope
      const defaultIds = (process.env.SLACK_DEFAULT_CHANNELS || 'C0BRC2NRJ5T,C0BRKGA8HK6')
        .split(',')
        .map((c) => c.trim());

      const fallbackChannels = defaultIds.map((id) => ({
        id,
        name: id,
        purpose: 'Configured Workspace Channel',
      }));

      return res.json({ channels: fallbackChannels, warning: error });
    }

    res.json({ channels });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. List Workspace Users
app.get('/api/slack/users', async (req, res) => {
  try {
    const raw = await mcpClient.callTool('slack_get_users', { limit: 100 });
    const { users, error } = slackNormalizer.parseUsersResult(raw);
    res.json({ users, error });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Main Natural Language Assistant Endpoint
app.post('/api/assistant/query', async (req, res) => {
  const { prompt, channelId } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'A valid prompt string is required.' });
  }

  try {
    const result = await aiEngine.processQuery(prompt, channelId);
    res.json(result);
  } catch (err: any) {
    console.error('Assistant query error:', err);
    res.status(500).json({ error: err.message || 'Internal server error while processing prompt.' });
  }
});

// 5. Developer Debug Tool Call Endpoint
app.post('/api/mcp/call', async (req, res) => {
  const { tool, args } = req.body;
  if (!tool) {
    return res.status(400).json({ error: 'Tool name is required.' });
  }

  try {
    const result = await mcpClient.callTool(tool, args || {});
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Developer Mode Raw MCP Traffic Logs Endpoint
app.get('/api/mcp/logs', (req, res) => {
  res.json({ logs: mcpClient.getLogHistory() });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Local Slack MCP Assistant API Server running on port ${PORT}`);
  console.log(`➜ MCP Status Endpoint: http://localhost:${PORT}/api/mcp/status`);
  console.log(`====================================================`);
});

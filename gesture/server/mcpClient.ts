import { spawn, ChildProcess } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

export interface McpTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface McpStatusResponse {
  connected: boolean;
  transport: string;
  serverName: string;
  serverVersion: string;
  tools: McpTool[];
  resources: any[];
  prompts: any[];
  error?: string;
  lastPing: string;
}

export class McpClient {
  private child: ChildProcess | null = null;
  private requestId: number = 1;
  private pendingRequests: Map<number, { resolve: (val: any) => void; reject: (err: any) => void }> = new Map();
  private buffer: string = '';
  private isConnected: boolean = false;
  private serverInfo: { name: string; version: string } = { name: 'Unknown', version: '0.0.0' };
  private tools: McpTool[] = [];
  private lastError: string | undefined;
  private logHistory: Array<{ direction: 'SEND' | 'RECV'; payload: any; timestamp: string }> = [];

  constructor() {}

  public async connect(): Promise<void> {
    const botToken = process.env.SLACK_BOT_TOKEN;
    const teamId = process.env.SLACK_TEAM_ID;

    if (!botToken || !teamId) {
      this.lastError = 'Missing SLACK_BOT_TOKEN or SLACK_TEAM_ID environment variables.';
      throw new Error(this.lastError);
    }

    if (this.child) {
      this.disconnect();
    }

    console.log('Connecting to local Slack MCP server via stdio...');

    try {
      this.child = spawn('npx', ['-y', '@modelcontextprotocol/server-slack'], {
        env: {
          ...process.env,
          SLACK_BOT_TOKEN: botToken,
          SLACK_TEAM_ID: teamId,
        },
        shell: true,
      });

      this.child.stdout?.on('data', (chunk) => {
        this.buffer += chunk.toString();
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            this.logPayload('RECV', msg);
            this.handleResponse(msg);
          } catch (e) {
            // raw output or log line
          }
        }
      });

      this.child.stderr?.on('data', (data) => {
        const text = data.toString();
        if (text.includes('Error') || text.includes('error')) {
          console.error('Slack MCP STDERR:', text);
        }
      });

      this.child.on('error', (err) => {
        console.error('MCP process error:', err);
        this.isConnected = false;
        this.lastError = err.message;
      });

      this.child.on('exit', (code) => {
        console.log(`MCP process exited with code ${code}`);
        this.isConnected = false;
      });

      // 1. Send Initialize Request
      const initRes = await this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'LocalSlackAssistant', version: '1.0.0' },
      });

      if (initRes && initRes.serverInfo) {
        this.serverInfo = initRes.serverInfo;
      }

      // 2. Send initialized notification
      this.sendNotification('notifications/initialized');

      // 3. List tools
      const toolsRes = await this.sendRequest('tools/list', {});
      if (toolsRes && toolsRes.tools) {
        this.tools = toolsRes.tools;
      }

      this.isConnected = true;
      this.lastError = undefined;
      console.log(`Connected to ${this.serverInfo.name} v${this.serverInfo.version} (${this.tools.length} tools discovered)`);
    } catch (err: any) {
      this.isConnected = false;
      this.lastError = err.message || 'Failed to start MCP server process';
      console.error('Failed to connect to Slack MCP server:', err);
      throw err;
    }
  }

  public disconnect(): void {
    if (this.child) {
      this.child.kill();
      this.child = null;
    }
    this.isConnected = false;
  }

  public getStatus(): McpStatusResponse {
    return {
      connected: this.isConnected,
      transport: 'stdio',
      serverName: this.serverInfo.name,
      serverVersion: this.serverInfo.version,
      tools: this.tools,
      resources: [],
      prompts: [],
      error: this.lastError,
      lastPing: new Date().toLocaleTimeString(),
    };
  }

  public async callTool(name: string, args: Record<string, any> = {}): Promise<any> {
    if (!this.isConnected) {
      await this.connect();
    }

    const res = await this.sendRequest('tools/call', {
      name,
      arguments: args,
    });

    return res;
  }

  public getLogHistory() {
    return this.logHistory;
  }

  private sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.child || !this.child.stdin) {
        return reject(new Error('MCP child process stdin is not available'));
      }

      const id = this.requestId++;
      const payload = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      this.pendingRequests.set(id, { resolve, reject });
      this.logPayload('SEND', payload);

      this.child.stdin.write(JSON.stringify(payload) + '\n', (err) => {
        if (err) {
          this.pendingRequests.delete(id);
          reject(err);
        }
      });

      // Timeout safety
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`MCP request '${method}' (id: ${id}) timed out after 15 seconds`));
        }
      }, 15000);
    });
  }

  private sendNotification(method: string, params?: any): void {
    if (!this.child || !this.child.stdin) return;
    const payload = {
      jsonrpc: '2.0',
      method,
      ...(params ? { params } : {}),
    };
    this.logPayload('SEND', payload);
    this.child.stdin.write(JSON.stringify(payload) + '\n');
  }

  private handleResponse(msg: any): void {
    if (msg.id !== undefined && this.pendingRequests.has(msg.id)) {
      const { resolve, reject } = this.pendingRequests.get(msg.id)!;
      this.pendingRequests.delete(msg.id);

      if (msg.error) {
        reject(new Error(`MCP Error ${msg.error.code}: ${msg.error.message}`));
      } else {
        resolve(msg.result);
      }
    }
  }

  private logPayload(direction: 'SEND' | 'RECV', payload: any): void {
    this.logHistory.unshift({
      direction,
      payload,
      timestamp: new Date().toLocaleTimeString(),
    });
    if (this.logHistory.length > 50) {
      this.logHistory.pop();
    }
  }
}

// Global singleton instance
export const mcpClient = new McpClient();

#!/usr/bin/env node

/**
 * LocalFlow MCP Server
 * 
 * Exposes LocalFlow workflows as tools for Claude Desktop
 * 
 * Tools:
 *   - localflow_list_templates: List available workflow templates
 *   - localflow_run_workflow: Run a workflow by template ID
 *   - localflow_chat: Talk to the Master AI
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const LOCALFLOW_API = 'http://localhost:9998';

// Helper to call LocalFlow API
async function callLocalFlow(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${LOCALFLOW_API}${endpoint}`, options);
    return await response.json();
  } catch (error) {
    return { error: `Failed to connect to LocalFlow: ${error.message}. Is LocalFlow running?` };
  }
}

// Create MCP server
const server = new Server(
  {
    name: 'localflow',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'localflow_list_templates',
        description: 'List all available workflow templates in LocalFlow. Returns template IDs, names, descriptions, and what tools they use.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'localflow_run_workflow',
        description: 'Run a LocalFlow workflow by template ID. Can optionally override the task/prompt. Returns the workflow result including all tool calls and outputs.',
        inputSchema: {
          type: 'object',
          properties: {
            templateId: {
              type: 'string',
              description: 'The template ID to run (e.g., "ai-character-builder", "simple-qa")',
            },
            task: {
              type: 'string',
              description: 'Optional custom task/prompt to override the default',
            },
          },
          required: ['templateId'],
        },
      },
      {
        name: 'localflow_chat',
        description: 'Chat with LocalFlow Master AI. It knows about all templates, tools, and can help design workflows. Maintains conversation memory within a session.',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Your message to the Master AI',
            },
            sessionId: {
              type: 'string',
              description: 'Optional session ID to continue a previous conversation',
            },
          },
          required: ['message'],
        },
      },
      {
        name: 'localflow_health',
        description: 'Check if LocalFlow is running and accessible',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'localflow_health': {
      const result = await callLocalFlow('/health');
      return {
        content: [
          {
            type: 'text',
            text: result.error 
              ? `❌ LocalFlow is not accessible: ${result.error}`
              : `✅ LocalFlow is running (${result.service})`,
          },
        ],
      };
    }

    case 'localflow_list_templates': {
      const result = await callLocalFlow('/templates');
      if (result.error) {
        return {
          content: [{ type: 'text', text: `Error: ${result.error}` }],
        };
      }
      
      const templates = result.templates || [];
      const summary = templates.map(t => 
        `**${t.name}** (${t.id})\n  ${t.description || 'No description'}\n  Tools: ${t.tools?.join(', ') || 'none'}`
      ).join('\n\n');
      
      return {
        content: [
          {
            type: 'text',
            text: `Found ${templates.length} templates:\n\n${summary}`,
          },
        ],
      };
    }

    case 'localflow_run_workflow': {
      const { templateId, task } = args;
      const body = { templateId };
      if (task) {
        body.params = { task };
      }
      
      const result = await callLocalFlow('/run', 'POST', body);
      if (result.error) {
        return {
          content: [{ type: 'text', text: `Error: ${result.error}` }],
        };
      }
      
      // Extract the key result
      const outputs = result.result?.outputs || {};
      const orchestratorOutput = Object.values(outputs).find(o => o.result || o.memory);
      const finalResult = orchestratorOutput?.result || orchestratorOutput?.memory?.finalResult || JSON.stringify(outputs, null, 2);
      
      // Get steps if available
      const steps = orchestratorOutput?.steps || [];
      const stepSummary = steps
        .filter(s => s.action && s.result)
        .map(s => `- ${s.action}: ${JSON.stringify(s.result).substring(0, 100)}...`)
        .join('\n');
      
      return {
        content: [
          {
            type: 'text',
            text: `**Workflow Complete**\n\n**Result:** ${finalResult}\n\n**Steps:**\n${stepSummary || 'No steps recorded'}`,
          },
        ],
      };
    }

    case 'localflow_chat': {
      const { message, sessionId } = args;
      const body = { message };
      if (sessionId) {
        body.sessionId = sessionId;
      }
      
      const result = await callLocalFlow('/chat', 'POST', body);
      if (result.error) {
        return {
          content: [{ type: 'text', text: `Error: ${result.error}` }],
        };
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `**Session:** ${result.sessionId}\n\n${result.response}`,
          },
        ],
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('LocalFlow MCP server running');
}

main().catch(console.error);

import express from 'express';
import Docker from 'dockerode';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const docker = new Docker();

const server = new Server(
  { name: 'docker-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_containers',
      description: 'List all Docker containers with status, ports, and image info',
      inputSchema: { type: 'object', properties: { all: { type: 'boolean', description: 'Include stopped containers' } } },
    },
    {
      name: 'container_logs',
      description: 'Get recent logs from a container',
      inputSchema: {
        type: 'object',
        properties: {
          container: { type: 'string', description: 'Container name or ID' },
          tail: { type: 'number', description: 'Number of lines (default 50)' },
        },
        required: ['container'],
      },
    },
    {
      name: 'container_stats',
      description: 'Get live CPU and memory stats for a container',
      inputSchema: {
        type: 'object',
        properties: { container: { type: 'string', description: 'Container name or ID' } },
        required: ['container'],
      },
    },
    {
      name: 'start_container',
      description: 'Start a stopped container',
      inputSchema: {
        type: 'object',
        properties: { container: { type: 'string', description: 'Container name or ID' } },
        required: ['container'],
      },
    },
    {
      name: 'stop_container',
      description: 'Stop a running container',
      inputSchema: {
        type: 'object',
        properties: { container: { type: 'string', description: 'Container name or ID' } },
        required: ['container'],
      },
    },
    {
      name: 'restart_container',
      description: 'Restart a container',
      inputSchema: {
        type: 'object',
        properties: { container: { type: 'string', description: 'Container name or ID' } },
        required: ['container'],
      },
    },
    {
      name: 'remove_container',
      description: 'Remove a container (with optional force)',
      inputSchema: {
        type: 'object',
        properties: {
          container: { type: 'string', description: 'Container name or ID' },
          force: { type: 'boolean', description: 'Force removal' },
        },
        required: ['container'],
      },
    },
    {
      name: 'exec_command',
      description: 'Execute a command inside a running container',
      inputSchema: {
        type: 'object',
        properties: {
          container: { type: 'string', description: 'Container name or ID' },
          cmd: { type: 'string', description: 'Command to execute' },
        },
        required: ['container', 'cmd'],
      },
    },
    {
      name: 'list_images',
      description: 'List all Docker images',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'compose_ps',
      description: 'List services in a Docker Compose stack (runs docker compose ps)',
      inputSchema: {
        type: 'object',
        properties: {
          project: { type: 'string', description: 'Compose project name (optional)' },
        },
      },
    },
    {
      name: 'docker_version',
      description: 'Get Docker version info',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

async function getContainer(id) {
  const containers = await docker.listContainers({ all: true });
  const match = containers.find(
    (c) => c.Id.startsWith(id) || c.Names.map((n) => n.replace(/^\//, '')).includes(id),
  );
  if (!match) throw new Error(`Container not found: ${id}`);
  return docker.getContainer(match.Id);
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_containers': {
        const containers = await docker.listContainers({ all: args?.all ?? false });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(containers.map((c) => ({
              id: c.Id.slice(0, 12),
              name: c.Names.map((n) => n.replace(/^\//, '')).join(', '),
              image: c.Image,
              status: c.State,
              ports: (c.Ports || []).map((p) => `${p.PublicPort || ''}:${p.PrivatePort}/${p.Type}`).join(', '),
              created: c.Created,
            })), null, 2),
          }],
        };
      }

      case 'container_logs': {
        const container = await getContainer(args.container);
        const logs = await container.logs({
          stdout: true,
          stderr: true,
          tail: args?.tail ?? 50,
          timestamps: false,
        });
        return { content: [{ type: 'text', text: logs.toString() }] };
      }

      case 'container_stats': {
        const container = await getContainer(args.container);
        const stats = await container.stats({ stream: false });
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
        const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
        const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * 100 * stats.cpu_stats.online_cpus : 0;
        const memBytes = stats.memory_stats.usage || 0;
        const memLimit = stats.memory_stats.limit || 1;
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              container: args.container,
              cpu_percent: cpuPercent.toFixed(2),
              memory_mb: (memBytes / 1024 / 1024).toFixed(2),
              memory_limit_mb: (memLimit / 1024 / 1024).toFixed(2),
              memory_percent: ((memBytes / memLimit) * 100).toFixed(2),
              network: stats.networks,
            }, null, 2),
          }],
        };
      }

      case 'start_container': {
        const container = await getContainer(args.container);
        await container.start();
        return { content: [{ type: 'text', text: `Container started: ${args.container}` }] };
      }

      case 'stop_container': {
        const container = await getContainer(args.container);
        await container.stop();
        return { content: [{ type: 'text', text: `Container stopped: ${args.container}` }] };
      }

      case 'restart_container': {
        const container = await getContainer(args.container);
        await container.restart();
        return { content: [{ type: 'text', text: `Container restarted: ${args.container}` }] };
      }

      case 'remove_container': {
        const container = await getContainer(args.container);
        await container.remove({ force: args?.force ?? false });
        return { content: [{ type: 'text', text: `Container removed: ${args.container}` }] };
      }

      case 'exec_command': {
        const container = await getContainer(args.container);
        const exec = await container.exec({
          Cmd: ['sh', '-c', args.cmd],
          AttachStdout: true,
          AttachStderr: true,
        });
        const stream = await exec.start({ Detach: false, Tty: false });
        return new Promise((resolve, reject) => {
          let output = '';
          stream.on('data', (chunk) => { output += chunk.toString(); });
          stream.on('end', () => {
            resolve({ content: [{ type: 'text', text: output.trim() }] });
          });
          stream.on('error', reject);
        });
      }

      case 'list_images': {
        const images = await docker.listImages();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(images.map((i) => ({
              id: i.Id.slice(0, 19),
              tags: i.RepoTags || [],
              size: (i.Size / 1024 / 1024).toFixed(2) + ' MB',
              created: i.Created,
            })), null, 2),
          }],
        };
      }

      case 'compose_ps': {
        const { execSync } = await import('child_process');
        const projectFlag = args?.project ? `-p ${args.project}` : '';
        const output = execSync(`docker compose ${projectFlag} ps --format json 2>nul || echo []`).toString();
        return { content: [{ type: 'text', text: output }] };
      }

      case 'docker_version': {
        const version = await docker.version();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              version: version.Version,
              api_version: version.ApiVersion,
              platform: version.Platform?.Name,
              os: version.Os,
              arch: version.Arch,
            }, null, 2),
          }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

// ————— SSE Transport —————

const app = express();
let transport;

app.get('/sse', async (req, res) => {
  transport = new SSEServerTransport('/message', res);
  await server.connect(transport);
});

app.post('/message', async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  }
});

const PORT = parseInt(process.env.PORT || '1234', 10);
app.listen(PORT, () => {
  console.error(`Docker MCP server running on http://localhost:${PORT}/sse`);
});

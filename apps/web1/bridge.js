const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4096;

// Load opencode.json config
const opencodeJsonPath = path.join(__dirname, 'opencode.json');
let config = {};
try {
  config = JSON.parse(fs.readFileSync(opencodeJsonPath, 'utf8'));
} catch (err) {
  console.error('Failed to load opencode.json:', err);
}

// In-memory sessions store
const sessions = new Map();

// Load agent prompt file from path (supporting {file:...} templates)
function loadAgentPrompt(agentConfig) {
  let prompt = agentConfig.prompt || '';
  if (prompt.startsWith('{file:') && prompt.endsWith('}')) {
    const relativePath = prompt.slice(6, -1);
    const fullPath = path.join(__dirname, relativePath);
    try {
      prompt = fs.readFileSync(fullPath, 'utf8');
      // Strip YAML frontmatter if present
      if (prompt.startsWith('---')) {
        const parts = prompt.split('---');
        if (parts.length >= 3) {
          prompt = parts.slice(2).join('---').trim();
        }
      }
    } catch (err) {
      console.error(`Failed to read prompt file ${fullPath}:`, err);
    }
  }
  return prompt;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // GET /global/health
  if (req.method === 'GET' && pathname === '/global/health') {
    res.end(JSON.stringify({ healthy: true, version: '1.17.9' }));
    return;
  }

  // GET /agent
  if (req.method === 'GET' && pathname === '/agent') {
    const agents = Object.entries(config.agent || {}).map(([id, ag]) => ({
      id,
      description: ag.description,
      mode: ag.mode,
      temperature: ag.temperature,
      prompt: loadAgentPrompt(ag),
      permission: ag.permission
    }));
    res.end(JSON.stringify(agents));
    return;
  }

  // GET /config/providers
  if (req.method === 'GET' && pathname === '/config/providers') {
    res.end(JSON.stringify({
      providers: [
        {
          id: 'opencode',
          name: 'OpenCode Zen',
          source: 'custom',
          env: ['OPENCODE_API_KEY'],
          options: { apiKey: 'public' },
          models: {
            'big-pickle': { id: 'big-pickle', api: { url: 'https://opencode.ai/zen/v1' } },
            'deepseek-v4-flash-free': { id: 'deepseek-v4-flash-free', api: { url: 'https://opencode.ai/zen/v1' } }
          }
        }
      ],
      default: { opencode: 'big-pickle' }
    }));
    return;
  }

  // POST /session
  if (req.method === 'POST' && pathname === '/session') {
    const sessionId = 'ses_' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    sessions.set(sessionId, { messages: [] });
    res.end(JSON.stringify({ id: sessionId, version: '1.17.9' }));
    return;
  }

  // POST /session/:id/message
  const messageMatch = pathname.match(/^\/session\/(ses_[a-zA-Z0-9]+)\/message$/);
  if (req.method === 'POST' && messageMatch) {
    const sessionId = messageMatch[1];
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const agentName = payload.agent || 'noc-agent';
        const userText = payload.parts?.[0]?.text || '';
        const systemOverride = payload.system;

        const agentConfig = config.agent?.[agentName] || {};
        const baseSystemPrompt = systemOverride || loadAgentPrompt(agentConfig);

        const modelName = payload.model || agentConfig.model || 'big-pickle';
        const cleanModelName = modelName.replace('opencode/', '');

        console.log(`[Bridge] Session: ${sessionId}, Agent: ${agentName}, Model: ${cleanModelName}`);

        // Prepare messages for completions API
        const messages = [];
        if (baseSystemPrompt) {
          messages.push({ role: 'system', content: baseSystemPrompt });
        }
        
        // Add session history
        const session = sessions.get(sessionId) || { messages: [] };
        messages.push(...session.messages);
        messages.push({ role: 'user', content: userText });

        // Call the completions API
        const response = await fetch('https://opencode.ai/zen/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer public',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: cleanModelName,
            messages: messages
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Completions API failed (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const assistantText = data.choices?.[0]?.message?.content || '';

        // Save history
        session.messages.push({ role: 'user', content: userText });
        session.messages.push({ role: 'assistant', content: assistantText });
        sessions.set(sessionId, session);

        // Special logic for noc-closer: save case file
        if (agentName === 'noc-closer') {
          try {
            const today = new Date().toISOString().split('T')[0];
            const casesDir = path.join(__dirname, 'gate-answer', 'cases');
            fs.mkdirSync(casesDir, { recursive: true });
            const caseFile = path.join(casesDir, `noc-${today}-${sessionId}.md`);
            fs.writeFileSync(caseFile, assistantText, 'utf8');
            console.log(`[Bridge] Saved case file to: ${caseFile}`);
          } catch (err) {
            console.error('[Bridge] Failed to save case file:', err);
          }
        }

        res.end(JSON.stringify({
          parts: [{ type: 'text', text: assistantText }]
        }));
      } catch (err) {
        console.error('[Bridge Error]', err);
        res.statusCode = 500;
        res.end(JSON.stringify({
          name: 'UnknownError',
          data: { message: err.message || 'Unexpected server error.' }
        }));
      }
    });
    return;
  }

  // DELETE /session/:id
  const deleteMatch = pathname.match(/^\/session\/(ses_[a-zA-Z0-9]+)$/);
  if (req.method === 'DELETE' && deleteMatch) {
    const sessionId = deleteMatch[1];
    sessions.delete(sessionId);
    res.end(JSON.stringify({ success: true }));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Bridge] opencode bridge listening on http://0.0.0.0:${PORT}`);
});

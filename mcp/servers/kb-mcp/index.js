import express from 'express';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const app = express();
app.use(express.json());

const repoPath = process.env.KNOWLEDGE_REPO_PATH || '../openstack-support';

// Helper to safe-resolve path and prevent path traversal
function getSafePath(relativePath) {
  const resolvedBase = path.resolve(repoPath);
  const resolvedTarget = path.resolve(resolvedBase, relativePath);
  if (!resolvedTarget.startsWith(resolvedBase)) {
    throw new Error('Path traversal detected');
  }
  return resolvedTarget;
}

// 1. kb_categories
app.post('/tools/kb_categories', async (req, res) => {
  try {
    const knowledgeDir = getSafePath('knowledge');
    if (!fs.existsSync(knowledgeDir)) {
      return res.json([]);
    }
    const files = fs.readdirSync(knowledgeDir).filter(f => f.endsWith('.yaml'));
    const categories = [];

    for (const file of files) {
      const filePath = path.join(knowledgeDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = yaml.load(content);
      if (parsed && parsed.categories) {
        for (const [id, cat] of Object.entries(parsed.categories)) {
          categories.push({
            id,
            name: cat.name || id,
            file
          });
        }
      }
    }
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. kb_read
app.post('/tools/kb_read', async (req, res) => {
  try {
    const { path: relativePath } = req.body;
    if (!relativePath) {
      return res.status(400).json({ error: 'Missing path parameter' });
    }
    const filePath = getSafePath(relativePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `File not found: ${relativePath}` });
    }
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. style_guide_read
app.post('/tools/style_guide_read', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Missing name parameter' });
    }
    const targetNames = [
      `style-guide/${name}-style.md`,
      `style-guide/${name}.md`,
      `style-guide/${name}`
    ];
    let content = null;
    let foundPath = null;
    for (const tn of targetNames) {
      try {
        const filePath = getSafePath(tn);
        if (fs.existsSync(filePath)) {
          content = fs.readFileSync(filePath, 'utf8');
          foundPath = tn;
          break;
        }
      } catch (e) {
        // Skip path traversal errors or invalid paths
      }
    }
    if (content === null) {
      return res.status(404).json({ error: `Style guide not found for: ${name}` });
    }
    res.json({ path: foundPath, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. template_read
app.post('/tools/template_read', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Missing name parameter' });
    }
    const targetNames = [
      `templates/${name}.md`,
      `templates/${name}`,
      `knowledge/${name}.md`,
      `knowledge/${name}`
    ];
    let content = null;
    let foundPath = null;
    for (const tn of targetNames) {
      try {
        const filePath = getSafePath(tn);
        if (fs.existsSync(filePath)) {
          content = fs.readFileSync(filePath, 'utf8');
          foundPath = tn;
          break;
        }
      } catch (e) {
        // Skip
      }
    }
    if (content === null) {
      return res.status(404).json({ error: `Template not found for: ${name}` });
    }
    res.json({ path: foundPath, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. kb_search
app.post('/tools/kb_search', async (req, res) => {
  try {
    const { query, category, limit = 5 } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter' });
    }

    const knowledgeDir = getSafePath('knowledge');
    if (!fs.existsSync(knowledgeDir)) {
      return res.json({ result: 'Knowledge directory does not exist' });
    }

    const files = fs.readdirSync(knowledgeDir).filter(f => f.endsWith('.yaml'));
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = [];

    for (const file of files) {
      const filePath = path.join(knowledgeDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = yaml.load(content);
      if (!parsed || !parsed.categories) continue;

      for (const [catId, cat] of Object.entries(parsed.categories)) {
        // Filter by category if requested
        if (category && catId !== category) continue;

        const catName = cat.name || catId;
        const triggers = cat.triggers || '';

        if (cat.sections) {
          for (const [secId, sec] of Object.entries(cat.sections)) {
            const secName = sec.name || secId;
            if (sec.entries) {
              for (const entry of sec.entries) {
                const entryId = entry.id || '';
                const keywords = Array.isArray(entry.keywords) ? entry.keywords.join(' ') : '';
                const answer = entry.answer || '';
                const searchText = `${catName} ${triggers} ${secName} ${entryId} ${keywords} ${answer}`.toLowerCase();

                let score = 0;
                for (const term of terms) {
                  if (searchText.includes(term)) {
                    score += 1;
                    // Boost if matches keywords specifically
                    if (keywords.toLowerCase().includes(term)) {
                      score += 2;
                    }
                    // Boost if matches ID
                    if (entryId.toLowerCase().includes(term)) {
                      score += 3;
                    }
                  }
                }

                if (score > 0) {
                  matches.push({
                    id: entryId,
                    category: catName,
                    section: secName,
                    answer: entry.answer,
                    refs: entry.refs || [],
                    score
                  });
                }
              }
            }
          }
        }
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);
    const topMatches = matches.slice(0, limit);

    if (topMatches.length === 0) {
      return res.json('No matching knowledge base articles found.');
    }

    // Format output exactly as a readable string
    const formatted = topMatches.map(m => {
      let refStr = '';
      if (m.refs && m.refs.length > 0) {
        refStr = '\nReferences:\n' + m.refs.map(r => `- ${r.title}: ${r.url}`).join('\n');
      }
      return `[Knowledge Source: ${m.category} > ${m.section} (ID: ${m.id})]\n${m.answer.trim()}${refStr}`;
    }).join('\n\n---\n\n');

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = parseInt(process.env.PORT || '4101', 10);
app.listen(PORT, () => {
  console.error(`KB MCP server running on http://localhost:${PORT}`);
});

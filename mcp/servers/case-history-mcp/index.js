import express from 'express';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const app = express();
app.use(express.json());

const dbUrl = process.env.DATABASE_URL || 'file:../../apps/app2/prisma/data/app2.db';
let dbPath = dbUrl;
if (dbPath.startsWith('file:')) {
  dbPath = dbPath.slice(5);
}
dbPath = path.resolve(dbPath);

console.error(`Case History DB Path resolved to: ${dbPath}`);

let dbConnection = null;
function getDb() {
  if (dbConnection) return dbConnection;
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file does not exist at path: ${dbPath}`);
  }
  dbConnection = new Database(dbPath, { readonly: true });
  // Set WAL mode or other optimisations if needed
  dbConnection.pragma('journal_mode = WAL');
  return dbConnection;
}

// Jaccard similarity word overlap helper
function computeSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  const words1 = new Set(text1.toLowerCase().match(/\b\w+\b/g) || []);
  const words2 = new Set(text2.toLowerCase().match(/\b\w+\b/g) || []);
  if (words1.size === 0 || words2.size === 0) return 0;
  
  let intersection = 0;
  for (const w of words1) {
    if (words2.has(w)) intersection++;
  }
  return intersection / (words1.size + words2.size - intersection || 1);
}

// 1. case_search
app.post('/tools/case_search', async (req, res) => {
  try {
    const { query, page, status, limit = 5 } = req.body;
    const db = getDb();
    
    let sql = `SELECT * FROM "Case" WHERE 1=1`;
    const params = [];

    if (page) {
      sql += ` AND "page" = ?`;
      params.push(page);
    }
    
    if (status && status !== 'all') {
      sql += ` AND "status" = ?`;
      params.push(status);
    }

    if (query) {
      sql += ` AND ("summary" LIKE ? OR "detail" LIKE ? OR "preview" LIKE ? OR "caseId" LIKE ?)`;
      const likeParam = `%${query}%`;
      params.push(likeParam, likeParam, likeParam, likeParam);
    }

    sql += ` ORDER BY "createdAt" DESC LIMIT ?`;
    params.push(limit);

    const cases = db.prepare(sql).all(...params);

    if (cases.length === 0) {
      return res.json('No matching cases found in history.');
    }

    const formatted = cases.map(c => {
      return `[Case ID: ${c.caseId}]
UUID: ${c.id}
Role: ${c.userRole}
Page: ${c.page}
Status: ${c.status}
Created At: ${c.createdAt}
Summary: ${c.summary || 'N/A'}
Detail: ${c.detail || 'N/A'}`;
    }).join('\n\n---\n\n');

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. case_read
app.post('/tools/case_read', async (req, res) => {
  try {
    const { caseId } = req.body;
    if (!caseId) {
      return res.status(400).json({ error: 'Missing caseId parameter' });
    }
    const db = getDb();

    // Find case by caseId (DDMMYYNN) or UUID id
    const caseRow = db.prepare(`SELECT * FROM "Case" WHERE "caseId" = ? OR "id" = ?`).get(caseId, caseId);

    if (!caseRow) {
      return res.status(404).json({ error: `Case not found: ${caseId}` });
    }

    // Get messages
    const messages = db.prepare(`SELECT * FROM "ChatMessage" WHERE "caseId" = ? ORDER BY "createdAt" ASC`).all(caseRow.id);

    let msgStr = 'No messages in this case.';
    if (messages.length > 0) {
      msgStr = messages.map(m => {
        const sender = m.role === 'user' ? 'User' : 'Assistant';
        const modelStr = m.model ? ` (Model: ${m.model} via ${m.provider || 'N/A'})` : '';
        return `${sender}${modelStr}: ${m.content}`;
      }).join('\n\n');
    }

    const formatted = `[Case Detail: ${caseRow.caseId}]
UUID: ${caseRow.id}
User: ${caseRow.username} (${caseRow.userRole})
Page: ${caseRow.page}
Status: ${caseRow.status}
Created At: ${caseRow.createdAt}
Closed At: ${caseRow.closedAt || 'N/A'}

Summary:
${caseRow.summary || 'N/A'}

Detail:
${caseRow.detail || 'N/A'}

==================================================
Messages History:
==================================================
${msgStr}`;

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. case_similar
app.post('/tools/case_similar', async (req, res) => {
  try {
    const { text, limit = 3 } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Missing text parameter' });
    }
    const db = getDb();

    // Fetch cases that have summary or detail
    const cases = db.prepare(`SELECT * FROM "Case" WHERE "summary" IS NOT NULL OR "detail" IS NOT NULL`).all();

    const scored = cases.map(c => {
      const caseContent = `${c.summary || ''} ${c.detail || ''} ${c.preview || ''}`;
      const score = computeSimilarity(text, caseContent);
      return { case: c, score };
    }).filter(s => s.score > 0);

    scored.sort((a, b) => b.score - a.score);
    const topScored = scored.slice(0, limit);

    if (topScored.length === 0) {
      return res.json('No similar past cases found in history.');
    }

    const formatted = topScored.map(s => {
      const c = s.case;
      return `[Similar Case ID: ${c.caseId} (Similarity: ${(s.score * 100).toFixed(1)}%)]
UUID: ${c.id}
Role: ${c.userRole}
Page: ${c.page}
Status: ${c.status}
Summary: ${c.summary || 'N/A'}
Detail: ${c.detail || 'N/A'}`;
    }).join('\n\n---\n\n');

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = parseInt(process.env.PORT || '4102', 10);
app.listen(PORT, () => {
  console.error(`Case History MCP server running on http://localhost:${PORT}`);
});

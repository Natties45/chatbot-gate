export interface CaseRecord {
  id: string;
  type: 'noc' | 'operation';
  preview: string;
  createdAt: string;
  status: 'active' | 'hidden';
}

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  kind?: 'message' | 'draft';
}

const STORAGE_KEY = 'chatbot-gate-cases';
const MSG_KEY_PREFIX = 'chatbot-gate-msgs-';

function readAll(): CaseRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(records: CaseRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function getMsgKey(sessionId: string): string {
  return `${MSG_KEY_PREFIX}${sessionId}`;
}

export const caseStore = {
  getAll(type?: 'noc' | 'operation'): CaseRecord[] {
    const all = readAll();
    if (type) return all.filter((c) => c.type === type && c.status === 'active');
    return all.filter((c) => c.status === 'active');
  },

  get(id: string): CaseRecord | undefined {
    return readAll().find((c) => c.id === id && c.status === 'active');
  },

  add(record: CaseRecord): void {
    const all = readAll();
    all.unshift(record);
    writeAll(all);
  },

  update(id: string, updates: Partial<CaseRecord>): void {
    const all = readAll();
    const idx = all.findIndex((c) => c.id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      writeAll(all);
    }
  },

  remove(id: string): void {
    const all = readAll().filter((c) => c.id !== id);
    writeAll(all);
  },

  softDelete(id: string): void {
    const all = readAll();
    const idx = all.findIndex((c) => c.id === id);
    if (idx !== -1) {
      all[idx].status = 'hidden';
      writeAll(all);
    }
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  },
};

export const messageStore = {
  save(sessionId: string, messages: StoredMessage[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getMsgKey(sessionId), JSON.stringify(messages));
  },

  load(sessionId: string): StoredMessage[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(getMsgKey(sessionId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  remove(sessionId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(getMsgKey(sessionId));
  },
};

export function extractPreview(text: string): string {
  const firstLine = text.split('\n')[0].trim();
  return firstLine.length > 80 ? firstLine.slice(0, 80) + '...' : firstLine;
}

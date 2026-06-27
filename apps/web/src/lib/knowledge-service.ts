import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

export interface KBRef {
  title: string;
  url: string;
}

export interface KBEntry {
  id: string;
  category: string;
  categoryName: string;
  section: string;
  sectionName: string;
  keywords: string[];
  intent: string;
  answer: string;
  refs?: KBRef[];
}

export class KnowledgeService {
  private entries: KBEntry[] = [];
  private initialized: boolean = false;
  private loadedPath: string = '';
  
  constructor() {}

  async init() {
    if (this.initialized) return;
    
    // Default to a relative path for local dev, or use KB_PATH env variable
    // We try multiple fallback paths for robust execution in different environments
    const fallbackPaths = [
      process.env.KB_PATH ? path.join(process.env.KB_PATH, 'knowledge') : '',
      path.join(process.cwd(), '../../../openstack-support/knowledge'), // monorepo local root
      path.join(process.cwd(), 'knowledge-base/knowledge'), // Docker fallback
      path.join(process.cwd(), '../knowledge-base/knowledge')
    ].filter(Boolean);

    let loaded = false;

    for (const kbPath of fallbackPaths) {
      if (loaded) break;
      try {
        if (fs.existsSync(kbPath)) {
          this.entries = [];
          const files = fs.readdirSync(kbPath);
          const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
          
          for (const file of yamlFiles) {
            const filePath = path.join(kbPath, file);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const parsed = yaml.parse(fileContent);
            
            if (parsed && parsed.categories) {
              for (const [catKey, catData] of Object.entries<any>(parsed.categories)) {
                if (catData.sections) {
                  for (const [secKey, secData] of Object.entries<any>(catData.sections)) {
                    if (secData.entries && Array.isArray(secData.entries)) {
                      for (const entry of secData.entries) {
                        this.entries.push({
                          id: entry.id,
                          category: catKey,
                          categoryName: catData.name,
                          section: secKey,
                          sectionName: secData.name,
                          keywords: entry.keywords || [],
                          intent: entry.intent || '',
                          answer: entry.answer || '',
                          refs: entry.refs || []
                        });
                      }
                    }
                  }
                }
              }
            }
          }
          this.initialized = true;
          loaded = true;
          this.loadedPath = kbPath;
          console.log(`[KnowledgeService] Loaded ${this.entries.length} knowledge entries from ${kbPath}`);
        }
      } catch (error) {
        console.error(`[KnowledgeService] Error loading knowledge base from ${kbPath}:`, error);
      }
    }

    if (!loaded) {
      console.warn('[KnowledgeService] Failed to load knowledge base from any known path.');
    }
  }

  async reload() {
    this.entries = [];
    this.initialized = false;
    this.loadedPath = '';
    await this.init();
  }

  getStats() {
    return {
      entries: this.entries.length,
      path: this.loadedPath,
      initialized: this.initialized,
    };
  }

  // Simple keyword matching search
  search(query: string, limit: number = 3): KBEntry[] {
    if (!this.initialized) {
      console.warn('[KnowledgeService] Service not initialized before search. Consider calling init() first.');
      // Cannot async init inside sync search, just return empty if not ready
      // We assume init() is called during server startup or in the route
      return [];
    }

    const normalizedQuery = query.toLowerCase();
    
    // Scoring entries based on keyword matches
    const scoredEntries = this.entries.map(entry => {
      let score = 0;
      for (const keyword of entry.keywords) {
        if (normalizedQuery.includes(keyword.toLowerCase())) {
          score += 10;
        }
      }
      // Bonus if category or section name matches
      if (normalizedQuery.includes(entry.categoryName.toLowerCase())) score += 2;
      
      return { entry, score };
    });
    
    // Sort by score descending and take top results
    return scoredEntries
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.entry);
  }
}

// Singleton instance
export const knowledgeService = new KnowledgeService();

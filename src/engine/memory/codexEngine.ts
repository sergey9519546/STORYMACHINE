import { GoogleGenAI } from "@google/genai";

/**
 * Represents a single entry in the Story Bible / Codex.
 */
export type CodexCategory = 'character' | 'location' | 'lore' | 'rule' | 'item' | 'event';

export interface CodexEntry {
  id: string;
  category: CodexCategory;
  title: string;
  content: string;
  keywords: string[];
  embedding?: number[]; // For future vector DB / dense retrieval integration
}

export interface RetrievalOptions {
  limit?: number;
  categories?: CodexCategory[];
  minScore?: number;
}

interface CachedTokens {
  titleTokens: string[];
  keywordsLower: string[];
  contentTokenSet: Set<string>;
}

/**
 * The CodexEngine acts as the RAG (Retrieval-Augmented Generation) memory system.
 * It stores the entire "Story Bible" and retrieves only the most relevant canon
 * for a given scene, preventing context window bloat and long-range drift.
 */
export class CodexEngine {
  private entries: Map<string, CodexEntry>;
  private tokenCache: Map<string, CachedTokens>;
  private ai?: GoogleGenAI;

  constructor(initialEntries: CodexEntry[] = [], apiKey?: string) {
    this.entries = new Map();
    this.tokenCache = new Map();
    initialEntries.forEach(entry => this.addEntrySync(entry));
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  private addEntrySync(entry: CodexEntry): void {
    this.entries.set(entry.id, entry);
    this.tokenCache.set(entry.id, {
      titleTokens: this.tokenize(entry.title),
      keywordsLower: entry.keywords.map(k => k.toLowerCase()),
      contentTokenSet: new Set(this.tokenize(entry.content)),
    });
  }

  /**
   * Ingests a new piece of lore into the Codex.
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    if (!this.ai) return [];
    try {
      const result = await this.ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: [text],
      });
      return result.embeddings?.[0]?.values || [];
    } catch (e) {
      console.error("Failed to generate embedding", e);
      return [];
    }
  }

  public async addEntry(entry: CodexEntry): Promise<void> {
    if (!entry.embedding && this.ai) {
      const textToEmbed = `${entry.title} ${entry.keywords.join(' ')} ${entry.content}`;
      const embedding = await this.generateEmbedding(textToEmbed);
      if (embedding.length > 0) {
        entry.embedding = embedding;
      }
    }
    this.addEntrySync(entry);
  }

  public removeEntry(id: string): void {
    this.entries.delete(id);
    this.tokenCache.delete(id);
  }

  public getEntry(id: string): CodexEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Retrieves the most relevant Codex entries based on a semantic or keyword query.
   * In a production environment, this would use cosine similarity on embeddings.
   * Here, we implement a robust keyword/TF-IDF-lite fallback for the pure TS engine.
   */
  public async retrieveRelevant(query: string, options: RetrievalOptions = {}): Promise<CodexEntry[]> {
    const limit = options.limit || 5;
    const categories = options.categories;
    const minScore = options.minScore || 0.1;

    let queryEmbedding: number[] | undefined;
    if (this.ai) {
      const embedding = await this.generateEmbedding(query);
      if (embedding.length > 0) {
        queryEmbedding = embedding;
      }
    }

    const queryTokens = this.tokenize(query);
    if (!queryEmbedding && queryTokens.length === 0) return [];

    const scoredEntries: { entry: CodexEntry; score: number }[] = [];

    for (const entry of this.entries.values()) {
      // Filter by category if specified
      if (categories && !categories.includes(entry.category)) {
        continue;
      }

      let score = 0;
      if (queryEmbedding && entry.embedding && entry.embedding.length > 0) {
        score = this.cosineSimilarity(queryEmbedding, entry.embedding);
        // Scale up embedding score to match keyword scoring scale roughly, or just use it directly
        // Cosine similarity is -1 to 1.
        if (score < minScore) continue;
      } else {
        score = this.calculateRelevanceScore(queryTokens, entry);
        if (score < minScore) continue;
      }

      scoredEntries.push({ entry, score });
    }

    // Sort by score descending and take the top N
    scoredEntries.sort((a, b) => b.score - a.score);
    return scoredEntries.slice(0, limit).map(se => se.entry);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Basic tokenization for the fallback retrieval system.
   */
  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(token => token.length > 2); // Ignore stop-word sized tokens for basic matching
  }

  /**
   * Calculates a relevance score based on keyword overlap and title matching.
   * If embeddings are present, this is where cosine similarity would be calculated.
   */
  private calculateRelevanceScore(queryTokens: string[], entry: CodexEntry): number {
    let score = 0;
    const cache = this.tokenCache.get(entry.id);
    const titleTokens = cache ? cache.titleTokens : this.tokenize(entry.title);
    const entryKeywords = cache ? cache.keywordsLower : entry.keywords.map(k => k.toLowerCase());
    const contentTokenSet = cache ? cache.contentTokenSet : new Set(this.tokenize(entry.content));

    // 1. Title Match (Highest Weight)
    for (const qt of queryTokens) {
      if (titleTokens.includes(qt)) score += 3.0;
    }

    // 2. Keyword Match (High Weight)
    for (const qt of queryTokens) {
      if (entryKeywords.some(k => k.includes(qt))) score += 2.0;
    }

    // 3. Content Match (Lower Weight, TF-lite)
    for (const qt of queryTokens) {
      if (contentTokenSet.has(qt)) score += 0.5;
    }

    return score;
  }
}

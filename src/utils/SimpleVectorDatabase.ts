import { IVectorDatabase, VectorSearchResult, ChunkEmbedding } from "./interfaces/IVectorDatabase";
import { IFileStore } from "./interfaces/IFileStore";
import { PdfChunk } from "./FoundryPdfChunker";

/**
 * Simple in-memory vector database implementation with file persistence
 * Uses cosine similarity for vector search
 */
export class SimpleVectorDatabase implements IVectorDatabase {
    private embeddings: Map<string, ChunkEmbedding> = new Map();
    private fileStore: IFileStore;
    private settingName: string;
    private campaignName: string;
    private manualType: 'player' | 'gm';

    constructor(fileStore: IFileStore, settingName: string, campaignName: string, manualType: 'player' | 'gm') {
        this.fileStore = fileStore;
        this.settingName = settingName;
        this.campaignName = campaignName;
        this.manualType = manualType;
    }

    private getVectorDbPath(): string {
        const campaignDir = this.fileStore.getCampaignDirectory(this.settingName, this.campaignName);
        return `${campaignDir}/${this.manualType}-manual-vectors.json`;
    }

    async loadFromDisk(): Promise<void> {
        try {
            const vectorDbPath = this.getVectorDbPath();
            if (await this.fileStore.fileExists(vectorDbPath)) {
                const data = await this.fileStore.loadFile(vectorDbPath);
                if (data) {
                    const embeddings: ChunkEmbedding[] = JSON.parse(data);
                    this.embeddings.clear();
                    for (const embedding of embeddings) {
                        this.embeddings.set(embedding.chunkId, embedding);
                    }
                }
            }
        } catch (error) {
            console.error("Error loading vector database:", error);
        }
    }

    async saveToDisk(): Promise<void> {
        try {
            const vectorDbPath = this.getVectorDbPath();
            const embeddingsArray = Array.from(this.embeddings.values());
            await this.fileStore.saveFile(vectorDbPath, JSON.stringify(embeddingsArray, null, 2));
        } catch (error) {
            console.error("Error saving vector database:", error);
        }
    }

    async addChunkEmbeddings(embeddings: ChunkEmbedding[]): Promise<void> {
        for (const embedding of embeddings) {
            this.embeddings.set(embedding.chunkId, embedding);
        }
        await this.saveToDisk();
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            throw new Error("Vectors must have the same length");
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (normA * normB);
    }

    async searchSimilar(queryEmbedding: number[], topK: number = 10, threshold: number = 0.3): Promise<VectorSearchResult[]> {
        const results: VectorSearchResult[] = [];

        for (const [chunkId, chunkEmbedding] of this.embeddings) {
            const similarity = this.cosineSimilarity(queryEmbedding, chunkEmbedding.embedding);
            
            if (similarity >= threshold) {
                results.push({
                    chunk: chunkEmbedding.chunk,
                    similarity,
                    embedding: chunkEmbedding.embedding
                });
            }
        }

        // Sort by similarity (descending) and return top K
        results.sort((a, b) => b.similarity - a.similarity);
        return results.slice(0, topK);
    }

    async getChunkEmbedding(chunkId: string): Promise<ChunkEmbedding | null> {
        return this.embeddings.get(chunkId) || null;
    }

    async removeChunkEmbeddings(chunkIds: string[]): Promise<void> {
        for (const chunkId of chunkIds) {
            this.embeddings.delete(chunkId);
        }
        await this.saveToDisk();
    }

    async clear(): Promise<void> {
        this.embeddings.clear();
        await this.saveToDisk();
    }

    async getCount(): Promise<number> {
        return this.embeddings.size;
    }
}

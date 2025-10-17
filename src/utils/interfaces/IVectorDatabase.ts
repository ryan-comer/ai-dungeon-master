import { PdfChunk } from "../../utils/FoundryPdfChunker";

export interface VectorSearchResult {
    chunk: PdfChunk;
    similarity: number;
    embedding?: number[];
}

export interface ChunkEmbedding {
    chunkId: string;
    embedding: number[];
    chunk: PdfChunk; // Store the full chunk for retrieval
}

export interface IVectorDatabase {
    /**
     * Add embeddings for chunks to the database
     */
    addChunkEmbeddings(embeddings: ChunkEmbedding[]): Promise<void>;
    
    /**
     * Search for similar chunks using a query embedding
     */
    searchSimilar(queryEmbedding: number[], topK?: number, threshold?: number): Promise<VectorSearchResult[]>;
    
    /**
     * Get embedding for a specific chunk ID
     */
    getChunkEmbedding(chunkId: string): Promise<ChunkEmbedding | null>;
    
    /**
     * Remove embeddings for specific chunks
     */
    removeChunkEmbeddings(chunkIds: string[]): Promise<void>;
    
    /**
     * Clear all embeddings
     */
    clear(): Promise<void>;
    
    /**
     * Get total number of embeddings stored
     */
    getCount(): Promise<number>;
}

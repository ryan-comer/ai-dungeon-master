export interface EmbeddingResult {
    embedding: number[];
    text: string;
    metadata?: Record<string, any>;
}

export interface IEmbeddingClient {
    /**
     * Generate embeddings for a single text
     */
    generateEmbedding(text: string, metadata?: Record<string, any>): Promise<EmbeddingResult>;
    
    /**
     * Generate embeddings for multiple texts in batch
     */
    generateEmbeddings(texts: string[], metadata?: Record<string, any>[]): Promise<EmbeddingResult[]>;
    
    /**
     * Get the dimension of the embeddings produced by this client
     */
    getDimension(): number;
}

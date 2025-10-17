import { IEmbeddingClient } from "../generation/clients/interfaces/IEmbeddingClient";
import { IVectorDatabase, ChunkEmbedding } from "../utils/interfaces/IVectorDatabase";
import { PdfChunk, ChunkedManual } from "../utils/FoundryPdfChunker";
import { IFileStore } from "../utils/interfaces/IFileStore";
import { ILogger } from "../utils/interfaces/ILogger";

export interface EmbeddingJobStatus {
    total: number;
    completed: number;
    inProgress: boolean;
    error?: string;
}

/**
 * Service to manage embeddings for PDF chunks
 * Handles creating, storing, and retrieving embeddings for the vector database
 */
export class EmbeddingService {
    private embeddingClient: IEmbeddingClient;
    private vectorDatabase: IVectorDatabase;
    private fileStore: IFileStore;
    private logger: ILogger;

    constructor(
        embeddingClient: IEmbeddingClient,
        vectorDatabase: IVectorDatabase,
        fileStore: IFileStore,
        logger: ILogger
    ) {
        this.embeddingClient = embeddingClient;
        this.vectorDatabase = vectorDatabase;
        this.fileStore = fileStore;
        this.logger = logger;
    }

    /**
     * Create embeddings for all chunks in a manual and store them in the vector database
     */
    async createEmbeddingsForManual(
        settingName: string,
        campaignName: string,
        manualType: 'player' | 'gm',
        onProgress?: (status: EmbeddingJobStatus) => void
    ): Promise<void> {
        this.logger.info(`Creating embeddings for ${manualType} manual`);

        // Load the chunked manual
        const campaignDir = this.fileStore.getCampaignDirectory(settingName, campaignName);
        const manualPath = `${campaignDir}/${manualType}-manual-chunks.json`;

        if (!(await this.fileStore.fileExists(manualPath))) {
            throw new Error(`Manual chunks not found: ${manualPath}`);
        }

        const manualContent = await this.fileStore.loadFile(manualPath);
        if (!manualContent) {
            throw new Error(`Failed to load manual: ${manualPath}`);
        }

        const chunkedManual: ChunkedManual = JSON.parse(manualContent);
        const chunks = chunkedManual.chunks;

        this.logger.info(`Creating embeddings for ${chunks.length} chunks`);

        const status: EmbeddingJobStatus = {
            total: chunks.length,
            completed: 0,
            inProgress: true
        };

        if (onProgress) {
            onProgress(status);
        }

        try {
            // Create embedding text for each chunk (title + content)
            const chunkTexts = chunks.map(chunk => 
                `${chunk.title}\n\n${chunk.content}`
            );

            // Generate embeddings in batches
            const embeddingResults = await this.embeddingClient.generateEmbeddings(chunkTexts);

            // Convert to ChunkEmbedding format
            const chunkEmbeddings: ChunkEmbedding[] = embeddingResults.map((result, index) => ({
                chunkId: chunks[index].id,
                embedding: result.embedding,
                chunk: chunks[index]
            }));

            // Store in vector database
            await this.vectorDatabase.addChunkEmbeddings(chunkEmbeddings);

            status.completed = chunks.length;
            status.inProgress = false;

            if (onProgress) {
                onProgress(status);
            }

            this.logger.info(`Successfully created embeddings for ${chunks.length} chunks`);

        } catch (error) {
            status.inProgress = false;
            status.error = error instanceof Error ? error.message : 'Unknown error';
            
            if (onProgress) {
                onProgress(status);
            }

            this.logger.error(`Error creating embeddings: ${error}`);
            throw error;
        }
    }

    /**
     * Search for relevant chunks using a text query
     */
    async searchRelevantChunks(
        query: string,
        topK: number = 10,
        threshold: number = 0.3
    ): Promise<Array<{ chunk: PdfChunk; similarity: number }>> {
        this.logger.info(`Searching for chunks with query: "${query}"`);

        console.log(`Searching for chunks with query: "${query}"`);

        // Generate embedding for the query
        const queryEmbedding = await this.embeddingClient.generateEmbedding(query);

        // Search the vector database
        const results = await this.vectorDatabase.searchSimilar(
            queryEmbedding.embedding,
            topK,
            threshold
        );

        console.log(`Found ${results.length} relevant chunks`);
        console.dir(results, { depth: 3 });

        this.logger.info(`Found ${results.length} relevant chunks`);

        return results.map(result => ({
            chunk: result.chunk,
            similarity: result.similarity
        }));
    }

    /**
     * Check if embeddings exist for a manual
     */
    async hasEmbeddings(): Promise<boolean> {
        const count = await this.vectorDatabase.getCount();
        return count > 0;
    }

    /**
     * Clear all embeddings
     */
    async clearEmbeddings(): Promise<void> {
        await this.vectorDatabase.clear();
        this.logger.info("Cleared all embeddings");
    }

    /**
     * Get embedding statistics
     */
    async getEmbeddingStats(): Promise<{ count: number; dimension: number }> {
        const count = await this.vectorDatabase.getCount();
        const dimension = this.embeddingClient.getDimension();
        return { count, dimension };
    }
}

import { PdfChunk, ChunkedManual } from "../utils/FoundryPdfChunker";
import { IFileStore } from "../utils/interfaces/IFileStore";
import { ITextGenerationClient } from "../generation/clients/interfaces/ITextGenerationClient";
import { Schema, Type } from "@google/genai";
import { EmbeddingService } from "../core/EmbeddingService";

export interface ManualSearchResult {
    chunks: PdfChunk[];
    totalMatches: number;
    searchQuery: string;
    manualType: 'player' | 'gm';
}

export type ManualType = 'player' | 'gm';

interface ChunkRankingResponse {
    response: string[];
}

const CHUNK_RANKING_SCHEMA: Schema = {
    type: Type.OBJECT,
    properties: {
        response: {
            type: Type.ARRAY,
            items: {
                type: Type.STRING
            },
            description: "Array of chunk IDs ordered by relevance to the search query"
        }
    },
    required: ["response"]
};

/**
 * Unified RAG Tool for searching through manual chunks (both Player and GM manuals)
 * This provides the search functionality that can be called by Google's function calling
 */
export class ManualSearcher {
    private fileStore: IFileStore;
    private playerEmbeddingService?: EmbeddingService;
    private gmEmbeddingService?: EmbeddingService;

    constructor(fileStore: IFileStore, playerEmbeddingService?: EmbeddingService, gmEmbeddingService?: EmbeddingService) {
        this.fileStore = fileStore;
        this.playerEmbeddingService = playerEmbeddingService;
        this.gmEmbeddingService = gmEmbeddingService;
    }

    async searchPlayerManual(
        searchQuery: string, 
        settingName: string, 
        campaignName: string,
        textGenerationClient: ITextGenerationClient
    ): Promise<ManualSearchResult> {
        return this.searchManual(searchQuery, settingName, campaignName, textGenerationClient, 'player');
    }

    async searchGMManual(
        searchQuery: string, 
        settingName: string, 
        campaignName: string,
        textGenerationClient: ITextGenerationClient
    ): Promise<ManualSearchResult> {
        return this.searchManual(searchQuery, settingName, campaignName, textGenerationClient, 'gm');
    }

    private async searchManual(
        searchQuery: string, 
        settingName: string, 
        campaignName: string,
        textGenerationClient: ITextGenerationClient,
        manualType: ManualType
    ): Promise<ManualSearchResult> {
        // First try vector search if embedding service is available
        const embeddingService = manualType === 'player' ? this.playerEmbeddingService : this.gmEmbeddingService;
        
        if (embeddingService && await embeddingService.hasEmbeddings()) {
            console.log(`Using vector search for ${manualType} manual with query: "${searchQuery}"`);
            try {
                const vectorResults = await embeddingService.searchRelevantChunks(searchQuery, 10, 0.3);

                console.log(`Found ${vectorResults.length} relevant chunks via vector search`);
                console.dir(vectorResults, { depth: 3 });
                
                if (vectorResults.length > 0) {
                    return {
                        chunks: vectorResults.map(result => result.chunk),
                        totalMatches: vectorResults.length,
                        searchQuery,
                        manualType
                    };
                }
            } catch (error) {
                console.warn("Vector search failed, falling back to keyword search:", error);
            }
        }

        // Fallback to original keyword-based search
        console.log(`Falling back to keyword-based search for ${manualType} manual with query: "${searchQuery}"`);
        const campaignDir = this.fileStore.getCampaignDirectory(settingName, campaignName);
        const manualPath = `${campaignDir}/${manualType}-manual-chunks.json`;

        if (!(await this.fileStore.fileExists(manualPath))) {
            return {
                chunks: [],
                totalMatches: 0,
                searchQuery,
                manualType
            };
        }

        const manualContent = await this.fileStore.loadFile(manualPath);
        if (!manualContent) {
            return {
                chunks: [],
                totalMatches: 0,
                searchQuery,
                manualType
            };
        }
        const chunkedManual: ChunkedManual = JSON.parse(manualContent);
        
        // Perform semantic search through chunks
        const relevantChunks = await this.searchChunks(chunkedManual.chunks, searchQuery, textGenerationClient);

        console.log(`Found ${relevantChunks.length} relevant chunks via keyword search`);
        
        return {
            chunks: relevantChunks,
            totalMatches: relevantChunks.length,
            searchQuery,
            manualType
        };
    }

    /**
     * Search through chunks using LLM-based semantic similarity
     */
    private async searchChunks(chunks: PdfChunk[], query: string, textGenerationClient: ITextGenerationClient): Promise<PdfChunk[]> {
        // First pass: keyword filtering for efficiency
        const keywordFiltered = this.filterChunksByKeywords(chunks, query);
        
        // If we have too many chunks, use LLM to rank them
        if (keywordFiltered.length > 20) {
            const rankedChunks = await this.rankChunksWithLLM(keywordFiltered.slice(0, 50), query, textGenerationClient);
            return rankedChunks.slice(0, 10); // Return top 10 most relevant
        }
        
        return keywordFiltered.slice(0, 10);
    }

    /**
     * Filter chunks using keyword matching as a first pass
     */
    private filterChunksByKeywords(chunks: PdfChunk[], query: string): PdfChunk[] {
        const queryWords = query.toLowerCase().split(/\s+/);
        const results: { chunk: PdfChunk, score: number }[] = [];

        for (const chunk of chunks) {
            let score = 0;
            const searchableText = `${chunk.title} ${chunk.path.join(' ')} ${chunk.content}`.toLowerCase();
            
            // Count keyword matches
            for (const word of queryWords) {
                const matches = (searchableText.match(new RegExp(word, 'gi')) || []).length;
                score += matches;
            }
            
            // Boost score for title matches
            if (chunk.title.toLowerCase().includes(query.toLowerCase())) {
                score += 10;
            }
            
            if (score > 0) {
                results.push({ chunk, score });
            }
        }

        // Sort by score and return chunks
        results.sort((a, b) => b.score - a.score);
        return results.map(r => r.chunk);
    }

    /**
     * Use LLM to rank chunks by relevance to the query
     */
    private async rankChunksWithLLM(chunks: PdfChunk[], query: string, textGenerationClient: ITextGenerationClient): Promise<PdfChunk[]> {
        const chunkSummaries = chunks.map(chunk => ({
            id: chunk.id,
            title: chunk.title,
            path: chunk.path.join(' > '),
            preview: chunk.content.substring(0, 200) + (chunk.content.length > 200 ? '...' : '')
        }));

        const rankingPrompt = `
Given the following search query and list of document chunks, rank them by relevance to the query.
Return only the chunk IDs in order of relevance (most relevant first).

Search Query: "${query}"

Chunks to rank:
${chunkSummaries.map((chunk, idx) => `${idx + 1}. ID: ${chunk.id}
   Title: ${chunk.title}
   Path: ${chunk.path}
   Preview: ${chunk.preview}`).join('\n\n')}

Return the chunk IDs as a JSON object with a "response" field containing an array of strings, ordered by relevance:
{"response": ["chunk_id_1", "chunk_id_2", "chunk_id_3", ...]}
`;

        try {
            const rankedIdsResponse = await textGenerationClient.generateText<ChunkRankingResponse>(
                rankingPrompt,
                undefined,
                { model: 'gemini-2.5-flash-lite' },
                undefined,
                CHUNK_RANKING_SCHEMA
            );
            // Get the ranked IDs from the response
            const rankedIds = rankedIdsResponse.response;
            
            // Return chunks in the ranked order
            const rankedChunks: PdfChunk[] = [];
            for (const id of rankedIds) {
                const chunk = chunks.find(c => c.id === id);
                if (chunk) {
                    rankedChunks.push(chunk);
                }
            }
            
            // Add any chunks that weren't ranked at the end
            for (const chunk of chunks) {
                if (!rankedChunks.find(c => c.id === chunk.id)) {
                    rankedChunks.push(chunk);
                }
            }
            
            return rankedChunks;
        } catch (error) {
            console.warn("Failed to rank chunks with LLM, falling back to keyword ranking", error);
            return chunks; // Fallback to original order
        }
    }
}

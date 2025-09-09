import { PdfChunk, ChunkedManual } from "../utils/FoundryPdfChunker";
import { IFileStore } from "../utils/interfaces/IFileStore";
import { ITextGenerationClient } from "../generation/clients/interfaces/ITextGenerationClient";
import * as fs from "fs";
import * as path from "path";

export interface ManualSearchResult {
    chunks: PdfChunk[];
    totalMatches: number;
    searchQuery: string;
    manualType: 'player' | 'gm';
}

export type ManualType = 'player' | 'gm';

/**
 * Unified RAG Tool for searching through manual chunks (both Player and GM manuals)
 * This provides the search functionality that can be called by Google's function calling
 */
export class ManualSearcher {
    private fileStore: IFileStore;

    constructor(fileStore: IFileStore) {
        this.fileStore = fileStore;
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
        // Load manual chunks based on type
        const campaignDir = this.fileStore.getCampaignDirectory(settingName, campaignName);
        const manualPath = path.join(campaignDir, `${manualType}-manual-chunks.json`);

        if (!fs.existsSync(manualPath)) {
            return {
                chunks: [],
                totalMatches: 0,
                searchQuery,
                manualType
            };
        }

        const chunkedManual: ChunkedManual = JSON.parse(fs.readFileSync(manualPath, 'utf-8'));
        
        // Perform semantic search through chunks
        const relevantChunks = await this.searchChunks(chunkedManual.chunks, searchQuery, textGenerationClient);
        
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

Return the chunk IDs as a JSON array of strings, ordered by relevance:
`;

        try {
            const rankedIdsResponse = await textGenerationClient.generateText<string>(rankingPrompt);
            // Parse the response to get the ranked IDs
            const rankedIds = JSON.parse(rankedIdsResponse) as string[];
            
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

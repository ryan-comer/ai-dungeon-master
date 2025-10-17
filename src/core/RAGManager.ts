import { GoogleClient, FunctionCall } from "../generation/clients/GoogleClient";
import { Tool, FunctionDeclaration, Type } from "@google/genai";
import { ManualSearcher, ManualSearchResult } from "../tools/ManualSearcher";
import { IFileStore } from "../utils/interfaces/IFileStore";
import { ILogger } from "../utils/interfaces/ILogger";
import { EmbeddingService } from "./EmbeddingService";

export interface RAGResponse {
    finalResponse: string;
    searchResults?: ManualSearchResult[];
    functionCallsUsed?: FunctionCall[];
}

/**
 * RAG Manager that integrates with Google's function calling to search manuals
 * and provide context-aware responses
 */
export class RAGManager {
    private googleClient: GoogleClient;
    private manualSearcher: ManualSearcher;
    private fileStore: IFileStore;
    private logger: ILogger;

    // Function declarations for Google's function calling
    private playerManualSearchDeclaration: FunctionDeclaration = {
        name: "search_player_manual",
        description: "Search through the player manual for rules, character creation, spells, equipment, classes, races, and other player-facing content. Use this when you need information that would be in a player handbook or manual.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                searchQuery: {
                    type: Type.STRING,
                    description: "The search query describing what information you need from the player manual. Be specific and include relevant keywords."
                }
            },
            required: ["searchQuery"]
        }
    };

    private gmManualSearchDeclaration: FunctionDeclaration = {
        name: "search_gm_manual",
        description: "Search through the GM manual for running the game, NPCs, monsters, adventures, campaign advice, and other GM-facing content. Use this when you need information that would be in a dungeon master's guide or GM manual.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                searchQuery: {
                    type: Type.STRING,
                    description: "The search query describing what information you need from the GM manual. Be specific and include relevant keywords."
                }
            },
            required: ["searchQuery"]
        }
    };

    constructor(
        googleClient: GoogleClient,
        fileStore: IFileStore,
        logger: ILogger,
        playerEmbeddingService?: EmbeddingService,
        gmEmbeddingService?: EmbeddingService
    ) {
        this.googleClient = googleClient;
        this.fileStore = fileStore;
        this.logger = logger;
        console.log("RAG Manager constructor - Player embedding service:", playerEmbeddingService ? 'available' : 'null', ", GM embedding service:", gmEmbeddingService ? 'available' : 'null');
        this.manualSearcher = new ManualSearcher(fileStore, playerEmbeddingService, gmEmbeddingService);
    }

    /**
     * Update the manual searcher with new embedding services
     */
    updateManualSearcher(
        playerEmbeddingService?: EmbeddingService,
        gmEmbeddingService?: EmbeddingService
    ): void {
        this.logger.info(`Updating RAG manager's ManualSearcher with embedding services - Player: ${playerEmbeddingService ? 'available' : 'null'}, GM: ${gmEmbeddingService ? 'available' : 'null'}`);
        this.manualSearcher = new ManualSearcher(this.fileStore, playerEmbeddingService, gmEmbeddingService);
        this.logger.info("RAG manager's ManualSearcher updated successfully");
    }



    /**
     * Generate a response with RAG capabilities
     * The LLM will decide when to search the manuals and use that information
     */
    async generateWithRAG(
        prompt: string,
        settingName: string,
        campaignName: string,
        chatHistory?: string[]
    ): Promise<RAGResponse> {
        const tools: Tool[] = [{
            functionDeclarations: [
                this.playerManualSearchDeclaration,
                this.gmManualSearchDeclaration
            ]
        }];

        const allSearchResults: ManualSearchResult[] = [];
        const allFunctionCalls: FunctionCall[] = [];
        let conversationHistory = [...(chatHistory || [])];
        let maxIterations = 5; // Prevent infinite loops

        while (maxIterations > 0) {
            try {
                const result = await this.googleClient.generateWithTools<string>(
                    prompt,
                    tools,
                    conversationHistory
                );

                // If there are function calls, execute them
                if (result.functionCalls.length > 0) {
                    this.logger.info(`RAG: Executing ${result.functionCalls.length} function calls`);
                    
                    // Execute all function calls
                    const functionResponses: string[] = [];
                    for (const functionCall of result.functionCalls) {
                        allFunctionCalls.push(functionCall);
                        
                        try {
                            let searchResult: ManualSearchResult;
                            
                            if (functionCall.name === "search_player_manual") {
                                searchResult = await this.manualSearcher.searchPlayerManual(
                                    functionCall.args.searchQuery,
                                    settingName,
                                    campaignName,
                                    this.googleClient
                                );
                            } else if (functionCall.name === "search_gm_manual") {
                                searchResult = await this.manualSearcher.searchGMManual(
                                    functionCall.args.searchQuery,
                                    settingName,
                                    campaignName,
                                    this.googleClient
                                );
                            } else {
                                throw new Error(`Unknown function: ${functionCall.name}`);
                            }

                            allSearchResults.push(searchResult);

                            // Format the search results for the LLM
                            const formattedResults = this.formatSearchResults(searchResult);
                            functionResponses.push(`Function ${functionCall.name} returned:\n${formattedResults}`);

                        } catch (error) {
                            this.logger.error(`Error executing function ${functionCall.name}:`, error);
                            functionResponses.push(`Function ${functionCall.name} failed: ${error}`);
                        }
                    }

                    // Add function call and response to conversation history
                    const functionCallsText = result.functionCalls.map(fc => 
                        `Function Call: ${fc.name}(${JSON.stringify(fc.args)})`
                    ).join('\n');

                    conversationHistory.push(`Assistant: ${functionCallsText} ${functionResponses.join('\n\n')} `);

                    // Continue the conversation with the function results
                    prompt = "Based on the search results above, continue the conversation. Don't say things out of character, just use the information to inform your next response.";
                    
                } else {
                    // No more function calls, return the final response
                    return {
                        finalResponse: result.response || "I couldn't generate a response.",
                        searchResults: allSearchResults,
                        functionCallsUsed: allFunctionCalls
                    };
                }

            } catch (error) {
                this.logger.error("Error in RAG generation:", error);
                throw error;
            }

            maxIterations--;
        }

        throw new Error("RAG generation exceeded maximum iterations");
    }

    /**
     * Format search results for the LLM
     */
    private formatSearchResults(searchResult: ManualSearchResult): string {
        if (searchResult.chunks.length === 0) {
            return `No relevant information found in the ${searchResult.manualType} manual for query: "${searchResult.searchQuery}"`;
        }

        let formatted = `Found ${searchResult.totalMatches} relevant sections in the ${searchResult.manualType} manual for query: "${searchResult.searchQuery}"\n\n`;
        
        for (let i = 0; i < searchResult.chunks.length; i++) {
            const chunk = searchResult.chunks[i];
            formatted += `## ${chunk.title}\n`;
            formatted += `**Path:** ${chunk.path.join(' > ')}\n`;
            formatted += `**Page:** ${chunk.startPage}${chunk.endPage !== chunk.startPage ? `-${chunk.endPage}` : ''}\n\n`;
            formatted += chunk.content + '\n\n';
            
            if (i < searchResult.chunks.length - 1) {
                formatted += '---\n\n';
            }
        }

        return formatted;
    }

    /**
     * Get the available RAG tools for manual function calling setup
     */
    getRAGTools(): Tool[] {
        return [{
            functionDeclarations: [
                this.playerManualSearchDeclaration,
                this.gmManualSearchDeclaration
            ]
        }];
    }

    /**
     * Execute a specific RAG function call (for manual orchestration)
     */
    async executeFunctionCall(
        functionCall: FunctionCall,
        settingName: string,
        campaignName: string
    ): Promise<ManualSearchResult> {
        if (functionCall.name === "search_player_manual") {
            return await this.manualSearcher.searchPlayerManual(
                functionCall.args.searchQuery,
                settingName,
                campaignName,
                this.googleClient
            );
        } else if (functionCall.name === "search_gm_manual") {
            return await this.manualSearcher.searchGMManual(
                functionCall.args.searchQuery,
                settingName,
                campaignName,
                this.googleClient
            );
        } else {
            throw new Error(`Unknown function: ${functionCall.name}`);
        }
    }
}

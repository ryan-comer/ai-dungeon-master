import { IEmbeddingClient, EmbeddingResult } from "./interfaces/IEmbeddingClient";
import { GoogleGenAI } from "@google/genai";

export class GeminiEmbeddingClient implements IEmbeddingClient {
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = "gemini-embedding-001") {
        this.apiKey = apiKey;
        this.model = model;
    }

    async generateEmbedding(text: string, metadata?: Record<string, any>): Promise<EmbeddingResult> {
        try {
            // Use the embeddings API directly
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:embedContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: {
                        parts: [{ text }]
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Embedding API error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            
            return {
                embedding: result.embedding.values,
                text,
                metadata
            };
        } catch (error) {
            console.error("Error generating embedding:", error);
            throw error;
        }
    }

    async generateEmbeddings(texts: string[], metadata?: Record<string, any>[]): Promise<EmbeddingResult[]> {
        const results: EmbeddingResult[] = [];
        
        // Process in batches to avoid rate limits
        const batchSize = 10;
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const batchMetadata = metadata ? metadata.slice(i, i + batchSize) : undefined;
            
            const batchPromises = batch.map((text, index) => 
                this.generateEmbedding(text, batchMetadata ? batchMetadata[index] : undefined)
            );
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Add small delay between batches to respect rate limits
            if (i + batchSize < texts.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return results;
    }

    getDimension(): number {
        // gemini-embedding-001 produces 768-dimensional vectors
        return 768;
    }
}

import { Schema } from '@google/genai';

interface ITextGenerationClient {
    /**
     * Generate text or structured output based on optional JSON schema.
     * When schema is provided, include responseSchema and responseMimeType in optionsOverride.
     */
    generateText<T = string>(
        prompt: string,
        chatHistory?: string[],
        optionsOverride?: any,
        image?: string,
        schema?: Schema
    ): Promise<T>;
    /**
     * Free any resources if needed.
     */
    unloadModel(): Promise<void>;
}

export { ITextGenerationClient };
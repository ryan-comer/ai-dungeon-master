import { ITextGenerationClient } from "./interfaces/ITextGenerationClient";
import { TryParseJson } from "./utils";
import OpenAI from "openai";
import { Schema } from '@google/genai';

class OpenAIClient implements ITextGenerationClient {
    private openai: OpenAI;
    private model: string;

    constructor(apiKey: string, model: string = "gpt-4o") {
        this.openai = new OpenAI({
            apiKey: apiKey
        });
        this.model = model;
    }

    async generateText<T = string>(
        prompt: string,
        chatHistory?: string[],
        optionsOverride?: any,
        image?: string,
        schema?: Schema
    ): Promise<T> {
        // raw text client: ignore chatHistory, image, and schema
        const response = await this.openai.chat.completions.create({
            model: this.model,
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            ...optionsOverride
        })

        // Check if the message has content
        if (!response.choices[0].message.content) {
            throw new Error("Failed to generate text");
        }

        let text = response.choices[0].message.content;

        return text as unknown as T;
    }

    async unloadModel(): Promise<void> {
        // No need to unload the model
    }
}

export { OpenAIClient };
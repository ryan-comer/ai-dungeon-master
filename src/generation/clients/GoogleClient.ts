import { ITextGenerationClient } from "./interfaces/ITextGenerationClient";
import { GoogleGenAI, Schema, Tool, FunctionDeclaration, Part } from "@google/genai";

export interface FunctionCall {
    name: string;
    args: Record<string, any>;
}

export interface GenerateTextOptions {
    tools?: Tool[];
    functionDeclarations?: FunctionDeclaration[];
    toolConfig?: any;
    automaticFunctionCalling?: boolean;
    [key: string]: any;
}

class GoogleClient implements ITextGenerationClient {

    private genAI: GoogleGenAI;
    private apiKey: string;
    private model: string;
    private options: any;

    constructor(apiKey: string, model: string = "gemini-2.5-flash", options?: any) {
        this.apiKey = apiKey;
        this.genAI = new GoogleGenAI({apiKey});
        this.model = model;
        this.options = options || {};
    }

    async generateText<T = any>(
        prompt: string,
        chatHistory?: string[],
        optionsOverride?: any,
        image?: string,
        schema?: Schema
    ): Promise<T> {
        const history = chatHistory ? chatHistory.map((message, index) => {
            return {
                role: index % 2 === 0 ? "user" : "model",
                parts: [{ text: message }]
            };
        }) : [];

        const chat = this.genAI.chats.create({
            model: optionsOverride?.model ? optionsOverride.model : this.model,
            history: history
        });

        const message: any = {
            role: "user",
            parts: [{ text: prompt }]
        };

        if (image) {
            message.parts.push({
                inlineData: {
                    data: image,
                    mimeType: 'image/png'
                }
            });
        }

        let retryCount: number = optionsOverride?.retryCount || 3;
        let response: any;
        while (retryCount > 0) {
            try {
                // Prepare config, including structured output if schema provided
                const config: any = { ...(optionsOverride || {}) };
                if (schema) {
                    config.responseMimeType = 'application/json';
                    config.responseSchema = schema;
                }
                
                // Add tools/function declarations if provided
                if (optionsOverride?.tools) {
                    config.tools = optionsOverride.tools;
                }
                if (optionsOverride?.functionDeclarations) {
                    config.tools = config.tools || [];
                    config.tools.push({ function_declarations: optionsOverride.functionDeclarations });
                }
                if (optionsOverride?.toolConfig) {
                    config.toolConfig = optionsOverride.toolConfig;
                }
                
                response = await chat.sendMessage({
                    message: message,
                    config
                });
            } catch (error) {
                console.error(`Error generating text: ${error}`);
                retryCount--;
                continue;
            }

            break;
        }

        if (
            !response.candidates ||
            response.candidates.length === 0 ||
            !response.candidates[0].content ||
            !response.candidates[0].content.parts ||
            response.candidates[0].content.parts.length === 0
        ) {
            throw new Error(`Error generating text`);
        }
        
        // Check if the response contains function calls
        const parts = response.candidates[0].content.parts;
        for (const part of parts) {
            if (part.functionCall && part.functionCall.name) {
                // Return function call information if present
                return {
                    functionCall: {
                        name: part.functionCall.name,
                        args: part.functionCall.args || {}
                    }
                } as T;
            }
        }
        
        // Otherwise, process text response
        if (!parts[0].text) {
            throw new Error(`Error generating text - no text or function call found`);
        }
        
        const raw = parts[0].text;
        // If a schema was provided, parse structured JSON
        if (schema) {
            try {
                return JSON.parse(raw) as T;
            } catch (e) {
                throw new Error(`Failed to parse structured output: ${e}`);
            }
        }
        // Otherwise, return raw text
        return raw as unknown as T;
    }

    /**
     * Generate text with function calling support
     */
    async generateWithTools<T = any>(
        prompt: string,
        tools: Tool[],
        chatHistory?: string[],
        optionsOverride?: GenerateTextOptions,
        schema?: Schema
    ): Promise<{ response: T | null; functionCalls: FunctionCall[] }> {
        const history = chatHistory ? chatHistory.map((message, index) => {
            return {
                role: index % 2 === 0 ? "user" : "model",
                parts: [{ text: message }]
            };
        }) : [];

        const chat = this.genAI.chats.create({
            model: optionsOverride?.model ? optionsOverride.model : this.model,
            history: history
        });

        const message: any = {
            role: "user",
            parts: [{ text: prompt }]
        };

        const config: any = { ...(optionsOverride || {}) };
        config.tools = tools;
        
        if (optionsOverride?.toolConfig) {
            config.toolConfig = optionsOverride.toolConfig;
        }

        if (schema) {
            config.responseSchema = schema;
        }

        const response = await chat.sendMessage({
            message: message,
            config
        });

        if (
            !response.candidates ||
            response.candidates.length === 0 ||
            !response.candidates[0].content ||
            !response.candidates[0].content.parts ||
            response.candidates[0].content.parts.length === 0
        ) {
            throw new Error(`Error generating text with tools`);
        }

        const parts = response.candidates[0].content.parts;
        const functionCalls: FunctionCall[] = [];
        let textResponse: T | null = null;

        // Check all parts for function calls or text
        for (const part of parts) {
            if (part.functionCall && part.functionCall.name) {
                functionCalls.push({
                    name: part.functionCall.name,
                    args: part.functionCall.args || {}
                });
            } else if (part.text) {
                if (schema) {
                    // If schema is provided, parse the JSON response
                    try {
                        // Remove markdown code block formatting if present
                        let jsonText = part.text.trim();
                        if (jsonText.startsWith('```json')) {
                            jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                        } else if (jsonText.startsWith('```')) {
                            jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
                        }
                        textResponse = JSON.parse(jsonText) as T;
                    } catch (error) {
                        // Fallback to text if JSON parsing fails
                        console.error(`Failed to parse structured output: ${error}`);
                        textResponse = part.text as T;
                    }
                } else {
                    textResponse = part.text as T;
                }
            }
        }

        return {
            response: textResponse,
            functionCalls
        };
    }

    async unloadModel(): Promise<void> {
        return
    }
}

export { GoogleClient };
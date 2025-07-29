import { ITextGenerationClient } from "./interfaces/ITextGenerationClient";
import { GoogleGenAI } from "@google/genai";

class GoogleClient implements ITextGenerationClient {

    private genAI: GoogleGenAI;
    private apiKey: string;
    private model: string;
    private options: any;

    constructor(apiKey: string, model: string = "gemini-2.5-flash-preview-04-17", options?: any) {
        this.apiKey = apiKey;
        this.genAI = new GoogleGenAI({apiKey});
        this.model = model;
        this.options = options || {};
    }

    async generateText(prompt: string, chatHistory?: string[], optionsOverride?: any, image?: string): Promise<string> {
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
                response = await chat.sendMessage({
                    message: message,
                    config: {
                        ...optionsOverride
                    }
                });
            } catch (error) {
                console.error(`Error generating text: ${error}`);
                retryCount--;
                continue;
            }

            break;
        }

        if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content 
            || !response.candidates[0].content.parts || response.candidates[0].content.parts.length === 0 
            || !response.candidates[0].content.parts[0].text) {
            throw new Error(`Error generating text`);
        }

        return response.candidates[0].content.parts[0].text;
    }

    async unloadModel(): Promise<void> {
        return
    }
}

export { GoogleClient };
import { ITextGenerationClient } from "./interfaces/ITextGenerationClient";
import { GoogleGenAI } from "@google/genai";

class GoogleClient implements ITextGenerationClient {

    private genAI: GoogleGenAI;
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = "gemini-2.0-flash") {
        this.apiKey = apiKey;
        this.genAI = new GoogleGenAI({apiKey});
        this.model = model;
    }

    async generateText(prompt: string, chatHistory?: string[], optionsOverride?: any, image?: string): Promise<string> {
        const history = chatHistory ? chatHistory.map((message, index) => {
            return {
                role: index % 2 === 0 ? "user" : "model",
                parts: [{ text: message }]
            };
        }) : [];

        const chat = this.genAI.chats.create({
            model: this.model,
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

        const response = await chat.sendMessage({
            message: message,
            config: {
                ...optionsOverride
            }
        });

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
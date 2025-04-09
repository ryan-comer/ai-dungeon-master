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

    async generateText(prompt: string, chatHistory?: string[], optionsOverride?: any): Promise<string> {
        const history = chatHistory ? chatHistory.map((message, index) => {
            return {
                role: index % 2 === 0 ? "user" : "model",
                parts: [{text: message}]
            };
        }) : [];

        const chat = this.genAI.chats.create({
            model: this.model,
            history: history
        });

        const response = await chat.sendMessage({
            message: prompt,
            config: {
                ...optionsOverride
            }
        })

        if (response.text) {
            return response.text;
        } else {
            throw new Error("No text generated");
        }
    }

    async unloadModel(): Promise<void> {
        return
    }
}

export { GoogleClient };
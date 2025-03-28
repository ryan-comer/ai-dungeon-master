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

    async generateText(prompt: string, optionsOverride?: any): Promise<string> {
        const response = await this.genAI.models.generateContent({
            model: this.model,
            contents: prompt,
            ...optionsOverride
        });

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
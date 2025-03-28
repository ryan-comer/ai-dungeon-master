import { ITextGenerationClient } from "./interfaces/ITextGenerationClient";
import ollama from "ollama";

class OllamaClient implements ITextGenerationClient {

    private model: string;

    //constructor(model: string = "gemma3:27b") {
    constructor(model: string = "gemma3:12b") {
        this.model = model;
    }

    async generateText(prompt: string, optionsOverride?: any): Promise<string> {
        while (true) {
            try {
                const response = await ollama.chat({
                    model: this.model,
                    messages: [{
                        role: 'user',
                        content: prompt
                    }],
                    options: {
                        //num_ctx: 2500,
                        num_ctx: 15000,
                        //temperature: 1.0
                        ...optionsOverride
                    }
                })

                return response.message.content
            } catch (e) {
                console.error("Error generating text:", e)
            }

            // Sleep for a second before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    async unloadModel(): Promise<void> {
        await ollama.generate({
            prompt: "unload",
            model: this.model,
            keep_alive: 0
        });
    }
}

export { OllamaClient };
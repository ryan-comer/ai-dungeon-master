import { ITextGenerationClient } from "./interfaces/ITextGenerationClient";

class OllamaClient implements ITextGenerationClient {

    private url: string;
    private model: string;

    constructor(url: string = "http://localhost:11434", model: string = "gemma3:12b") {
        this.url = url;
        this.model = model;
    }

    async generateText(prompt: string): Promise<string> {
        const response = await fetch(`${this.url}/api/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: this.model,
                prompt: prompt,
                stream: true,
                options: {
                    temperature: 1.0,
                    top_k: 64,
                    min_p: 0.0,
                    top_p: 0.95,
                    repeat_penalty: 1.0,
                    seed: Math.floor(Math.random() * 1000000),
                    num_ctx: 16000
                }
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to generate text: ${response.statusText}`);
        }

        /*
        const data = await response.json();
        const responseText = data.response;

        // Strip anything before the first { and after the last }
        const firstBracket = responseText.indexOf("{");
        const lastBracket = responseText.lastIndexOf("}");
        return responseText.substring(firstBracket, lastBracket + 1);
        */

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error("Failed to read response body");
        }

        let finalText = "";
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const response = JSON.parse(decoder.decode(value, { stream: false }));
            finalText += response.response;
        }

        // Strip anything before the first { and after the last }
        const firstBracket = finalText.indexOf("{");
        const lastBracket = finalText.lastIndexOf("}");
        finalText = finalText.substring(firstBracket, lastBracket + 1);

        return finalText
    }
}

export { OllamaClient };
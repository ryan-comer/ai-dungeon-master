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

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error("Failed to read response body");
        }

        let finalText = "";
        let buffer = ""; // Buffer to accumulate chunks
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Attempt to parse JSON from the buffer
            let boundary = buffer.lastIndexOf("}");
            if (boundary !== -1) {
                const validChunk = buffer.substring(0, boundary + 1);
                buffer = buffer.substring(boundary + 1); // Keep the remaining incomplete part

                try {
                    const response = JSON.parse(validChunk);
                    finalText += response.response;
                } catch (e) {
                    console.error("Failed to parse JSON chunk:", e);
                }
            }
        }

        // Strip anything before the first { and after the last }
        const firstBracket = finalText.indexOf("{");
        const lastBracket = finalText.lastIndexOf("}");
        finalText = finalText.substring(firstBracket, lastBracket + 1);

        console.log(finalText);

        return finalText
    }
}

export { OllamaClient };
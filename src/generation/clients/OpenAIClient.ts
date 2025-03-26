import { ITextGenerationClient } from "./interfaces/ITextGenerationClient";
import { TryParseJson } from "./utils";
import OpenAI from "openai";

class OpenAIClient implements ITextGenerationClient {
    private openai: OpenAI;

    constructor(apiKey: string) {
        this.openai = new OpenAI({
            apiKey: apiKey
        });
    }

    async generateText(prompt: string): Promise<string> {
        const response = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant."
                },
                {
                    role: "user",
                    content: prompt
                }
            ]
        })

        // Check if the message has content
        if (!response.choices[0].message.content) {
            throw new Error("Failed to generate text");
        }

        let text = response.choices[0].message.content;
        text = TryParseJson(text, true);
        console.log(text);

        return text
    }
}

export { OpenAIClient };
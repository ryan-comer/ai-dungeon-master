import { ITool } from "../../../tools/interfaces/ITool";

interface ITextGenerationClient {
    generateText(prompt: string, chatHistory?: string[], optionsOverride?: any, image?: string): Promise<string>;
    unloadModel(): Promise<void>;
}

export { ITextGenerationClient };
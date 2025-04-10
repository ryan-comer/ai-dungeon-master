import { ITool } from "../../../tools/interfaces/ITool";

interface ITextGenerationClient {
    generateText(prompt: string, chatHistory?: string[], optionsOverride?: any): Promise<string>;
    unloadModel(): Promise<void>;
}

export { ITextGenerationClient };
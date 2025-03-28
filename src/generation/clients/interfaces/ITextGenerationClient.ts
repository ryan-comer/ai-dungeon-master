interface ITextGenerationClient {
    generateText(prompt: string, optionsOverride?: any): Promise<string>;
    unloadModel(): Promise<void>;
}

export { ITextGenerationClient };
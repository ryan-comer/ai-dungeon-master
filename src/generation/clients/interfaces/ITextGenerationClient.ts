interface ITextGenerationClient {
    generateText(prompt: string): Promise<string>;
}

export { ITextGenerationClient };
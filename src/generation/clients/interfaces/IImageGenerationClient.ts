interface IImageGenerationClient {
    generateImage(prompt: string): Promise<string>;
    unloadModel(): Promise<void>;
}

export { IImageGenerationClient };
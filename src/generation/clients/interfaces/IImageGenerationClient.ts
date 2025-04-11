interface IImageGenerationClient {
    generateImage(prompt: string, optionsOverride?: any): Promise<string>;
    removeBackground(base64Image: string): Promise<string>;
    unloadModel(): Promise<void>;
}

export { IImageGenerationClient };
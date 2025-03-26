interface IImageGenerationClient {
    generateImage(prompt: string): Promise<string>;
}

export { IImageGenerationClient };
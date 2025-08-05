import { IImageGenerationClient } from "./interfaces/IImageGenerationClient";
import { GoogleGenAI } from "@google/genai";

/**
 * Image generation client using Google ImageGen4 API via @google/genai
 */
class GoogleImageGen4Client implements IImageGenerationClient {
    private genAI: GoogleGenAI;
    private model: string;
    private options: any;

    constructor(apiKey: string, model: string = "imagen-4.0-fast-generate-preview-06-06", options?: any) {
        this.genAI = new GoogleGenAI({ apiKey });
        this.model = model;
        this.options = options || {};
    }

    /**
     * Generates an image based on the prompt. Returns a base64-encoded image string.
     */
    async generateImage(prompt: string, optionsOverride?: any): Promise<string> {
        // Merge default options and override
        const cfg = { ...this.options, ...(optionsOverride || {}) };
        const model = cfg.model || this.model;
        try {
            const response: any = await this.genAI.models.generateImages({
                model,
                prompt,
                config: {
                    numberOfImages: cfg.numberOfImages || 1,
                    aspectRatio: cfg.aspectRatio,
                    personGeneration: cfg.personGeneration
                }
            });
            const gen = response.generatedImages?.[0];
            const bytes = gen?.image?.imageBytes;
            if (!bytes) throw new Error("No image bytes returned");
            return bytes;
        } catch (err) {
            console.error(`Error generating image: ${err}`);
            return "";
        }
    }

    /**
     * Not supported by Google ImageGen4; returns the original image.
     */
    async removeBackground(base64Image: string): Promise<string> {
        console.warn("removeBackground not supported by GoogleImageGen4Client, returning original image");
        return base64Image;
    }

    /**
     * No unload logic required for Google ImageGen4
     */
    async unloadModel(): Promise<void> {
        return;
    }
}

export { GoogleImageGen4Client };

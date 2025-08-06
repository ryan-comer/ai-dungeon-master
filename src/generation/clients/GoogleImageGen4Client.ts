import { IImageGenerationClient } from "./interfaces/IImageGenerationClient";
import { GoogleGenAI, PersonGeneration } from "@google/genai";

/** Implements IImageGenerationClient using Google ImageGen4 API via @google/genai */
class GoogleImageGen4Client implements IImageGenerationClient {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  /** Generates an image and returns base64-encoded bytes */
  async generateImage(prompt: string, optionsOverride?: any): Promise<string> {
    const cfg = { ...optionsOverride };
    const model = cfg.model || "imagen-4.0-generate-preview-06-06";
    const response: any = await this.ai.models.generateImages({
      model,
      prompt,
      config: {
        numberOfImages: cfg.numberOfImages || 1,
        aspectRatio: cfg.aspectRatio,
        personGeneration: cfg.personGeneration || PersonGeneration.ALLOW_ADULT,
        seed: cfg.seed,
        // addWatermark: cfg.addWatermark
      }
    });

    const images = response.generatedImages;
    if (!images || images.length === 0) {
      throw new Error("No generated images returned");
    }
    const bytes = images[0].image?.imageBytes;
    if (!bytes) {
      throw new Error("No image bytes returned");
    }
    return bytes;
  }

  async removeBackground(base64Image: string): Promise<string> {
    console.warn("removeBackground not supported by GoogleImageGen4Client, returning original image");
    return base64Image;
  }

  async unloadModel(): Promise<void> {
    // no-op
  }
}

export { GoogleImageGen4Client };

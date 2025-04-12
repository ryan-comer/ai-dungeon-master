import { IImageGenerationClient } from "./interfaces/IImageGenerationClient";

class HidreamClient implements IImageGenerationClient {
    private url: string;

    constructor(url: string = "http://localhost:5000") {
        this.url = url;
    }

    async generateImage(prompt: string, optionsOverride?: any): Promise<string> {
        try {
            const request = {
                prompt: prompt,
                width: 1024,
                height: 1024,
                ...optionsOverride
            };

            const response = await fetch(`${this.url}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`Error generating image: ${response.statusText}`);
            }

            const data = await response.json();
            return data.images[0]; // Assuming the first image is the one we want
        } catch (error) {
            console.error("Error in HidreamClient:", error);
            throw error;
        }
    }

    async unloadModel(): Promise<void> {
        // No specific unload logic for HidreamClient
        return;
    }

    async removeBackground(base64Image: string): Promise<string> {
        try {
            const response = await fetch(`http://localhost:7860/rembg`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input_image: base64Image,
                    model: "isnet-general-use",
                    return_mask: false,
                    alpha_matting: false
                }),
            });

            const data = await response.json();
            return data.image;
        } catch(e) {
            console.error(e);
            return base64Image;
        }
    }

}

export { HidreamClient };
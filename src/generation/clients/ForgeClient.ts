import { IImageGenerationClient } from "./interfaces/IImageGenerationClient";

class TextToImageRequest {
    prompt: string;
    steps?: number;
    width?: number;
    height?: number;
    save_images?: boolean;
    cfg_scale?: number;
    sampler_name?: string;
    scheduler?: string;
    distilled_cfg_scale?: number;
}

class TextToImageResponse {
    images: string[];
    parameters: any;
    info: string;
}

// Uses the Stable Diffusion Forge API to generate images
class ForgeClient implements IImageGenerationClient {

    private url: string;

    constructor(url: string = "http://localhost:7860") {
        this.url = url;
    }
    
    async generateImage(prompt: string): Promise<string> {
        try {
            const request:TextToImageRequest = {
                prompt: prompt,
                steps: 20,
                width: 1024,
                height: 1024,
                save_images: false,
                cfg_scale: 1.0,
                sampler_name: "Euler",
                scheduler: "Simple",
                distilled_cfg_scale: 3.5
            };

            const response = await fetch(`${this.url}/sdapi/v1/txt2img`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            const data:TextToImageResponse = await response.json();
            return data.images[0];
        } catch(e) {
            console.error(e);
            return "";
        }
    }

    async unloadModel(): Promise<void> {
        try {
            await fetch(`${this.url}/sdapi/v1/unload-checkpoint`, {
                method: 'POST'
            });
        } catch(e) {
            console.error(e);
        }
    }
}

export { ForgeClient };
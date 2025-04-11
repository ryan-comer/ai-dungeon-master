import { IImageGenerationClient } from "./interfaces/IImageGenerationClient";

class TextToImageRequest {
    prompt: string;
    steps?: number = 20;
    width?: number = 1024;
    height?: number = 1024;
    save_images?: boolean = false;
    cfg_scale?: number = 1.0;
    sampler_name?: string = "Euler";
    scheduler?: string = "Simple";
    distilled_cfg_scale?: number = 3.5;

    constructor(prompt: string) {
        this.prompt = prompt;
    }
}

class TextToImageResponse {
    images: string[];
    parameters: any;
    info: string;

    constructor(images: string[], parameters: any, info: string) {
        this.images = images;
        this.parameters = parameters;
        this.info = info;
    }
}

// Uses the Stable Diffusion Forge API to generate images
class ForgeClient implements IImageGenerationClient {

    private url: string;

    constructor(url: string = "http://localhost:7860") {
        this.url = url;
    }
    
    async generateImage(prompt: string, optionsOverride?: any): Promise<string> {
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
                distilled_cfg_scale: 3.5,
                ...optionsOverride
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

    async removeBackground(base64Image: string): Promise<string> {
        try {
            const response = await fetch(`${this.url}/rembg`, {
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
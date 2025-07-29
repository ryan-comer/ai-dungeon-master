import { IImageGenerationClient } from './interfaces/IImageGenerationClient';

class ComfyUIClient implements IImageGenerationClient {
    private apiUrl: string;
    private apiKey: string | null;

    constructor(apiUrl: string, apiKey: string | null = null) {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
    }

    async generateImage(prompt: string): Promise<string> {
        // 
        const response = await fetch(`${this.apiUrl}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
            },
            body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
            throw new Error(`Error generating image: ${response.statusText}`);
        }

        const data = await response.json();
        return data.imageUrl; // Assuming the API returns an image URL
    }

    async removeBackground(base64Image: string): Promise<string> {
        const response = await fetch(`${this.apiUrl}/remove-background`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
            },
            body: JSON.stringify({ image: base64Image }),
        });

        if (!response.ok) {
            throw new Error(`Error removing background: ${response.statusText}`);
        }

        const data = await response.json();
        return data.imageUrl; // Assuming the API returns an image URL
    }

    async unloadModel(): Promise<void> {
        const response = await fetch(`${this.apiUrl}/unload-model`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
            },
        });

        if (!response.ok) {
            throw new Error(`Error unloading model: ${response.statusText}`);
        }
    }

    // Get the prompt to generate an image
    getImagePrompt(prompt: string): string {
        return `
        {
            "6": {
                "inputs": {
                "text": ${prompt},
                "clip": [
                    "11",
                    0
                ]
                },
                "class_type": "CLIPTextEncode",
                "_meta": {
                "title": "CLIP Text Encode (Positive Prompt)"
                }
            },
            "8": {
                "inputs": {
                "samples": [
                    "13",
                    0
                ],
                "vae": [
                    "10",
                    0
                ]
                },
                "class_type": "VAEDecode",
                "_meta": {
                "title": "VAE Decode"
                }
            },
            "10": {
                "inputs": {
                "vae_name": "FLUX1\\ae.safetensors"
                },
                "class_type": "VAELoader",
                "_meta": {
                "title": "Load VAE"
                }
            },
            "11": {
                "inputs": {
                "clip_name1": "t5\\t5xxl_fp8_e4m3fn.safetensors",
                "clip_name2": "clip_l.safetensors",
                "type": "flux",
                "device": "default"
                },
                "class_type": "DualCLIPLoader",
                "_meta": {
                "title": "DualCLIPLoader"
                }
            },
            "12": {
                "inputs": {
                "unet_name": "FLUX1\\flux_dev_fp8_scaled_diffusion_model.safetensors",
                "weight_dtype": "default"
                },
                "class_type": "UNETLoader",
                "_meta": {
                "title": "Load Diffusion Model"
                }
            },
            "13": {
                "inputs": {
                "noise": [
                    "50",
                    0
                ],
                "guider": [
                    "22",
                    0
                ],
                "sampler": [
                    "16",
                    0
                ],
                "sigmas": [
                    "38",
                    1
                ],
                "latent_image": [
                    "62",
                    4
                ]
                },
                "class_type": "SamplerCustomAdvanced",
                "_meta": {
                "title": "SamplerCustomAdvanced"
                }
            },
            "16": {
                "inputs": {
                "sampler_name": "euler"
                },
                "class_type": "KSamplerSelect",
                "_meta": {
                "title": "KSamplerSelect"
                }
            },
            "17": {
                "inputs": {
                "scheduler": "normal",
                "steps": 20,
                "denoise": 1,
                "model": [
                    "64",
                    0
                ]
                },
                "class_type": "BasicScheduler",
                "_meta": {
                "title": "BasicScheduler"
                }
            },
            "22": {
                "inputs": {
                "model": [
                    "64",
                    0
                ],
                "conditioning": [
                    "65",
                    0
                ]
                },
                "class_type": "BasicGuider",
                "_meta": {
                "title": "BasicGuider"
                }
            },
            "38": {
                "inputs": {
                "step": 0,
                "sigmas": [
                    "17",
                    0
                ]
                },
                "class_type": "SplitSigmas",
                "_meta": {
                "title": "SplitSigmas"
                }
            },
            "50": {
                "inputs": {
                "noise_seed": 1009539620249012
                },
                "class_type": "RandomNoise",
                "_meta": {
                "title": "RandomNoise"
                }
            },
            "55": {
                "inputs": {
                "filename_prefix": "ComfyUI",
                "images": [
                    "8",
                    0
                ]
                },
                "class_type": "SaveImage",
                "_meta": {
                "title": "Save Image"
                }
            },
            "62": {
                "inputs": {
                "width": 1024,
                "height": 1024,
                "aspect_ratio": "1:1 square 1024x1024",
                "swap_dimensions": "Off",
                "upscale_factor": 1,
                "batch_size": 1
                },
                "class_type": "CR SDXL Aspect Ratio",
                "_meta": {
                "title": "🔳 CR SDXL Aspect Ratio"
                }
            },
            "64": {
                "inputs": {
                "max_shift": 1.15,
                "base_shift": 0.5,
                "width": [
                    "62",
                    0
                ],
                "height": [
                    "62",
                    1
                ],
                "model": [
                    "66",
                    0
                ]
                },
                "class_type": "ModelSamplingFlux",
                "_meta": {
                "title": "ModelSamplingFlux"
                }
            },
            "65": {
                "inputs": {
                "guidance": 3.5,
                "conditioning": [
                    "6",
                    0
                ]
                },
                "class_type": "FluxGuidance",
                "_meta": {
                "title": "FluxGuidance"
                }
            },
            "66": {
                "inputs": {
                "lora_name": "rpgMapsDora_v5.safetensors",
                "strength_model": 0.85,
                "model": [
                    "12",
                    0
                ]
                },
                "class_type": "LoraLoaderModelOnly",
                "_meta": {
                "title": "LoraLoaderModelOnly"
                }
            }
            }
        `
    }
}
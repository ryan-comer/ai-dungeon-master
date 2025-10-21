import { IImageGenerationClient } from "./interfaces/IImageGenerationClient";

type WorkflowGraph = Record<string, any>;

type ComfyImageMeta = {
  filename: string;
  subfolder?: string;
  type?: string;
};

const DEFAULT_TIMEOUT_MS = 360_000;
const DEFAULT_POLL_INTERVAL_MS = 1_000;

class ComfyUIClient implements IImageGenerationClient {
  private readonly baseUrl: string;
  private readonly defaultWorkflow?: WorkflowGraph;
  private readonly defaultTimeoutMs: number;
  private readonly defaultPollIntervalMs: number;

  constructor(
    baseUrl: string,
    defaultWorkflow?: WorkflowGraph,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
    pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.defaultWorkflow = defaultWorkflow;
    this.defaultTimeoutMs = timeoutMs;
    this.defaultPollIntervalMs = pollIntervalMs;
  }

  async generateImage(prompt: string, optionsOverride?: any): Promise<string> {
    const workflowTemplate = optionsOverride?.workflow ?? this.defaultWorkflow;

    if (!workflowTemplate) {
      throw new Error("ComfyUI workflow is required but was not provided.");
    }

    const normalizedWorkflow = this.normalizeWorkflow(workflowTemplate);
    const workflow = this.prepareWorkflow(normalizedWorkflow, prompt, optionsOverride);

    const queueResponse = await fetch(`${this.baseUrl}/prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt: workflow })
    });

    if (!queueResponse.ok) {
      const message = await this.safeReadText(queueResponse);
      throw new Error(`Failed to submit ComfyUI prompt: ${queueResponse.status} ${message}`);
    }

    const queueJson = await queueResponse.json();
    const promptId: string | undefined = queueJson.prompt_id ?? queueJson.promptId;

    if (!promptId) {
      throw new Error("ComfyUI did not return a prompt identifier.");
    }

    const timeoutMs = optionsOverride?.timeoutMs ?? this.defaultTimeoutMs;
    const pollIntervalMs = optionsOverride?.pollIntervalMs ?? this.defaultPollIntervalMs;

    return this.waitForFirstImage(promptId, timeoutMs, pollIntervalMs);
  }

  async removeBackground(base64Image: string): Promise<string> {
    console.warn("removeBackground not implemented for ComfyUIClient, returning original image");
    return base64Image;
  }

  async unloadModel(): Promise<void> {
    // ComfyUI keeps models in memory; no unload endpoint is exposed here yet.
  }

  private normalizeWorkflow(workflowSource: WorkflowGraph | string): WorkflowGraph {
    if (typeof workflowSource === "string") {
      return JSON.parse(workflowSource) as WorkflowGraph;
    }

    if (workflowSource && typeof workflowSource === "object") {
      return workflowSource;
    }

    throw new Error("Invalid workflow supplied for ComfyUI prompt.");
  }

  private prepareWorkflow(template: WorkflowGraph, prompt: string, optionsOverride?: any): WorkflowGraph {
    const cloned: WorkflowGraph = JSON.parse(JSON.stringify(template));
    const negativePrompt: string | undefined = optionsOverride?.negativePrompt;
    const noiseSeed: number | undefined = optionsOverride?.noiseSeed;
    const width = this.resolveDimension(optionsOverride?.width, 1024);
    const height = this.resolveDimension(optionsOverride?.height, 1024);

    this.injectDimensions(cloned, width, height);
    this.injectPromptText(cloned, prompt, negativePrompt);
    this.injectRandomNoiseSeed(cloned, noiseSeed);

    return cloned;
  }

  private injectPromptText(workflow: WorkflowGraph, prompt: string, negativePrompt?: string): void {
    let positiveNode: any | undefined;
    let negativeNode: any | undefined;

    for (const node of Object.values(workflow)) {
      if (!node || typeof node !== "object") {
        continue;
      }

      const textField = node.inputs?.text;
      if (typeof textField !== "string") {
        continue;
      }

      const title = (node._meta?.title ?? "").toString().toLowerCase();
      const classType = (node.class_type ?? "").toString().toLowerCase();
      const isPromptNode = classType.includes("cliptext") || classType.includes("prompt") || !!node.inputs?.text;

      if (!isPromptNode) {
        continue;
      }

      if (!positiveNode && !title.includes("negative")) {
        positiveNode = node;
      }

      if (!negativeNode && title.includes("negative")) {
        negativeNode = node;
      }
    }

    if (!positiveNode) {
      positiveNode = Object.values(workflow).find((node: any) => typeof node?.inputs?.text === "string");
    }

    if (!positiveNode) {
      throw new Error("Could not locate a text prompt node in the ComfyUI workflow.");
    }

    positiveNode.inputs.text = prompt;

    if (negativePrompt !== undefined) {
      if (negativeNode) {
        negativeNode.inputs.text = negativePrompt;
      } else if (negativePrompt.length > 0) {
        console.warn("Negative prompt provided but no negative prompt node found in workflow");
      }
    }
  }

  private injectDimensions(workflow: WorkflowGraph, width: number, height: number): void {
    for (const node of Object.values(workflow)) {
      if (!node || typeof node !== "object" || !node.inputs || typeof node.inputs !== "object") {
        continue;
      }

      if ("width" in node.inputs) {
        node.inputs.width = width;
      }

      if ("height" in node.inputs) {
        node.inputs.height = height;
      }
    }
  }

  private resolveDimension(value: unknown, fallback: number): number {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return Math.floor(value);
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        return Math.floor(parsed);
      }
    }

    return fallback;
  }

  private injectRandomNoiseSeed(workflow: WorkflowGraph, noiseSeed?: number): void {
    for (const node of Object.values(workflow)) {
      if (!node || typeof node !== "object") {
        continue;
      }

      const classType = (node.class_type ?? "").toString().toLowerCase();
      if (classType !== "randomnoise") {
        continue;
      }

      if (!node.inputs || typeof node.inputs !== "object") {
        node.inputs = {};
      }

      node.inputs.noise_seed = noiseSeed ?? this.generateRandomSeed();
    }
  }

  private generateRandomSeed(): number {
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  }

  private async waitForFirstImage(promptId: string, timeoutMs: number, pollIntervalMs: number): Promise<string> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const historyResponse = await fetch(`${this.baseUrl}/history/${promptId}`);

      if (historyResponse.status === 404) {
        await this.delay(pollIntervalMs);
        continue;
      }

      if (!historyResponse.ok) {
        const message = await this.safeReadText(historyResponse);
        throw new Error(`Failed to query ComfyUI history: ${historyResponse.status} ${message}`);
      }

      const historyJson = await historyResponse.json();
      const historyEntry = this.extractHistoryEntry(historyJson, promptId);

      if (!historyEntry) {
        await this.delay(pollIntervalMs);
        continue;
      }

      const status = historyEntry.status?.status_str ?? historyEntry.status?.status ?? "";
      if (status.toLowerCase() === "error") {
        const detail = historyEntry.status?.detail ?? "unknown error";
        throw new Error(`ComfyUI failed to generate image: ${detail}`);
      }

      const outputs = historyEntry.outputs ?? {};
      for (const nodeOutput of Object.values(outputs) as any[]) {
        const images: ComfyImageMeta[] | undefined = nodeOutput?.images;
        if (!Array.isArray(images) || images.length === 0) {
          continue;
        }

        return this.fetchImage(images[0]);
      }

      await this.delay(pollIntervalMs);
    }

    throw new Error(`Timed out waiting for ComfyUI to produce an image for prompt ${promptId}`);
  }

  private async fetchImage(imageMeta: ComfyImageMeta): Promise<string> {
    const url = new URL(`${this.baseUrl}/view`);
    url.searchParams.set("filename", imageMeta.filename);
    url.searchParams.set("type", imageMeta.type ?? "output");

    if (imageMeta.subfolder) {
      url.searchParams.set("subfolder", imageMeta.subfolder);
    }

    const imageResponse = await fetch(url);

    if (!imageResponse.ok) {
      const message = await this.safeReadText(imageResponse);
      throw new Error(`Failed to download generated image: ${imageResponse.status} ${message}`);
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    return this.arrayBufferToBase64(arrayBuffer);
  }

  private extractHistoryEntry(historyJson: any, promptId: string): any {
    if (!historyJson) {
      return undefined;
    }

    if (historyJson[promptId]) {
      return historyJson[promptId];
    }

    const history = historyJson.history;

    if (!history) {
      return undefined;
    }

    if (history[promptId]) {
      return history[promptId];
    }

    if (Array.isArray(history)) {
      return history.find((entry: any) => {
        if (!entry || typeof entry !== "object") {
          return false;
        }

        return (
          entry.id === promptId ||
          entry.prompt_id === promptId ||
          entry.status?.id === promptId
        );
      });
    }

    return undefined;
  }

  private arrayBufferToBase64(arrayBuffer: ArrayBuffer): string {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(arrayBuffer).toString("base64");
    }

    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000;
    let binary = "";

    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      const chunk = bytes.subarray(offset, offset + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    if (typeof btoa === "function") {
      return btoa(binary);
    }

    throw new Error("No base64 encoder available in this runtime environment.");
  }

  private async safeReadText(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch (error) {
      return String(error ?? "unknown error");
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export { ComfyUIClient };

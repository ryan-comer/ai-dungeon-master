import { Context } from "../models/Context"
import { ITextGenerationClient } from "../../generation/clients/interfaces/ITextGenerationClient";
import { IImageGenerationClient } from "../../generation/clients/interfaces/IImageGenerationClient";
import { IFileStore } from "../../utils/interfaces/IFileStore";

import { Setting } from "../models/Setting";
import { Campaign } from "../models/Campaign";
import { ILogger } from "../../utils/interfaces/ILogger";

interface IContextManager {
    chatHistory: string[];
    textGenerationClient: ITextGenerationClient;
    imageGenerationClient: IImageGenerationClient;
    fileStore: IFileStore;
    logger: ILogger

    loadContext(setting: Setting, campaign: Campaign): Promise<Context | null>;
    startSession(): Promise<void>;
    sendUserMessage(message: string): Promise<void>;
}

export { IContextManager };
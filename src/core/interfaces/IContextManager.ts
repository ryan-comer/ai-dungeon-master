import { Context } from "../models/Context"
import { ChatData } from "../interfaces/ICoreManager";
import { ITextGenerationClient } from "../../generation/clients/interfaces/ITextGenerationClient";
import { IImageGenerationClient } from "../../generation/clients/interfaces/IImageGenerationClient";
import { ITextToSpeechClient } from "../../generation/clients/interfaces/ITextToSpeechClient";
import { IFileStore } from "../../utils/interfaces/IFileStore";

import { Setting } from "../models/Setting";
import { Campaign } from "../models/Campaign";
import { ILogger } from "../../utils/interfaces/ILogger";
import { ITool } from "../../tools/interfaces/ITool";

interface IContextManager {
    chatHistory: string[];
    textGenerationClient: ITextGenerationClient;
    imageGenerationClient: IImageGenerationClient;
    textToSpeechClient: ITextToSpeechClient;
    fileStore: IFileStore;
    logger: ILogger
    tools: ITool[];

    loadContext(setting: Setting, campaign: Campaign): Promise<Context | null>;
    startSession(): Promise<void>;
    sendUserMessage(message: string, chatData: ChatData): Promise<void>;
}

export { IContextManager };
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
import { Session } from "../models/Session";

interface IContextManager {
    textGenerationClient: ITextGenerationClient;
    imageGenerationClient: IImageGenerationClient;
    textToSpeechClient: ITextToSpeechClient;
    fileStore: IFileStore;
    logger: ILogger
    tools: ITool[];

    loadContext(setting: Setting, campaign: Campaign): Promise<Context | null>;
    sendUserMessage(message: string, chatData: ChatData): Promise<void>;

    createSession(settingName: string, campaignName: string, sessionName: string): Promise<Session>;
    startSession(settingName: string, campaignName: string, sessionName: string): Promise<void>;
    getSessions(settingName: string, campaignName: string): Promise<Session[]>;
    getSession(settingName: string, campaignName: string, name: string): Promise<Session | null>;

    addChatHistory(message: string): Promise<void>;
    getChatHistory(): Promise<string[]>;
}

export { IContextManager };
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
import { Player } from "../models/Player";
import { SessionPlayer } from "../models/SessionPlayer";
import { ChatMessage as DMChatMessage } from "../models/ChatMessage";

interface IContextManager {
    textGenerationClient: ITextGenerationClient;
    imageGenerationClient: IImageGenerationClient;
    textToSpeechClient: ITextToSpeechClient;
    fileStore: IFileStore;
    logger: ILogger
    tools: ITool[];

    loadContext(setting: Setting, campaign: Campaign, session: Session): Promise<Context | null>;
    sendUserMessage(message: string, chatData: ChatData): Promise<void>;

    createSession(settingName: string, campaignName: string, sessionName: string): Promise<Session>;
    startSession(setting: Setting, campaign: Campaign, sessionName: string, players?: SessionPlayer[]): Promise<void>;
    getSessions(settingName: string, campaignName: string): Promise<Session[]>;
    getSession(settingName: string, campaignName: string, name: string): Promise<Session | null>;

    getPlayers(): Promise<Player[]>;

    // Add a structured chat message
    addChatMessage(message: DMChatMessage): Promise<void>;
    // Get the list of structured chat messages
    getChatMessages(): Promise<DMChatMessage[]>;
    // Get players in the current session with control flags
    getSessionPlayers(): Promise<SessionPlayer[]>;
    // Set control flag for a session player
    setPlayerControl(playerName: string, isAIControlled: boolean): Promise<void>;
    /**
     * Set multiple players control flags in the current session and persist.
     */
    setSessionPlayers(players: SessionPlayer[]): Promise<void>;
}

export { IContextManager };
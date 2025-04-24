import { Campaign } from "../models/Campaign";
import { Session } from "../models/Session";
import { Setting } from "../models/Setting";
import { Storyline } from "../models/Storyline";

class ChatData {
    user: string;
    speaker: any;

    constructor(user: string, speaker: any) {
        this.user = user;
        this.speaker = speaker;
    }
}

// The core manager that manages the core state of the AI Dungeon Master
interface ICoreManager {
    initialize(): void;

    createSetting(userPrompt: string): Promise<Setting>;
    createCampaign(settingName: string, userPrompt: string): Promise<Campaign>;
    createStoryline(settingName: string, campaignName: string, milestoneIndex: number, userPrompt: string): Promise<Storyline>;

    getSetting(settingName: string): Promise<Setting | null>;
    getCampaign(settingName: string, campaignName: string): Promise<Campaign | null>;
    getStoryline(settingName: string, campaignName: string, storylineName: string): Promise<Storyline | null>;

    getLoadedCampaign(): Promise<Campaign | null>;

    userMessage(message: string, chatData: ChatData): Promise<void>;

    createSession(settingName: string, campaignName: string, sessionName: string): Promise<Session>;
    getSession(settingName: string, campaignName: string, sessionName: string): Promise<Session | null>;
    getSessions(settingName: string, campaignName: string): Promise<Session[]>;
    startSession(settingName: string, campaignName: string, sessionName: string): Promise<void>;

    // Event handlers
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback: (...args: any[]) => void): void;
}

export { ICoreManager, ChatData };
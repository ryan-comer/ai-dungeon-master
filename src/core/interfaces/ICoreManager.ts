import { Campaign } from "../models/Campaign";
import { Setting } from "../models/Setting";
import { Storyline } from "../models/Storyline";

// The core manager that manages the core state of the AI Dungeon Master
interface ICoreManager {
    initialize(): void;

    createSetting(userPrompt: string): Promise<Setting>;
    createCampaign(settingName: string, userPrompt: string): Promise<Campaign>;
    createStoryline(settingName: string, campaignName: string, milestoneIndex: number, userPrompt: string): Promise<Storyline>;

    getSetting(settingName: string): Promise<Setting | null>;
    getCampaign(settingName: string, campaignName: string): Promise<Campaign | null>;
    getStoryline(settingName: string, campaignName: string, storylineName: string): Promise<Storyline | null>;

    loadCampaign(settingName: string, campaignName: string): Promise<Campaign | null>;
    getLoadedCampaign(): Promise<Campaign | null>;

    userMessage(message: string): Promise<void>;

    // Event handlers
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback: (...args: any[]) => void): void;
}

export { ICoreManager };
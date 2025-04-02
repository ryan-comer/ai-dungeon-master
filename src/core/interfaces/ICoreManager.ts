import { Campaign } from "../campaigns/models/Campaign";
import { Setting } from "../campaigns/models/Setting";
import { Storyline } from "../campaigns/models/Storyline";

// The core manager that manages the core state of the AI Dungeon Master
interface ICoreManager {
    initialize(): void;

    createSetting(userPrompt: string): Promise<Setting>;
    createCampaign(settingName: string, userPrompt: string): Promise<Campaign>;
    createStoryline(settingName: string, campaignName: string, milestoneIndex: number, userPrompt: string): Promise<Storyline>;

    getSetting(settingName: string): Promise<Setting | null>;
    getCampaign(settingName: string, campaignName: string): Promise<Campaign | null>;
    getStoryline(settingName: string, campaignName: string, storylineName: string): Promise<Storyline | null>;
}

export { ICoreManager };
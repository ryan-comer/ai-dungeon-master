import { Campaign } from '../models/Campaign';
import { Setting } from '../models/Setting';
import { Storyline } from '../models/Storyline';

interface ICampaignManager {
    createSetting(userPrompt: string): Promise<Setting>;
    createCampaign(setting: string, userPrompt: string): Promise<Campaign>;
    createStoryline(setting: string, campaign: string, milestoneIndex: number, userPrompt: string): Promise<Storyline>;

    getSetting(setting: string): Promise<Setting | null>;
    getCampaign(setting: string, campaign: string): Promise<Campaign | null>;
    getStoryline(setting: string, campaign: string, storyline: string): Promise<Storyline | null>;
}

export { ICampaignManager };
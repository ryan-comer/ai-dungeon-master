import { Campaign } from '../models/Campaign';
import { Setting } from '../models/Setting';
import { Storyline } from '../models/Storyline';

interface ICampaignManager {
    createSetting(userPrompt: string): Promise<Setting>;
    createCampaign(settingName: string, userPrompt: string, pdfManuals?: { playerManualFile?: File, gmManualFile?: File }): Promise<Campaign>;
    processPdfManuals(settingName: string, campaignName: string, playerManualPath?: string, gmManualPath?: string): Promise<void>;
    
    continueGeneration(setting: Setting, campaign: Campaign): Promise<Campaign>;
    resumeGeneration(settingName: string, campaignName: string): Promise<Campaign>;

    getSetting(settingName: string): Promise<Setting | null>;
    getCampaign(settingName: string, campaignName: string): Promise<Campaign | null>;
    getStoryline(settingName: string, campaignName: string, storylineName: string): Promise<Storyline | null>;
}

export { ICampaignManager };
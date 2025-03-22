import { ICoreManager } from "./interfaces/ICoreManager";
import { ICampaignManager } from "./interfaces/ICampaignManager";
import { CampaignManager } from "./CampaignManager";

class CoreManager implements ICoreManager {
    private campaignManager: ICampaignManager;

    constructor() {
        this.campaignManager = new CampaignManager();
    }

    initialize(): void {
        console.log("Initializing the core manager...");
    }

    async createSetting(userPrompt: string = ""): Promise<string> {
        console.log("Creating a setting...");
        const settingName: string = await this.campaignManager.createSetting(userPrompt);
        return settingName;
    }
    async createCampaign(settingName: string, userPrompt: string = ""): Promise<string> {
        console.log("Creating a campaign...");
        const campaignName: string = await this.campaignManager.createCampaign(settingName, userPrompt);
        return campaignName;
    }
    async createStoryline(settingName: string, campaignName: string, milestoneIndex: number, userPrompt: string = ""): Promise<string> {
        console.log("Creating a storyline...");
        const storylineName: string = await this.campaignManager.createStoryline(settingName, campaignName, milestoneIndex, userPrompt);
        return storylineName;
    }

    async getSetting(settingName: string): Promise<string> {
        return this.campaignManager.getSetting(settingName);
    }
    async getCampaign(settingName: string, campaignName: string): Promise<string> {
        return this.campaignManager.getCampaign(settingName, campaignName);
    }
    async getStoryline(settingName: string, campaignName: string, storylineName: string): Promise<string> {    
        return this.campaignManager.getStoryline(settingName, campaignName, storylineName);
    }

}

export { CoreManager };
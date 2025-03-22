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
    async createCampaign(setting: string, userPrompt: string = ""): Promise<string> {
        console.log("Creating a campaign...");
        const campaignName: string = await this.campaignManager.createCampaign(setting, userPrompt);
        return campaignName;
    }
    async createStoryline(setting: string, campaign: string, milestoneIndex: number, userPrompt: string = ""): Promise<string> {
        console.log("Creating a storyline...");
        const storylineName: string = await this.campaignManager.createStoryline(setting, campaign, milestoneIndex, userPrompt);
        return storylineName;
    }
    loadCampaign(): void {
        console.log("Loading a campaign...");
    }
}

export { CoreManager };
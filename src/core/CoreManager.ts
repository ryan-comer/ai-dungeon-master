import { ICoreManager } from "./interfaces/ICoreManager";
import { ICampaignManager } from "./interfaces/ICampaignManager";
import { CampaignManager } from "./CampaignManager";

import { ITextGenerationClient } from "../generation/clients/interfaces/ITextGenerationClient";
import { IImageGenerationClient } from "../generation/clients/interfaces/IImageGenerationClient";

import { IFileStore } from "../utils/interfaces/IFileStore";
import { ILogger } from "../utils/interfaces/ILogger";
import { Logger } from "../utils/Logger";

import { Setting } from "./campaigns/models/Setting";
import { Campaign } from "./campaigns/models/Campaign";
import { Storyline } from "./campaigns/models/Storyline";

import { Mutex } from "async-mutex"; // Add this import for the lock mechanism

class CoreManager implements ICoreManager {
    private campaignManager: ICampaignManager;
    private logger: ILogger;
    private creationLock: Mutex; // Add a Mutex instance

    constructor(iTextGenerationClient: ITextGenerationClient, iImageGenerationClient: IImageGenerationClient, fileStore: IFileStore, logger: ILogger=new Logger()) {
        this.campaignManager = new CampaignManager(iTextGenerationClient, iImageGenerationClient, fileStore, logger);
        this.logger = logger;
        this.creationLock = new Mutex(); // Initialize the Mutex
    }

    initialize(): void {
        console.log("Initializing the core manager...");
    }

    async createSetting(userPrompt: string = ""): Promise<Setting> {
        return this.creationLock.runExclusive(async () => { // Use the lock
            this.logger.info("Creating a setting...");
            const setting: Setting = await this.campaignManager.createSetting(userPrompt);
            return setting;
        });
    }

    async createCampaign(settingName: string, userPrompt: string = ""): Promise<Campaign> {
        return this.creationLock.runExclusive(async () => { // Use the lock
            this.logger.info("Creating a campaign...");
            const campaign: Campaign = await this.campaignManager.createCampaign(settingName, userPrompt);
            return campaign
        });
    }

    async createStoryline(settingName: string, campaignName: string, milestoneIndex: number, userPrompt: string = ""): Promise<Storyline> {
        return this.creationLock.runExclusive(async () => { // Use the lock
            this.logger.info("Creating a storyline...");
            const storyline: Storyline = await this.campaignManager.createStoryline(settingName, campaignName, milestoneIndex, userPrompt);
            return storyline;
        });
    }

    async getSetting(settingName: string): Promise<Setting | null> {
        return this.campaignManager.getSetting(settingName);
    }
    async getCampaign(settingName: string, campaignName: string): Promise<Campaign | null> {
        return this.campaignManager.getCampaign(settingName, campaignName);
    }
    async getStoryline(settingName: string, campaignName: string, storylineName: string): Promise<Storyline | null> {    
        return this.campaignManager.getStoryline(settingName, campaignName, storylineName);
    }

}

export { CoreManager };
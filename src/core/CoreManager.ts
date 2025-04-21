import { ChatData, ICoreManager } from "./interfaces/ICoreManager";
import { ICampaignManager } from "./interfaces/ICampaignManager";
import { CampaignManager } from "./CampaignManager";
import { IContextManager } from "./interfaces/IContextManager";
import { ContextManager } from "./ContextManager";
import { IEntityManager } from "./interfaces/IEntityManager";
import { EntityManager } from "./EntityManager";
import { IEncounterManager } from "./interfaces/IEncounterManager";
import { EncounterManager } from "./EncounterManager";

import { ITextGenerationClient } from "../generation/clients/interfaces/ITextGenerationClient";
import { IImageGenerationClient } from "../generation/clients/interfaces/IImageGenerationClient";

import { IFileStore } from "../utils/interfaces/IFileStore";
import { ILogger } from "../utils/interfaces/ILogger";
import { Logger } from "../utils/Logger";
import { sendChatMessage } from "../utils/utils";

import { Setting } from "./models/Setting";
import { Campaign } from "./models/Campaign";
import { Storyline } from "./models/Storyline";

import { Mutex } from "async-mutex"; // Add this import for the lock mechanism
import { EventEmitter } from "events"; // Add this import for event handling

import { ITool } from "../tools/interfaces/ITool";
import { CreateEncounterTool } from "../tools/CreateEncounterTool";
import { SceneViewerTool } from "../tools/SceneViewerTool";
import { ITextToSpeechClient } from "../generation/clients/interfaces/ITextToSpeechClient";

class CoreManager implements ICoreManager {
    private campaignManager: ICampaignManager;
    private contextManager: IContextManager
    private entityManager: IEntityManager;
    private encounterManager: IEncounterManager;

    private logger: ILogger;
    private creationLock: Mutex; // Add a Mutex instance
    private eventEmitter: EventEmitter; // Add an EventEmitter instance

    private loadedCampaign: Campaign | null = null; // Store the loaded campaign
    private loadedSetting: Setting | null = null; // Store the loaded setting
    private loadedStoryline: Storyline | null = null; // Store the loaded storyline

    private tools: ITool[] = [
        //new CreateEncounterTool()
        //new SceneViewerTool()
    ];

    constructor(textGenerationClient: ITextGenerationClient, imageGenerationClient: IImageGenerationClient, textToSpeechClient: ITextToSpeechClient, fileStore: IFileStore, logger: ILogger=new Logger()) {
        this.entityManager = new EntityManager(textGenerationClient, imageGenerationClient, fileStore);
        this.campaignManager = new CampaignManager(textGenerationClient, imageGenerationClient, fileStore, this.entityManager, logger);
        this.logger = logger;
        this.creationLock = new Mutex(); // Initialize the Mutex
        this.contextManager = new ContextManager(textGenerationClient, imageGenerationClient, textToSpeechClient, fileStore, this.entityManager, logger, this.tools); // Initialize the context manager
        this.eventEmitter = new EventEmitter(); // Initialize the EventEmitter

        this.encounterManager = new EncounterManager(); // Initialize the encounter manager
        this.encounterManager.init(this.contextManager); // Pass the context manager to the encounter manager
    }

    initialize(): void {
        console.log("Initializing the core manager...");
    }

    on(event: string, callback: (...args: any[]) => void): void {
        this.eventEmitter.on(event, callback); // Register an event listener
    }

    off(event: string, callback: (...args: any[]) => void): void {
        this.eventEmitter.off(event, callback); // Remove an event listener
    }

    Logger(): ILogger {
        return this.logger; // Return the logger instance
    }

    private emit(event: string, ...args: any[]): void {
        this.eventEmitter.emit(event, ...args); // Emit an event
    }

    async createSetting(userPrompt: string = ""): Promise<Setting> {
        return this.creationLock.runExclusive(async () => { // Use the lock
            this.logger.info("Creating a setting...");
            const setting: Setting = await this.campaignManager.createSetting(userPrompt);
            this.emit("settingCreated", setting); // Emit event
            return setting;
        });
    }

    async createCampaign(settingName: string, userPrompt: string = ""): Promise<Campaign> {
        return this.creationLock.runExclusive(async () => { // Use the lock
            this.logger.info("Creating a campaign...");
            const campaign: Campaign = await this.campaignManager.createCampaign(settingName, userPrompt);
            this.emit("campaignCreated", campaign); // Emit event
            return campaign
        });
    }

    async createStoryline(settingName: string, campaignName: string, milestoneIndex: number, userPrompt: string = ""): Promise<Storyline> {
        return this.creationLock.runExclusive(async () => { // Use the lock
            this.logger.info("Creating a storyline...");
            const storyline: Storyline = await this.campaignManager.createStoryline(settingName, campaignName, milestoneIndex, userPrompt);
            this.emit("storylineCreated", storyline); // Emit event
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

    async loadCampaign(settingName: string, campaignName: string): Promise<Campaign | null> {
        const campaign: Campaign | null = await this.campaignManager.getCampaign(settingName, campaignName);
        if (!campaign) {
            this.logger.error(`Campaign ${campaignName} not found in setting ${settingName}`);
            return null;
        }
        this.loadedCampaign = campaign; // Store the loaded campaign

        const setting: Setting | null = await this.campaignManager.getSetting(settingName);
        if (!setting) {
            this.logger.error(`Setting ${settingName} not found`);
            return null;
        }
        this.loadedSetting = setting; // Store the loaded setting

        this.logger.info("Loading campaign context...");
        this.contextManager.loadContext(setting, campaign);
        this.logger.info("Campaign context loaded.");
        return this.loadedCampaign;
    }

    async getLoadedCampaign(): Promise<Campaign | null> {
        return this.loadedCampaign
    }

    async startSession(): Promise<void> {
        this.contextManager.startSession(); // Start the session
    }

    // User sent a message to the AI Dungeon Master
    async userMessage(message: string, chatData: ChatData): Promise<void> {
        this.logger.info("User message received:");
        console.log("Chat data:", chatData);
        await this.contextManager.sendUserMessage(message, chatData);
    }

}

export { CoreManager };
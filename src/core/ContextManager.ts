import { IContextManager } from "./interfaces/IContextManager";
import { Context } from "./models/Context";
import { Setting } from "./models/Setting";
import { Campaign } from "./models/Campaign";
import { Storyline } from "./models/Storyline";

import { ILogger } from "../utils/interfaces/ILogger";
import { IFileStore } from "../utils/interfaces/IFileStore";

import { ITextGenerationClient } from "../generation/clients/interfaces/ITextGenerationClient";
import { sendChatMessage } from "../utils/utils";

class ContextManager implements IContextManager {

    private textGenerationClient: ITextGenerationClient;
    private fileStore: IFileStore;
    private logger: ILogger;

    private loadedCampaign: Campaign | null = null; // Store the loaded campaign
    private loadedSetting: Setting | null = null; // Store the loaded setting
    private currentStoryline: Storyline | null = null; // Store the current storyline

    constructor(textGenerationClient: ITextGenerationClient, fileStore: IFileStore, logger: ILogger) {
        this.textGenerationClient = textGenerationClient;
        this.fileStore = fileStore;
        this.logger = logger;
    }

    async loadContext(setting: Setting, campaign: Campaign): Promise<Context | null> {
        // Implement the logic to load the context based on settingName and campaignName
        // For now, returning null as a placeholder
        this.loadedSetting = setting;
        this.loadedCampaign = campaign;

        // Get the current storyline from the campaign
        const storylineName: string = campaign.milestones[0].name;
        this.currentStoryline = await this.fileStore.getStoryline(
            setting.name,
            campaign.name,
            storylineName
        )

        return null;
    }

    async startCampaign(): Promise<void> {
        if (!this.loadedSetting || !this.loadedCampaign) {
            this.logger.error("No loaded setting or campaign to start.");
            return;
        }

        const response: string = await this.textGenerationClient.generateText(
            this.getInitialPrompt()
        );
        sendChatMessage(response);

        this.logger.info(`Started campaign: ${this.loadedCampaign.name}`);
    }

    // Get the initial prompt for the AI DM
    getInitialPrompt(): string {
        return `
        You are a text-based AI Dungeon Master (DM) for a tabletop role-playing game (RPG).
        You will provide a narrative and respond to player actions in a collaborative storytelling experience.
        Your goal is to create an engaging and immersive story for the players.
        You will use the context of the game, including the setting, characters, and events, to guide the narrative.
        You will also respond to player actions and decisions, adapting the story as needed.
        You will provide descriptions, dialogue, and challenges for the players to overcome.
        You will also keep track of the game world, including locations, items, and NPCs.
        You will use your creativity and imagination to create a unique and exciting story for the players.
        You will also be able to generate random events and encounters to keep the game interesting.
        You will use your knowledge of RPG mechanics and storytelling techniques to create a balanced and enjoyable experience for the players.
        I will provide you with the setting, campaign, and the storyline to get started.

        This is the setting for the game:
        ${JSON.stringify(this.loadedSetting, null, 2)}

        This is the campaign for the game:
        ${JSON.stringify(this.loadedCampaign, null, 2)}

        This is the current storyline for the game:
        ${JSON.stringify(this.currentStoryline, null, 2)}

        Start off by describing the setting and the current situation in the game world.
        Include any important characters, locations, and events that are relevant to the players.
        Make sure to set the tone and atmosphere for the game, and provide hooks for the players to engage with the story.

        Only respond with the narrative and do not include any system messages or instructions.
        `;
    }

}

export { ContextManager };
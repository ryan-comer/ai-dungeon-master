import { ICampaignManager } from "./interfaces/ICampaignManager";

import { IEntityManager } from "./interfaces/IEntityManager";

import { IFileStore } from "../utils/interfaces/IFileStore";
import { ILogger } from "../utils/interfaces/ILogger";

import { ITextGenerationClient } from "../generation/clients/interfaces/ITextGenerationClient";
import { OllamaClient } from "../generation/clients/OllamaClient";
import { OpenAIClient } from "../generation/clients/OpenAIClient";
import { GoogleClient } from "../generation/clients/GoogleClient";
import { RepeatJsonGeneration } from "../generation/clients/utils";

import { IImageGenerationClient } from "../generation/clients/interfaces/IImageGenerationClient";
import { ForgeClient } from "../generation/clients/ForgeClient";

import { Campaign, CampaignCodec } from "./models/Campaign";
import { Setting, SettingCodec } from "./models/Setting";
import { Storyline, StorylineCodec } from "./models/Storyline";

import { isRight } from "fp-ts/lib/Either";

class CampaignManager implements ICampaignManager {

    private fileStore: IFileStore;
    private logger: ILogger;
    private textGenerationClient: ITextGenerationClient;
    private imageGenerationClient: IImageGenerationClient;
    private entityManager: IEntityManager;

    constructor(textGenerationClient: ITextGenerationClient, imageGenerationClient: IImageGenerationClient, iFileStore: IFileStore, entityManager:IEntityManager, logger: ILogger) {
        this.textGenerationClient = textGenerationClient;
        this.imageGenerationClient = imageGenerationClient;
        this.fileStore = iFileStore;
        this.logger = logger;
        this.entityManager = entityManager;
    }

    async createSetting(userPrompt: string): Promise<Setting> {
        const prompt: string = `
            Create a setting for a campaign in dnd. This will be a high-level description of the world, its inhabitants, places, and the general state of things.
            This setting will be used to generate storylines for players to play through.
            Make the setting super interesting and unique, and make sure it has a lot of potential for cool stories and adventures.
            Be as descriptive as possible, and make sure to include all the key elements of the setting. This will be used as the foundation for the campaign.

            ${userPrompt.length > 0 ? `The setting should match the following user prompt: ${userPrompt}` : ""}

            Give me the setting in the following JSON format. Do not skip any fields, all fields are required:

            {
                "name": "Name of the setting",
                "description": "Description of the world",
                "geography": [
                    {
                        "name": "Name of the region",
                        "description": "Description of the region",
                        "features": "Key features of the region",
                        "settlements": [
                            {
                                "name": "Name of the settlement",
                                "description": "Description of the settlement",
                                "population": "Population of the settlement",
                                "knownFor": "What the settlement is known for"
                            }
                        ]
                    }
                ],
                "factions": [
                    {
                        "name": "Name of the faction",
                        "description": "Description of the faction",
                        "alignment": "Alignment of the faction",
                        "goals": "Goals of the faction",
                        "members": [
                            {
                                "name": "Name of the member",
                                "role": "Role of the member in the faction",
                                "description": "Description of the member"
                            }
                        ]
                    }
                ],
                "notableFigures": [
                    {
                        "name": "Name of the figure",
                        "description": "Description of the figure",
                        "role": "Role of the figure in the world"
                    }
                ],
                "historicalEvents": [
                    {
                        "name": "Name of the event",
                        "description": "Description of the event",
                        "date": "Date of the event"
                    }
                ],
                "deities": [
                    {
                        "name": "Name of the deity",
                        "description": "Description of the deity"
                    }
                ],
                "monsters": [
                    {
                        "name": "Name of the monster",
                        "description": "Description of the monster",
                        "habitat": "Habitat of the monster"
                    }
                ],
                "conflicts": [
                    {
                        "name": "Name of the conflict",
                        "description": "Description of the conflict",
                        "parties": [
                            {
                                "name": "Name of the party",
                                "description": "Description of the party"
                            }
                        ]
                ]
            }

            Do not reply with anything that is NOT JSON.
        `;

        const setting: string = await RepeatJsonGeneration(prompt, async (repeatPrompt: string): Promise<string> => {
            const repeatResponse: string = await this.textGenerationClient.generateText(repeatPrompt);
            return repeatResponse;
        }, (response: string): boolean => {
            try {
                const result = SettingCodec.decode(JSON.parse(response));
                return isRight(result); // Use isRight to check if validation is successful
            } catch (e) {
                console.error("Error validating setting JSON:", e);
                return false; // Return false if validation fails
            }
        });
        const settingJson: Setting = JSON.parse(setting);

        await this.fileStore.saveSetting(settingJson.name, settingJson);

        return settingJson;
    }

    async createCampaign(settingName: string, userPrompt: string): Promise<Campaign> {
        const settingJson: Setting | null = await this.fileStore.getSetting(settingName);
        if (settingJson == null) {
            throw new Error(`Setting ${settingName} not found`);
        }
        const setting: string = JSON.stringify(settingJson, null, 2);

        const prompt: string = `
            Create a campaign using the following setting:

            ${setting}

            ${userPrompt.length > 0 ? `The campaign should match the following user prompt: ${userPrompt}` : ""}

            The campaign will be a high-level description of the story, characters, locations, etc.
            The campaign is a larger storyline that the players will play through, and it will be made up of multiple storylines that the players will play through.
            The campaign should have a clear objective and premise that the players will work towards, and all the objectives should align with the premise and tell a cohesive story.
            The campaign will have milestones that the players will work towards. Each milestone should build on top of one another to tell the larger story of the campaign.
            The milestones will be used to create storylines that the players will play through, and each storyline should build towards the campaign's goals.
            Do not make the campaign generic or open-ended. Make it specific and focused on a clear objective that the players will work towards.
            Be as descriptive as possible, and make sure to include all the key elements of the campaign. This will be used as the foundation for the storylines.
            Give me the campaign in the following JSON format. Do not skip any fields, all fields are required:

            {
                "name": "Name of the campaign",
                "description": "Description of the campaign, including the world, characters, story and objectives",
                "objectives": ["Objectives in the campaign - a clear list of concrete objectives"],
                "overview": {
                    "description": "Description of the campaign",
                    "objective": "Objective of the campaign",
                    "premise": "Premise of the campaign"
                },
                "factions": [
                    {
                        "name": "Name of the faction",
                        "description": "Description of the faction",
                        "motivation": "Motivation of the faction",
                    }
                ],
                "characters": [
                    {
                        "name": "Name of the character",
                        "description": "Description of the character",
                        "role": "Role of the character in the campaign"
                    }
                ],
                "locations": [
                    {
                        "name": "Name of the location",
                        "description": "Description of the location",
                        "features": "Key features of the location"
                        "relevance": "Relevance of the location to the campaign"
                    }
                ],
                // Milestones that the players will work towards
                // These milestones will be used to create storylines that the players will play through
                // Each milestone should build on top of one another to tell the larger story of the campaign
                "milestones": [
                    {
                        "name": "Name of the milestone",
                        "description": "Description of the milestone",
                        "objective": "Objective of the milestone"
                    }
                ],
            }
        `;

        const campaign: string = await RepeatJsonGeneration(prompt, async (repeatPrompt: string): Promise<string> => {
            const repeatResponse: string = await this.textGenerationClient.generateText(repeatPrompt);
            return repeatResponse;
        }, (response: string): boolean => {
            try {
                const result = CampaignCodec.decode(JSON.parse(response));
                return isRight(result); // Use isRight to check if validation is successful
            } catch (e) {
                console.error("Error validating campaign JSON:", e);
                return false; // Return false if validation fails
            }
        });

        let campaignJson: Campaign = JSON.parse(campaign);
        campaignJson.setting = settingName;

        await this.fileStore.saveCampaign(settingName, campaignJson.name, campaignJson);

        // Initialize the entities for the campaign
        await this.initializeCharacters(settingJson, campaignJson, null);
        await this.initializeFactions(settingJson, campaignJson, null);
        await this.initializeLocations(settingJson, campaignJson, null);

        return campaignJson;
    }

    async createStoryline(settingName: string, campaignName: string, milestoneIndex: number, userPrompt: string): Promise<Storyline> {
        const settingJson: Setting | null = await this.fileStore.getSetting(settingName);
        if (settingJson == null) {
            throw new Error(`Setting ${settingName} not found`);
        }
        const setting: string = JSON.stringify(settingJson, null, 2);
        const campaignJson: Campaign | null = await this.fileStore.getCampaign(settingName, campaignName);
        if (campaignJson == null) {
            throw new Error(`Campaign ${campaignName} not found`);
        }
        const campaign: string = JSON.stringify(campaignJson, null, 2);
        const milestone = JSON.parse(campaign).milestones[milestoneIndex];

        const prompt = `
        Create a storyline for a dnd campaign. This will be a self-contained story within the context of the campaign.

        This is the setting for the campaign:
        ${setting}

        This is the campaign that the storyline will be a part of:
        ${campaign}

        ${userPrompt.length > 0 ? `The storyline should match the following user prompt: ${userPrompt}` : ""}

        The storyline will be a self-contained story within the context of the campaign.
        The storyline should only be a part of the larger campaign, not the whole thing.
        The purpose of the storyline is to be a self-contained portion of the larger campaign that builds towards the campaign's goals.
        If the campaign is to save the world, the storyline could be about finding a powerful artifact that will help in the final battle.

        The storyline should be for the following milestone in the campaign. Make sure the storyline's objective aligns with the milestone's description.
        Here is the milestone to base the storyline on:

        ${milestone.toString()}

        The storyline should be broken into clear tasks that the players have to accomplish.
        Each task should build towards the storyline's objective and help progress the story.
        Don't make the segments and tasks too generic or open-ended. Make them specific and focused on the storyline's objective.
        Be as descriptive as possible, and make sure to include all the key elements of the storyline. This will be used as the foundation for the story that the players will play through.

        Give me the storyline in the following JSON format. Do not skip any fields, all fields are required:

        {
            "name": "Name of the storyline",
            "description": "Description of the storyline",
            "objectives": ["Objective 1", "Objective 2", "Objective 3"],
            "segments": [
                {
                    "name": "Name of the segment",
                    "description": "Description of the segment",
                    "tasks": [
                        {
                            "name": "Name of the task",
                            "description": "Description of the task",
                            "objective": "Objective of the task"
                        }
                    ],
                    "locations": [
                        {
                            "name": "Name of the location",
                            "description": "Description of the location",
                            "features": "Key features of the location"
                        }
                    ],
                    "characters": [
                        {
                            "name": "Name of the character",
                            "description": "Description of the character",
                            "role": "Role of the character in the segment"
                        }
                    ]
                }
            ],
            "factions": [   // Array of factions
                {
                    "name": "Name of the faction",
                    "description": "Description of the faction",
                    "relevance": "Relevance of the faction to the storyline"
                }
            ]
        }
        `;

        const storyline: string = await RepeatJsonGeneration(prompt, async (repeatPrompt: string): Promise<string> => {
            const repeatResponse: string = await this.textGenerationClient.generateText(repeatPrompt);
            return repeatResponse;
        }, (response: string): boolean => {
            try {
                const result = StorylineCodec.decode(JSON.parse(response));
                return isRight(result); // Use isRight to check if validation is successful
            } catch (e) {
                console.error("Error validating storyline JSON:", e);
                return false; // Return false if validation fails
            }
        });

        const storylineJson: Storyline = JSON.parse(storyline);
        storylineJson.name = milestone.name; // Set the name of the storyline to the name of the milestone
        storylineJson.campaign = campaignName; // Set the campaign name for the storyline

        await this.fileStore.saveStoryline(settingName, campaignName, storylineJson);

        // Initialize the entities for the storyline
        await this.initializeCharacters(settingJson, campaignJson, storylineJson);
        await this.initializeFactions(settingJson, campaignJson, storylineJson);
        await this.initializeLocations(settingJson, campaignJson, storylineJson);

        return storylineJson;
    }

    async getSetting(settingName: string): Promise<Setting | null> {
        return this.fileStore.getSetting(settingName);
    }
    async getCampaign(settingName: string, campaignName: string): Promise<Campaign | null> {
        return this.fileStore.getCampaign(settingName, campaignName);
    }
    async getStoryline(settingName: string, campaignName: string, storylineName: string): Promise<Storyline | null> {
        return this.fileStore.getStoryline(settingName, campaignName, storylineName);
    }

    // Initialize the characters for the campaign
    private async initializeCharacters(setting: Setting, campaign: Campaign, storyline: Storyline|null): Promise<void> {

        // Initialize the setting characters
        for (const character of setting.notableFigures) {
            if (!(await this.entityManager.getCharacterFromContext(JSON.stringify(character), setting, campaign))) {
                this.logger.info(`Creating character: ${character.name}`);
                await this.entityManager.createCharacter(JSON.stringify(character), setting, campaign);
            }
        }

        // Initialize the campaign characters
        for (const character of campaign.characters) {
            if (!(await this.entityManager.getCharacterFromContext(JSON.stringify(character), setting, campaign))) {
                this.logger.info(`Creating character: ${character.name}`);
                await this.entityManager.createCharacter(JSON.stringify(character), setting, campaign);
            }
        }

        // Initialize the storyline characters
        if (storyline != null) {
            for (const segment of storyline.segments) {
                for (const character of segment.characters) {
                    if (!(await this.entityManager.getCharacterFromContext(JSON.stringify(character), setting, campaign))) {
                        this.logger.info(`Creating character: ${character.name}`);
                        await this.entityManager.createCharacter(JSON.stringify(character), setting, campaign, storyline);
                    }
                }
            }
        }

    }

    // Initialize the factions for the campaign
    private async initializeFactions(setting: Setting, campaign: Campaign, storyline: Storyline|null): Promise<void> {
        // Initialize the setting factions
        for (const faction of setting.factions) {
            if(!(await this.entityManager.getFactionFromContext(JSON.stringify(faction), setting, campaign))) {
                this.logger.info(`Creating faction: ${faction.name}`);
                await this.entityManager.createFaction(JSON.stringify(faction), setting, campaign);
            }
        }

        // Initialize the campaign factions
        for (const faction of campaign.factions) {
            if(!(await this.entityManager.getFactionFromContext(JSON.stringify(faction), setting, campaign))) {
                this.logger.info(`Creating faction: ${faction.name}`);
                await this.entityManager.createFaction(JSON.stringify(faction), setting, campaign);
            }
        }

        // Initialize the storyline factions
        if (storyline != null) {
            for (const faction of storyline.factions) {
                if(!(await this.entityManager.getFactionFromContext(JSON.stringify(faction), setting, campaign))) {
                    this.logger.info(`Creating faction: ${faction.name}`);
                    await this.entityManager.createFaction(JSON.stringify(faction), setting, campaign, storyline);
                }
            }
        }

    }

    // Initialize the locations for the campaign
    private async initializeLocations(setting: Setting, campaign: Campaign, storyline: Storyline|null): Promise<void> {
        // Initialize the setting locations
        for (const location of setting.geography) {
            for (const settlement of location.settlements) {
                if(!(await this.entityManager.getLocationFromContext(JSON.stringify(settlement), setting, campaign))) {
                    this.logger.info(`Creating location: ${settlement.name}`);
                    await this.entityManager.createLocation(JSON.stringify(settlement), setting, campaign);
                }
            }
        }

        // Initialize the campaign locations
        for (const location of campaign.locations) {
            if(!(await this.entityManager.getLocationFromContext(JSON.stringify(location), setting, campaign))) {
                this.logger.info(`Creating location: ${location.name}`);
                await this.entityManager.createLocation(JSON.stringify(location), setting, campaign);
            }
        }

        // Initialize the storyline locations
        if (storyline != null) {
            for (const segment of storyline.segments) {
                for (const location of segment.locations) {
                    if(!(await this.entityManager.getLocationFromContext(JSON.stringify(location), setting, campaign))) {
                        this.logger.info(`Creating location: ${location.name}`);
                        await this.entityManager.createLocation(JSON.stringify(location), setting, campaign, storyline);
                    }
                }
            }
        }

    }

}

export { CampaignManager };
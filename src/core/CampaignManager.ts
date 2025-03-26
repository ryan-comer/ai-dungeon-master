import { ICampaignManager } from "./interfaces/ICampaignManager";

import { IFileStore } from "../utils/interfaces/IFileStore";
import { FileSystemStore } from "../utils/FileSystemStore";

import { ITextGenerationClient } from "../generation/clients/interfaces/ITextGenerationClient";
import { OllamaClient } from "../generation/clients/OllamaClient";
import { OpenAIClient } from "../generation/clients/OpenAIClient";
import { RepeatJsonGeneration } from "../generation/clients/utils";

import { Campaign, CampaignCodec } from "./campaigns/models/Campaign";
import { Setting, SettingCodec } from "./campaigns/models/Setting";
import { Storyline, StorylineCodec } from "./campaigns/models/Storyline";
import { Character, CharacterCodec } from "./campaigns/models/Character";
import { Faction, FactionCodec } from "./campaigns/models/Faction";
import { Location, LocationCodec } from "./campaigns/models/Location";

import { EntityType, ISemanticIndex } from "./interfaces/ISemanticIndex";
import { SemanticIndex } from "./SemanticIndex";

import { isRight } from "fp-ts/lib/Either";

class CampaignManager implements ICampaignManager {

    private fileStore: IFileStore;
    private textGenerationClient: ITextGenerationClient;

    constructor() {
        this.fileStore = new FileSystemStore();

        this.textGenerationClient = new OllamaClient();
        //this.textGenerationClient = new OpenAIClient(process.env.OPENAI_API_KEY || "");
    }

    async createSetting(userPrompt: string): Promise<string> {
        const prompt: string = `
            Create a setting for a campaign in dnd. This will be a high-level description of the world, its inhabitants, places, and the general state of things.
            This setting will be used to generate storylines for players to play through.

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

        this.fileStore.saveFile(this.fileStore.getSettingPath(settingJson.name), setting);

        return settingJson.name;    
    }

    async createCampaign(settingName: string, userPrompt: string): Promise<string> {
        const setting: string = this.fileStore.loadFile(this.fileStore.getSettingPath(settingName));
        const prompt: string = `
            Create a campaign using the following setting:

            ${setting}

            ${userPrompt.length > 0 ? `The campaign should match the following user prompt: ${userPrompt}` : ""}

            The campaign will be a high-level description of the story, characters, locations, etc.
            The campaign is a larger storyline that the players will play through, and it will be made up of multiple storylines that the players will play through.
            The campaign should have a clear objective and premise that the players will work towards, and all the objectives should align with the premise and tell a cohesive story.
            The campaign will have milestones that the players will work towards. Each milestone should build on top of one another to tell the larger story of the campaign.
            The milestones will be used to create storylines that the players will play through, and each storyline should build towards the campaign's goals.
            Give me the campaign in the following JSON format. Do not skip any fields, all fields are required:

            {
                "name": "Name of the campaign",
                "description": "Description of the campaign",
                "objectives": ["Objectives in the campaign"],
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

        this.fileStore.saveFile(this.fileStore.getCampaignPath(settingName, campaignJson.name), campaign);

        // Initialize the entities for the campaign
        await this.initializeCharacters(JSON.parse(setting), JSON.parse(campaign), null);
        await this.initializeFactions(JSON.parse(setting), JSON.parse(campaign), null);
        await this.initializeLocations(JSON.parse(setting), JSON.parse(campaign), null);

        return campaignJson.name;
    }

    async createStoryline(settingName: string, campaignName: string, milestoneIndex: number, userPrompt: string): Promise<string> {
        const setting: string = this.fileStore.loadFile(this.fileStore.getSettingPath(settingName));
        const campaign: string = this.fileStore.loadFile(this.fileStore.getCampaignPath(settingName, campaignName));
        const milestone = JSON.parse(campaign).milestones[milestoneIndex];

        const prompt = `
        Create a storyline for the following campaign:

        ${campaign}

        ${userPrompt.length > 0 ? `The storyline should match the following user prompt: ${userPrompt}` : ""}

        The storyline will be a self-contained story within the context of the campaign.
        The storyline should only be a part of the larger campaign, not the whole thing.
        The purpose of the storyline is to be a self-contained portion of the larger campaign that builds towards the campaign's goals.
        If the campaign is to save the world, the storyline could be about finding a powerful artifact that will help in the final battle.

        The storyline should be for the following milestone in the campaign. Make sure the storyline's objective aligns with the milestone's description.
        Here is the milestone to base the storyline on:

        ${milestone.toString()}

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

        this.fileStore.saveFile(this.fileStore.getStorylinePath(settingName, campaignName, `${milestoneIndex}_${storylineJson.name}`), storyline);

        // Initialize the entities for the storyline
        await this.initializeCharacters(JSON.parse(setting), JSON.parse(campaign), storylineJson);
        await this.initializeFactions(JSON.parse(setting), JSON.parse(campaign), storylineJson);
        await this.initializeLocations(JSON.parse(setting), JSON.parse(campaign), storylineJson);

        return storylineJson.name;
    }

    async getSetting(settingName: string): Promise<string> {
        return this.fileStore.loadFile(this.fileStore.getSettingPath(settingName));
    }
    async getCampaign(settingName: string, campaignName: string): Promise<string> {
        return this.fileStore.loadFile(this.fileStore.getCampaignPath(settingName, campaignName));
    }
    async getStoryline(settingName: string, campaignName: string, storylineName: string): Promise<string> {
        return this.fileStore.loadFile(this.fileStore.getStorylinePath(settingName, campaignName, storylineName));
    }

    private getCharacterPrompt(setting: Setting, campaign: Campaign, storyline: Storyline|null, character: string): string {
        return `
        I want you to generate a character for a campaign.
        I am going to give you context in which to generate the character.
        I am also going to give you the character that I want you to generate.
        I want you to generate JSON for the character based on the context

        ${setting ? "Here is the setting: " + JSON.stringify(setting) : ""}
        ${campaign ? "Here is the campaign: " + JSON.stringify(campaign) : ""}
        ${storyline ? "Here is the storyline: " + JSON.stringify(storyline) : ""}

        I want you to give me the character in the following JSON format. Do not skip any fields, all fields are required:

        {
            "name": "Name of the character",
            "campaignRole": "Role in the campaign",
            "alignment": "Alignment",
            "factions": [{   // Empty array if none
                "name": "Name of the faction",
                "description": "Description of the faction"
                "role": "Role in the faction"
            }],
            "job": "Job or class of the character",
            "physicalDescription": {
                "age": "Age of the character",
                "gender": "Gender",
                "height": "Height of the character",
                "build": "Physical build: e.g. slender",
                "notableFeatures": ["Notable features"],   // Empty array if none
                "attire": "What do they wear"
            },
            "personality": {
                "general": "General personality traits",
                "strengths": ["Positive personality traits"],   // Empty array if none
                "flaws": ["Negative personality traits"],   // Empty array if none
                "mannerisms": ["Any mannerisms the character has"]   // Empty array if none
            },
            "background": {
                "origin": "Where were they born or created",
                "significant_events": ["Significant events in their life"]   // Empty array if none
            },
            "goals": {
                "shortTerm": ["Short term goals the character has"],   // Empty array if none
                "long_term_goals": ["Long term goals the character has"]   // Empty array if none
            },
            "fears": ["Any fears the character has"]   // Empty array if none
            "relationships": {
                "allies": [   // Empty array if none
                    {
                        "name": "Name",
                        "relationship": "Relationship with character",
                        "notes": "Notes about the relationship"
                    }
                ],
                "enemies": [   // Empty array if none
                    {
                        "name": "Name",
                        "relationship": "Relationship with character",
                        "notes": "Notes about the relationship"
                    }
                ]
            },
            "skills": {
                "magic": ["Any magical skills - if any"],   // Empty array if none
                "combat": ["Any combat skills - if any],   // Empty array if none
                "languages_spoken": ["Any languages spoken - if any"]   // Empty array if none
            },
            "equipment": [   // Empty array if none
                {
                    "name": "Item name",
                    "description": "Item description"
                }
            ],
            "wealth": "Description of their wealth",
            "campaign": {
                "relevance": "Relevance to the campaign",
                "hooks": ["Quest hooks - what do they want from the player"]   // Empty array if none
            },
            "achievements": ["Any achievements the character has made"],   // Empty array if none
            "dialogExamples": ["Examples of how the character talks, specific chat examples"]   // Empty array if none
        }
        
        The following JSON describes the character that I want you to generate the JSON for.
        Use this JSON as the basis for the character you generate.
        Do not generate a random character, it needs to be based on the following character:
        ${character}

        Only reply with JSON, nothing else.
        `;
    }

    private getFactionPrompt(setting: Setting, campaign: Campaign, storyline: Storyline|null, faction: string): string {
        const prompt = `
        I want you to generate a faction for a campaign.
        I am going to give you the context to base the faction on in JSON format.
        I am also going to give you the faction that I want you to generate.
        I want you to generate JSON for the faction based on the context.

        ${setting ? "Here is the setting: " + JSON.stringify(setting) : ""}
        ${campaign ? "Here is the campaign: " + JSON.stringify(campaign) : ""}
        ${storyline ? "Here is the storyline: " + JSON.stringify(storyline) : ""}

        I want you to give me the faction in the following JSON format. Do not skip any fields, all fields are required:

        {
            "name": "Name of the faction",
            "description": "Description of the faction",
            "alignment": "Alignment of the faction",
            "goals": ["Goals of the faction"],   // Empty array if none
            "philosophy": "Philosophy of the faction",
            "history": {
                "founded": "Date the faction was founded",
                "founder": "Name of the founder",
                "origin": "Origin of the faction"
            },
            "members": [   // Empty array if none
                {
                    "name": "Name of the member",
                    "role": "Role of the member in the faction",
                    "description": "Description of the member"
                }
            ],
            "allies": [   // Empty array if none
                {
                    "name": "Name of the ally",
                    "relationship": "Relationship with the faction",
                }
            ],
            "enemies": [   // Empty array if none
                {
                    "name": "Name of the enemy",
                    "relationship": "Relationship with the faction",
                }
            ],
            "assets": {
                "bases": [   // Empty array if none
                    {
                        "name": "Name of the base",
                        "location": "Location of the base",
                        "description": "Description of the base"
                    }
                ],
                "artifacts": [   // Empty array if none
                    {
                        "name": "Name of the artifact",
                        "description": "Description of the artifact"
                    }
                ]
            },
            "operations": ["Things that the faction does"],   // Empty array if none
            "achievements": [   // Empty array if none
                {
                    "name": "Name of the achievement",
                    "description": "Description of the achievement"
                }
            ],
            "publicPerception": "How the public perceives the faction",
            "campaign": {
                "relevance": "Relevance to the campaign",
                "hooks": ["Quest hooks - what do they want from the player"]   // Empty array if none
            }
        }
        
        The following JSON describes the faction that I want you to generate the JSON for.
        Use this JSON as the basis for the faction you generate.
        Do not generate a random faction, it needs to be based on the following faction:
        ${faction}

        Only reply with JSON, nothing else.
        `

        return prompt;
    }

    private getLocationPrompt(setting: Setting, campaign: Campaign, storyline: Storyline|null, location: string): string {
        const prompt = `
        I want you to generate a location for a campaign.
        I am going to give you the context to base the location on in JSON format.
        I am also going to give you the location that I want you to generate.
        I want you to generate JSON for the location based on the context.

        ${setting ? "Here is the setting: " + JSON.stringify(setting) : ""}
        ${campaign ? "Here is the campaign: " + JSON.stringify(campaign) : ""}
        ${storyline ? "Here is the storyline: " + JSON.stringify(storyline) : ""}

        I want you to give me the location in the following JSON format. Do not skip any fields, all fields are required:

        {
            "name": "Name of the location",
            "description": "Description of the location",
            "locationType": "Type of location (e.g. 'city', 'forest', 'mountain', etc.)",
            "geography": {
                "climate": "Climate of the location",
                "terrain": "Terrain of the location",
                "features": ["Key features of the location"],   // Empty array if none
            },
            "population": {
                "size": "Size of the population",
                "demographics": [   // Empty array if none
                    {
                        "name": "Name of the demographic",
                        "description": "Description of the demographic",
                        "percentage": "Percentage of the population"
                    }
                ]
            },
            "government": {
                "type": "Type of government",
                "ruler": "Ruler of the location",
                "laws": ["Laws of the location"]   // Empty array if none
            },
            "economy": {
                "type": "Type of economy",
                "resources": ["Key resources of the location"],   // Empty array if none
                "currency": "Currency used in the location"
            },
            defenses: {
                "military": "Military strength of the location",
                "fortifications": ["Key fortifications of the location"]   // Empty array if none
            },
            "culture": {
                "religion": "Religion of the location",
                "traditions": ["Key traditions of the location"],   // Empty array if none
                "festivals": ["Key festivals of the location"]  // Empty array if none
            },
            "people": [   // Empty array if none
                {
                    "name": "Name of the person",
                    "description": "Description of the person",
                    "role": "Role of the person in the location"
                }
            ]
            "campaign": {
                "relevance": "Relevance to the campaign",
                "hooks": ["Quest hooks - what do they want from the player"]   // Empty array if none
            },
            "history": [   // Empty array if none
                {
                    "name": "Name of the event",
                    "description": "Description of the event",
                    "date": "Date of the event"
                }
            ],
            "factions": [   // Empty array if none
                {
                    "name": "Name of the faction",
                    "description": "Description of the faction",
                    "relevance": "Relevance of the faction to the location"
                }
            ]
        }

        The following JSON describes the location that I want you to generate the JSON for.
        Use this JSON as the basis for the location you generate.
        Do not generate a random location, it needs to be based on the following location:
        ${location}

        Only reply with JSON, nothing else.
        `

        return prompt;
    }

    // Initialize the characters for the campaign
    private async initializeCharacters(setting: Setting, campaign: Campaign, storyline: Storyline|null): Promise<void> {
        const semanticIndex: ISemanticIndex = new SemanticIndex(setting.name, campaign.name);

        const initializeCharacter = (characterName: string, character: string): Promise<void> => {
            return new Promise(async (resolve, reject) => {
                // Check if the character already exists in the semantic index
                let entity: string | null = await semanticIndex.getEntity(EntityType.Character, character);

                if (entity == null) {
                    // Add the character to the semantic index
                    const prompt: string = this.getCharacterPrompt(setting, campaign, storyline, character)
                    const newCharacter: string = await RepeatJsonGeneration(prompt, async (repeatPrompt: string): Promise<string> => {
                        const repeatResponse: string = await this.textGenerationClient.generateText(repeatPrompt);
                        return repeatResponse;
                    }, (response: string): boolean => {
                        try {
                            const result = CharacterCodec.decode(JSON.parse(response));
                            return isRight(result); // Use isRight to check if validation is successful
                        } catch (e) {
                            console.error("Error validating character JSON:", e);
                            return false; // Return false if validation fails
                        }
                    });

                    await semanticIndex.addEntity(EntityType.Character, characterName, character, newCharacter);
                }

                resolve();
            });
        }

        // Initialize the setting characters
        for (const character of setting.notableFigures) {
            await initializeCharacter(character.name, JSON.stringify(character));
        }

        // Initialize the campaign characters
        for (const character of campaign.characters) {
            await initializeCharacter(character.name, JSON.stringify(character));
        }

        // Initialize the storyline characters
        if (storyline != null) {
            for (const segment of storyline.segments) {
                for (const character of segment.characters) {
                    await initializeCharacter(character.name, JSON.stringify(character));
                }
            }
        }

    }

    // Initialize the factions for the campaign
    private async initializeFactions(setting: Setting, campaign: Campaign, storyline: Storyline|null): Promise<void> {
        const semanticIndex: ISemanticIndex = new SemanticIndex(setting.name, campaign.name);

        const initializeFaction = (factionName: string, faction: string): Promise<void> => {
            return new Promise(async (resolve, reject) => {
                // Check if the faction already exists in the semantic index
                let entity: string | null = await semanticIndex.getEntity(EntityType.Faction, faction);

                if (entity == null) {
                    // Add the faction to the semantic index
                    const prompt: string = this.getFactionPrompt(setting, campaign, storyline, faction)
                    const newFaction: string = await RepeatJsonGeneration(prompt, async (repeatPrompt: string): Promise<string> => {
                        const repeatResponse: string = await this.textGenerationClient.generateText(repeatPrompt);
                        return repeatResponse;
                    }, (response: string): boolean => {
                        try {
                            const result = FactionCodec.decode(JSON.parse(response));
                            return isRight(result); // Use isRight to check if validation is successful
                        } catch (e) {
                            console.error("Error validating faction JSON:", e);
                            return false; // Return false if validation fails
                        }
                    });

                    await semanticIndex.addEntity(EntityType.Faction, factionName, faction, newFaction);
                }

                resolve();
            });
        }

        // Initialize the setting factions
        for (const faction of setting.factions) {
            await initializeFaction(faction.name, JSON.stringify(faction));
        }

        // Initialize the campaign factions
        for (const faction of campaign.factions) {
            await initializeFaction(faction.name, JSON.stringify(faction));
        }

        // Initialize the storyline factions
        if (storyline != null) {
            for (const faction of storyline.factions) {
                await initializeFaction(faction.name, JSON.stringify(faction));
            }
        }

    }

    // Initialize the locations for the campaign
    private async initializeLocations(setting: Setting, campaign: Campaign, storyline: Storyline|null): Promise<void> {
        const semanticIndex: ISemanticIndex = new SemanticIndex(setting.name, campaign.name);

        const initializeLocation = (locationName: string, location: string): Promise<void> => {
            return new Promise(async (resolve, reject) => {
                // Check if the location already exists in the semantic index
                let entity: string | null = await semanticIndex.getEntity(EntityType.Location, location);

                if (entity == null) {
                    // Add the location to the semantic index
                    const prompt: string = this.getLocationPrompt(setting, campaign, storyline, location)
                    const newLocation: string = await RepeatJsonGeneration(prompt, async (repeatPrompt: string): Promise<string> => {
                        const repeatResponse: string = await this.textGenerationClient.generateText(repeatPrompt);
                        return repeatResponse;
                    }, (response: string): boolean => {
                        try {
                            const result = LocationCodec.decode(JSON.parse(response));
                            return isRight(result); // Use isRight to check if validation is successful
                        } catch (e) {
                            console.error("Error validating location JSON:", e);
                            return false; // Return false if validation fails
                        }
                    });

                    await semanticIndex.addEntity(EntityType.Location, locationName, location, newLocation);
                }

                resolve();
            });
        }

        // Initialize the setting locations
        for (const location of setting.geography) {
            for (const settlement of location.settlements) {
                await initializeLocation(settlement.name, JSON.stringify(settlement));
            }
        }

        // Initialize the campaign locations
        for (const location of campaign.locations) {
            await initializeLocation(location.name, JSON.stringify(location));
        }

        // Initialize the storyline locations
        if (storyline != null) {
            for (const segment of storyline.segments) {
                for (const location of segment.locations) {
                    await initializeLocation(location.name, JSON.stringify(location));
                }
            }
        }

    }

}

export { CampaignManager };
import { ICampaignManager } from "./interfaces/ICampaignManager";

import { IFileStore } from "../utils/interfaces/IFileStore";
import { FileSystemStore } from "../utils/FileSystemStore";

import { ITextGenerationClient } from "../generation/clients/interfaces/ITextGenerationClient";
import { OllamaClient } from "../generation/clients/OllamaClient";

class CampaignManager implements ICampaignManager {

    private fileStore: IFileStore;
    private textGenerationClient: ITextGenerationClient;

    private baseDir: string = "settings";

    constructor() {
        this.fileStore = new FileSystemStore();
        this.textGenerationClient = new OllamaClient();
    }

    async createSetting(userPrompt: string): Promise<string> {
        const prompt: string = `
            Create a setting for a campaign in dnd. This will be a high-level description of the world, its inhabitants, places, and the general state of things.
            This setting will be used to generate storylines for players to play through.

            ${userPrompt.length > 0 ? `The setting should match the following user prompt: ${userPrompt}` : ""}

            Give me the setting in the following JSON format:

            {
                "name": "Name of the setting",
                "description": "Description of the world",
                "geography": [
                    {
                        "name": "Name of the region",
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

        const setting: string = await this.textGenerationClient.generateText(prompt);
        console.log(setting)
        const settingJson = JSON.parse(setting);
        this.fileStore.saveFile(this.getSettingPath(settingJson.name), setting);

        return settingJson.name;    
    }

    async createCampaign(settingName: string, userPrompt: string): Promise<string> {
        const setting: string = this.fileStore.loadFile(this.getSettingPath(settingName));
        const prompt: string = `
            Create a campaign using the following setting:

            ${setting}

            ${userPrompt.length > 0 ? `The campaign should match the following user prompt: ${userPrompt}` : ""}

            The campaign will be a high-level description of the story, characters, locations, etc.
            This is the main storyline that players will play through.
            This will be used to create storylines that build on the goals of the campaign.
            Give me the campaign in the following JSON format:

            {
                "name": "Name of the campaign",
                "overview": {
                    "description": "Description of the campaign",
                    "objective": "Objective of the campaign",
                    "premise": "Premise of the campaign"
                },
                "factions": [
                    {
                        "name": "Name of the faction",
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

        const campaign: string = await this.textGenerationClient.generateText(prompt);
        console.log(campaign)
        const campaignJson = JSON.parse(campaign);
        this.fileStore.saveFile(this.getCampaignPath(settingName, campaignJson.name), campaign);

        return campaignJson.name;
    }

    async createStoryline(settingName: string, campaignName: string, milestoneIndex: number, userPrompt: string): Promise<string> {
        const campaign: string = this.fileStore.loadFile(this.getCampaignPath(settingName, campaignName));
        const milestone = JSON.parse(campaign).milestones[milestoneIndex];

        console.dir(milestone);

        const prompt = `
        Create a storyline for the following campaign:

        ${campaign}

        ${userPrompt.length > 0 ? `The storyline should match the following user prompt: ${userPrompt}` : ""}

        The storyline will be a self-contained story within the context of the campaign.
        The storyline should only be a part of the larger campaign, not the whole thing.
        The purpose of the storyline is to be a self-contained portion of the larger campaign that builds towards the campaign's goals.
        If the campaign is to save the world, the storyline could be about finding a powerful artifact that will help in the final battle.
        The storyline should describe the people, places, and events that the players will encounter.
        The storyline should have a clear goal or objective for the players to achieve.

        The storyline should be for the following milestone in the campaign. Make sure the storyline's objective aligns with the milestone's description.
        Here is the milestone to base the storyline on:
        ${milestone.toString()}

        Give me the storyline in the following JSON format:

        {
            "name": "Name of the storyline",
            "Description": "Description of the storyline",
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
            "factions": [
                {
                    "name": "Name of the faction",
                    "relevance": "Relevance of the faction to the storyline"
                }
            ]
        }
        `;

        const storyline: string = await this.textGenerationClient.generateText(prompt);
        console.log(storyline)
        const storylineJson = JSON.parse(storyline);
        this.fileStore.saveFile(this.getStorylinePath(settingName, campaignName, storylineJson.name), storyline);

        return storylineJson.name;
    }

    deleteCampaign(): void {
        console.log("Deleting a campaign...");
    }
    updateCampaign(): void {
        console.log("Updating a campaign...");
    }
    getCampaign(name: string): void {
        console.log("Getting a campaign...");
    }

    // Helper functions to get paths
    getSettingPath(settingName: string): string {
        return `${this.baseDir}/${this.stripInvalidFilenameChars(settingName)}/setting.json`;
    }
    getCampaignPath(settingName: string, campaignName: string): string {
        return `${this.baseDir}/${this.stripInvalidFilenameChars(settingName)}/${this.stripInvalidFilenameChars(campaignName)}/campaign.json`;
    }
    getStorylinePath(settingName: string, campaignName: string, storylineName: string): string {
        return `${this.baseDir}/${this.stripInvalidFilenameChars(settingName)}/${this.stripInvalidFilenameChars(campaignName)}/storylines/${this.stripInvalidFilenameChars(storylineName)}.json`;
    }
    stripInvalidFilenameChars(name: string): string {
        return name.replace(/[^a-z0-9]/gi, "_");
    }

}

export { CampaignManager };
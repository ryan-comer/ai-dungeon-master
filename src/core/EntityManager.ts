import { IEntityManager } from "./interfaces/IEntityManager";
import { EntityType } from "./interfaces/ISemanticIndex";

import { Character } from "./models/Character";
import { Location } from "./models/Location";
import { Faction } from "./models/Faction";
import { Setting } from "./models/Setting";
import { Campaign } from "./models/Campaign";
import { Storyline } from "./models/Storyline";

import { CharacterCodec } from "./models/Character";
import { LocationCodec } from "./models/Location";
import { FactionCodec } from "./models/Faction";
import { isRight } from "fp-ts/lib/Either";

import { ITextGenerationClient } from "../generation/clients/interfaces/ITextGenerationClient";
import { IImageGenerationClient } from "../generation/clients/interfaces/IImageGenerationClient";

import { ISemanticIndex } from "./interfaces/ISemanticIndex";
import { SemanticIndex } from "./SemanticIndex";

import { RepeatJsonGeneration } from "../generation/clients/utils";

import { IFileStore } from "../utils/interfaces/IFileStore";

import path from "path";
import { OllamaClient } from "../generation/clients/OllamaClient";
import { OpenAIClient } from "../generation/clients/OpenAIClient";

class EntityManager implements IEntityManager {

    textGenerationClient: ITextGenerationClient;
    imageGenerationClient: IImageGenerationClient;

    semanticIndex: ISemanticIndex;
    fileStore: IFileStore;

    constructor(textGenerationClient: ITextGenerationClient, imageGenerationClient: IImageGenerationClient, fileStore: IFileStore) {
        this.textGenerationClient = textGenerationClient;
        this.imageGenerationClient = imageGenerationClient;

        this.semanticIndex = new SemanticIndex(textGenerationClient, fileStore);
        this.fileStore = fileStore;
    }

    private getContextPrompt(entity: Character|Faction|Location): string {
        return `
        I want you to generate a context blob for a ${entity.constructor.name}.
        I am going to give you the JSON for the ${entity.constructor.name}.
        I want you to generate a blob based on the JSON.
        The blob should be a high-level JSON that I can use to search for the ${entity.constructor.name}.
        It can follow any format you like, as long as it captures the essence of the ${entity.constructor.name}.

        Here is the JSON for the ${entity.constructor.name}:
        ${JSON.stringify(entity)}

        Only reply with JSON, nothing else.
        `;
    }

    private getCharacterPrompt(character: string, setting?: Setting, campaign?: Campaign, storyline?: Storyline): string {
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
            "description": "Description of the character",
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

    private getFactionPrompt(faction: string, setting?: Setting, campaign?: Campaign, storyline?: Storyline): string {
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

    private getLocationPrompt(location: string, setting?: Setting, campaign?: Campaign, storyline?: Storyline): string {
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



    async createCharacter(userPrompt: string, setting: Setting, campaign: Campaign, storyline?: Storyline): Promise<Character> {
        // Create a new character
        const prompt: string = this.getCharacterPrompt(userPrompt, setting, campaign, storyline)
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

        const character: Character = JSON.parse(newCharacter);

        // Get the context for the character
        const context: string = await RepeatJsonGeneration(this.getContextPrompt(character), async (repeatPrompt: string): Promise<string> => {
            const repeatResponse: string = await this.textGenerationClient.generateText(repeatPrompt);
            return repeatResponse;
        });

        // Add the character to the semantic index
        await this.semanticIndex.addEntity(EntityType.Character, character.name, JSON.stringify(JSON.parse(context), null, '\t'), newCharacter, setting, campaign);

        // Get the prompt for the character portrait
        /*
        const portraitPrompt: string = await this.textGenerationClient.generateText(`
            I want you to give me a prompt to generate a dnd character portrait for a character.
            This prompt will be used in an image generator to create a portrait for the character.
            I will give you the character JSON as well as JSON for the setting and the campaign and you will use it to create the prompt.
            Make sure the prompt is descriptive enough to capture the essence of the character.

            Here is the setting JSON: ${JSON.stringify(setting)}
            Here is the campaign JSON: ${JSON.stringify(campaign)}
            ${storyline ? "Here is the storyline JSON: " + JSON.stringify(storyline) : ""}

            Here is the character JSON for the character I want you to create a portrait for:
            ${newCharacter}

            Only reply with text, nothing else. Preface your response with 'A DnD character portrait of'
        `);

        //await this.textGenerationClient.unloadModel();
        const imageData: string = await this.imageGenerationClient.generateImage(portraitPrompt);
        //await this.imageGenerationClient.unloadModel();

        await this.fileStore.saveCharacterImage(setting.name, campaign.name, character.name, "portrait.png", imageData);
        */
        return character;
    }

    async createLocation(userPrompt: string, setting: Setting, campaign: Campaign, storyline?: Storyline): Promise<Location> {
        // Create a new location
        const prompt: string = this.getLocationPrompt(userPrompt, setting, campaign, storyline)
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

        const location: Location = JSON.parse(newLocation);

        // Get the context for the location
        //const context: string = await this.textGenerationClient.generateText(this.getContextPrompt(location));
        const context: string = await RepeatJsonGeneration(this.getContextPrompt(location), async (repeatPrompt: string): Promise<string> => {
            const repeatResponse: string = await this.textGenerationClient.generateText(repeatPrompt);
            return repeatResponse;
        });

        // Add the character to the semantic index
        await this.semanticIndex.addEntity(EntityType.Location, location.name, context, newLocation, setting, campaign);

        // Get the prompt for the location image
        /*
        const imagePrompt: string = await this.textGenerationClient.generateText(`
            I want you to give me a prompt to generate an image for a location in a dnd campaign.
            This image will be used as the backdrop for the location (e.g. what the players see when they arrive at the location).
            This prompt will be used in an image generator to create an image for the location
            I will give you the location JSON as well as JSON for the setting and the campaign and you will use it to create the prompt.
            Make sure the prompt is descriptive enough to capture the essence of the location.

            Here is the setting JSON: ${JSON.stringify(setting)}
            Here is the campaign JSON: ${JSON.stringify(campaign)}
            ${storyline ? "Here is the storyline JSON: " + JSON.stringify(storyline) : ""}

            Here is the location JSON for the character I want you to create an image for:
            ${newLocation}

            Only reply with the text for the prompt that describe the location, nothing else.
        `);

        //await this.textGenerationClient.unloadModel();
        const imageData: string = await this.imageGenerationClient.generateImage(imagePrompt);
        //await this.imageGenerationClient.unloadModel();

        await this.fileStore.saveLocationImage(setting.name, campaign.name, location.name, "background.png", imageData);
        */

        return location;
    }

    async createFaction(userPrompt: string, setting: Setting, campaign: Campaign, storyline?: Storyline): Promise<Faction> {
        // Create a new faction
        const prompt: string = this.getFactionPrompt(userPrompt, setting, campaign, storyline)
        const newFaction: string = await RepeatJsonGeneration(prompt, async (repeatPrompt: string): Promise<string> => {
            const repeatResponse: string = await this.textGenerationClient.generateText(repeatPrompt);
            return repeatResponse;
        }, (response: string): boolean => {
            try {
                const result = FactionCodec.decode(JSON.parse(response));
                return isRight(result);
            } catch (e) {
                console.error("Error validating faction JSON:", e);
                return false;
            }
        });

        const faction: Faction = JSON.parse(newFaction);

        // Get the context for the faction
        //const context: string = await this.textGenerationClient.generateText(this.getContextPrompt(faction));
        const context: string = await RepeatJsonGeneration(this.getContextPrompt(faction), async (repeatPrompt: string): Promise<string> => {
            const repeatResponse: string = await this.textGenerationClient.generateText(repeatPrompt);
            return repeatResponse;
        });

        // Add the faction to the semantic index
        await this.semanticIndex.addEntity(EntityType.Faction, faction.name, context, newFaction, setting, campaign);

        // Get the prompt for the faction image
        /*
        const imagePrompt: string = await this.textGenerationClient.generateText(`
            I want you to give me a prompt to generate an image for an emblem that represents a faction in a dnd campaign.
            This prompt will be used in an image generator to create an image of an emblem for the faction
            I will give you the faction JSON and you will use it to create the prompt
            Make sure the prompt is descriptive enough to capture the essence of the faction and how it would be represented in an emblem

            Here is the faction JSON for the faction I want you to create an emblem for:
            ${faction}

            Only reply with the text of the prompt that describes the emblem, nothing else.
            Start your response with 'An emblem for the faction'
        `);

        console.log(imagePrompt)

        //await this.textGenerationClient.unloadModel();
        const imageData: string = await this.imageGenerationClient.generateImage(imagePrompt);
        //await this.imageGenerationClient.unloadModel();

        await this.fileStore.saveFactionImage(setting.name, campaign.name, faction.name, "emblem.png", imageData);
        */

        return faction;
    }

    async getCharacterFromContext(context: string, setting: Setting, campaign: Campaign): Promise<Character | null> {
        const character:  Character | null = await this.semanticIndex.getEntity(EntityType.Character, context, setting, campaign);
        return character;
    }
    async getLocationFromContext(context: string, setting: Setting, campaign: Campaign): Promise<Location | null> {
        const location: Location | null = await this.semanticIndex.getEntity(EntityType.Location, context, setting, campaign);
        return location;
    }
    async getFactionFromContext(context: string, setting: Setting, campaign: Campaign): Promise<Faction | null> {
        const faction: Faction | null = await this.semanticIndex.getEntity(EntityType.Faction, context, setting, campaign);
        return faction;
    }

    async getCharacter(name: string, setting: Setting, campaign: Campaign): Promise<Character | null> {
        const character: Character | null = await this.fileStore.getCharacter(setting.name, campaign.name, name);
        return character;
    }

    async getLocation(name: string, setting: Setting, campaign: Campaign): Promise<Location | null> {
        const location: Location | null = await this.fileStore.getLocation(setting.name, campaign.name, name);
        return location;
    }

    async getFaction(name: string, setting: Setting, campaign: Campaign): Promise<Faction | null> {
        const faction: Faction | null = await this.fileStore.getFaction(setting.name, campaign.name, name);
        return faction;
    }

    async getCharacters(setting: Setting, campaign: Campaign): Promise<Character[]> {
        const characters: Character[] = await this.fileStore.getCharacters(setting.name, campaign.name);
        return characters;
    }

    async getLocations(setting: Setting, campaign: Campaign): Promise<Location[]> {
        const locations: Location[] = await this.fileStore.getLocations(setting.name, campaign.name);
        return locations;
    }

    async getFactions(setting: Setting, campaign: Campaign): Promise<Faction[]> {
        const factions: Faction[] = await this.fileStore.getFactions(setting.name, campaign.name);
        return factions;
    }
}

export { EntityManager };
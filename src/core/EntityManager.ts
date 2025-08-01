import { IEntityManager } from "./interfaces/IEntityManager";
import { EntityType } from "./interfaces/ISemanticIndex";

import { Character } from "./models/Character";
import { Location } from "./models/Location";
import { Faction } from "./models/Faction";
import { Setting } from "./models/Setting";
import { Campaign } from "./models/Campaign";
import { Storyline } from "./models/Storyline";

import { Schema } from '@google/genai';
import { CharacterSchema } from "./models/google/CharacterSchema";
import { LocationSchema } from "./models/google/LocationSchema";
import { FactionSchema } from "./models/google/FactionSchema";

import { ITextGenerationClient } from "../generation/clients/interfaces/ITextGenerationClient";
import { IImageGenerationClient } from "../generation/clients/interfaces/IImageGenerationClient";

import { ISemanticIndex } from "./interfaces/ISemanticIndex";
import { SemanticIndex } from "./SemanticIndex";

// Removed RepeatJsonGeneration in favor of structured output calls

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

        Now generate the context blob based on the JSON.
        The keys should be descriptive and capture the essence of the ${entity.constructor.name}.
        Only reply with JSON, nothing else (no markdown code fences).
        `;
    }

    // helper to strip markdown code fences from AI responses
    private stripCodeFences(raw: string): string {
        return raw.replace(/^```(?:\w*)?\s*/, "").replace(/\s*```$/, "");
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

        The following JSON describes the location that I want you to generate the JSON for.
        Use this JSON as the basis for the location you generate.
        Do not generate a random location, it needs to be based on the following location:
        ${location}

        Only reply with JSON, nothing else.
        `

        return prompt;
    }



    async createCharacter(userPrompt: string, setting: Setting, campaign: Campaign, storyline?: Storyline): Promise<Character> {
        // Generate structured Character output
        const prompt = this.getCharacterPrompt(userPrompt, setting, campaign, storyline);
        const character: Character = await this.textGenerationClient.generateText<Character>(
            prompt,
            [],
            undefined,
            undefined,
            CharacterSchema
        );

        // Generate context blob and strip fences
        const rawContext: string = await this.textGenerationClient.generateText<string>(
            this.getContextPrompt(character)
        );
        const context: string = this.stripCodeFences(rawContext);

        // Add to semantic index
        await this.semanticIndex.addEntity(
            EntityType.Character,
            character.name,
            JSON.stringify(JSON.parse(context), null, '\t'),
            JSON.stringify(character, null, '\t'),
            setting,
            campaign
        );

        return character;
    }

    async createLocation(userPrompt: string, setting: Setting, campaign: Campaign, storyline?: Storyline): Promise<Location> {
        // Generate structured Location output
        const prompt = this.getLocationPrompt(userPrompt, setting, campaign, storyline);
        const location: Location = await this.textGenerationClient.generateText<Location>(
            prompt,
            [],
            undefined,
            undefined,
            LocationSchema
        );

        // Generate context blob and strip fences
        const rawContext: string = await this.textGenerationClient.generateText<string>(
            this.getContextPrompt(location)
        );
        const context: string = this.stripCodeFences(rawContext);

        // Add to semantic index
        await this.semanticIndex.addEntity(
            EntityType.Location,
            location.name,
            context,
            JSON.stringify(location, null, '\t'),
            setting,
            campaign
        );

        return location;
    }

    async createFaction(userPrompt: string, setting: Setting, campaign: Campaign, storyline?: Storyline): Promise<Faction> {
        // Generate structured Faction output
        const prompt = this.getFactionPrompt(userPrompt, setting, campaign, storyline);
        const faction: Faction = await this.textGenerationClient.generateText<Faction>(
            prompt,
            [],
            undefined,
            undefined,
            FactionSchema
        );

        // Generate context blob and strip fences
        const rawContext: string = await this.textGenerationClient.generateText<string>(
            this.getContextPrompt(faction)
        );
        const context: string = this.stripCodeFences(rawContext);

        // Add to semantic index
        await this.semanticIndex.addEntity(
            EntityType.Faction,
            faction.name,
            context,
            JSON.stringify(faction, null, '\t'),
            setting,
            campaign
        );

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
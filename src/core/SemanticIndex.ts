import { ISemanticIndex, EntityType } from "./interfaces/ISemanticIndex";
import { IFileStore } from "../utils/interfaces/IFileStore";

import { ITextGenerationClient } from "../generation/clients/interfaces/ITextGenerationClient";
import { OllamaClient } from "../generation/clients/OllamaClient";
import { RepeatJsonGeneration } from "../generation/clients/utils";

import { Setting } from "./models/Setting";
import { Campaign } from "./models/Campaign";

import { stripInvalidFilenameChars } from "../utils/utils";

class SemanticIndex implements ISemanticIndex {

    private fileStore: IFileStore;

    private textGenerationClient: ITextGenerationClient;

    constructor(textGenerationClient: ITextGenerationClient, fileStore: IFileStore) {
        this.fileStore = fileStore;
        this.textGenerationClient = textGenerationClient
    }

    // Look for an entity based on the prompt
    async getEntity(entityType: EntityType, prompt: string, setting: Setting, campaign: Campaign): Promise<any | null> {
        // Load the semantic index
        let semanticIndex: any = await this.fileStore.getSemanticIndex(setting, campaign, entityType);

        // If the index doesn't exist, create it
        if (!semanticIndex) {
            await this.fileStore.saveSemanticIndex(setting, campaign, entityType, {
                "index": []
            });
        }
        semanticIndex = await this.fileStore.getSemanticIndex(setting, campaign, entityType);

        console.log(`Semantic index: ${JSON.stringify(semanticIndex)}`);

        const indexPrompt: string = `
        I am going to give you JSON that represents an entity, as well as a list of other JSON entities.
        I want you to find the entity that matches the first entity based on the JSON
        The data I give you will have the following format:
        {
            "index": [
                {
                    "name": "Entity Name",
                    "context": "Entity Description"
                }
            ]
        }

        This is the list of entities that you can choose from:
        ${JSON.stringify(semanticIndex)}

        This is the entity that I want you to find in the list:
        ${prompt}

        I want you to return the result in the following JSON format:
        {
            "name": "Entity Name",
            "context": "Entity Description"
        }

        Your purpose is to be a 'semantic index' that can find the exact entity in the list that semantically matches the given entity.
        The goal is to avoid creating duplicate entities in the semantic index.
        If the entity is the same as an existing entity, return the existing entity. If it's not in the list, don't return anything.

        It's possible that nothing will match. If there is no entity that matches the prompt, return {"result": "none"}.

        Only reply with JSON, nothing else.
        `;

        let responseString: string = await RepeatJsonGeneration(indexPrompt, async (prompt: string): Promise<string> => {
            const responseString: string = await this.textGenerationClient.generateText(prompt);
            return responseString;
        }, (response: string): boolean => {
            const responseJson: any = JSON.parse(response);
            if (responseJson.result == 'none') {
                return true;
            }

            if (responseJson.name == undefined || responseJson.context == undefined) {
                console.log('Invalid response format. Expected JSON with "name" and "context" properties.');
                return false;
            }

            return true;
        });
        const response: any = JSON.parse(responseString);

        if (response.result == 'none') {
            return null;
        }

        // Load the entity data
        switch (entityType) {
            case EntityType.Character:
                return this.fileStore.getCharacter(setting.name, campaign.name, response.name);
            case EntityType.Location:
                return this.fileStore.getLocation(setting.name, campaign.name, response.name);
            case EntityType.Faction:
                return this.fileStore.getFaction(setting.name, campaign.name, response.name);
            default:
                throw new Error(`Unknown entity type: ${entityType}`);
        }
    }

    // Add an entity to the semantic index
    async addEntity(entityType: EntityType, name: string, context: string, jsonData: string, setting: Setting, campaign: Campaign): Promise<any> {
        // Load the semantic index
        let semanticIndex: any = await this.fileStore.getSemanticIndex(setting, campaign, entityType);

        // If the index doesn't exist, create it
        if (!semanticIndex) {
            await this.fileStore.saveSemanticIndex(setting, campaign, entityType, {
                "index": []
            });
        }
        semanticIndex = await this.fileStore.getSemanticIndex(setting, campaign, entityType);

        // Add the new entity to the index
        semanticIndex.index.push({
            "name": name,
            "context": context
        });

        // Save the updated index
        this.fileStore.saveSemanticIndex(setting, campaign, entityType, semanticIndex);

        // Save the entity data
        switch (entityType) {
            case EntityType.Character:
                return this.fileStore.saveCharacter(setting.name, campaign.name, JSON.parse(jsonData));
            case EntityType.Location:
                return this.fileStore.saveLocation(setting.name, campaign.name, JSON.parse(jsonData));
            case EntityType.Faction:
                return this.fileStore.saveFaction(setting.name, campaign.name, JSON.parse(jsonData));
            default:
                throw new Error(`Unknown entity type: ${entityType}`);
        }
    }
}

export { SemanticIndex, EntityType };
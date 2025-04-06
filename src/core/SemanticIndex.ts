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

    private setting: Setting;
    private campaign: Campaign;

    private textGenerationClient: ITextGenerationClient;

    constructor(setting: Setting, campaign: Campaign, textGenerationClient: ITextGenerationClient, fileStore: IFileStore) {
        this.fileStore = fileStore;
        this.setting = setting;
        this.campaign = campaign;
        this.textGenerationClient = textGenerationClient
    }

    // Look for an entity based on the prompt
    async getEntity(entityType: EntityType, prompt: string): Promise<any | null> {
        // Load the semantic index
        let semanticIndex: any = await this.fileStore.getSemanticIndex(this.setting, this.campaign, entityType);

        // If the index doesn't exist, create it
        if (!semanticIndex) {
            await this.fileStore.saveSemanticIndex(this.setting, this.campaign, entityType, {
                "index": []
            });
        }
        semanticIndex = await this.fileStore.getSemanticIndex(this.setting, this.campaign, entityType);

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

        It's possible that nothing will match. If there is no entity that matches the prompt, return {'result': 'none'}.

        Only reply with JSON, nothing else.
        `

        let responseString: string = await RepeatJsonGeneration(indexPrompt, async (prompt: string): Promise<string> => {
            const responseString: string = await this.textGenerationClient.generateText(prompt);
            return responseString
        }, (response: string): boolean => {
            const responseJson: any = JSON.parse(response);
            if(responseJson.result == 'none') {
                return true;
            }

            if (responseJson.name == undefined || responseJson.context == undefined) {
                console.log('Invalid response format. Expected JSON with "name" and "context" properties.');
                return false;
            }

            return true;
        });
        const response: any = JSON.parse(responseString);

        if(response.result == 'none') {
            return null;
        }

        // Load the entity data
        switch (entityType) {
            case EntityType.Character:
                return this.fileStore.getCharacter(this.setting.name, this.campaign.name, response.name);
            case EntityType.Location:
                return this.fileStore.getLocation(this.setting.name, this.campaign.name, response.name);
            case EntityType.Faction:
                return this.fileStore.getFaction(this.setting.name, this.campaign.name, response.name);
            default:
                throw new Error(`Unknown entity type: ${entityType}`);
        }
    }

    // Add an entity to the semantic index
    async addEntity(entityType: EntityType, name: string, context: string, jsonData: string): Promise<any> {
        //const basePath: string = this.fileStore.getEntityBasePath(this.setting, this.campaign, entityType);
        //const entityFileName: string = this.fileStore.stripInvalidFilenameChars(name);

        // Check if the base directory exists
        /*
        if (!this.fileStore.directoryExists(basePath)) {
            // Initialize the directory if it doesn't exist
            this.fileStore.saveFile(path.join(basePath, "semantic_index.json"), JSON.stringify({
                "index": []
            }));
        }
            */

        // Load the semantic index
        let semanticIndex: any = await this.fileStore.getSemanticIndex(this.setting, this.campaign, entityType);

        // If the index doesn't exist, create it
        if (!semanticIndex) {
            await this.fileStore.saveSemanticIndex(this.setting, this.campaign, entityType, {
                "index": []
            });
        }
        semanticIndex = await this.fileStore.getSemanticIndex(this.setting, this.campaign, entityType);

        //const semanticIndex: any = JSON.parse(this.fileStore.loadFile(path.join(basePath, "semantic_index.json")));

        // Add the new entity to the index
        semanticIndex.index.push({
            "name": name,
            "context": context
        });

        // Save the updated index
        //this.fileStore.saveFile(path.join(basePath, "semantic_index.json"), JSON.stringify(semanticIndex, null, '\t'));
        this.fileStore.saveSemanticIndex(this.setting, this.campaign, entityType, semanticIndex);

        // Save the entity data
        //this.fileStore.saveFile(path.join(basePath, entityFileName, `entity.json`), jsonData);
        switch (entityType) {
            case EntityType.Character:
                return this.fileStore.saveCharacter(this.setting.name, this.campaign.name, JSON.parse(jsonData));
            case EntityType.Location:
                return this.fileStore.saveLocation(this.setting.name, this.campaign.name, JSON.parse(jsonData));
            case EntityType.Faction:
                return this.fileStore.saveFaction(this.setting.name, this.campaign.name, JSON.parse(jsonData));
            default:
                throw new Error(`Unknown entity type: ${entityType}`);
        }
    }
}

export { SemanticIndex, EntityType };
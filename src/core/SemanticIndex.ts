import { ISemanticIndex, EntityType } from "./interfaces/ISemanticIndex";
import { IFileStore } from "../utils/interfaces/IFileStore";
import { FileSystemStore } from "../utils/FileSystemStore";

import { ITextGenerationClient } from "../generation/clients/interfaces/ITextGenerationClient";
import { OllamaClient } from "../generation/clients/OllamaClient";
import { RepeatJsonGeneration } from "../generation/clients/utils";

import { Setting } from "./campaigns/models/Setting";
import { Campaign } from "./campaigns/models/Campaign";

import * as path from "path";
import * as fs from "fs";

class SemanticIndex implements ISemanticIndex {

    private fileStore: IFileStore;

    private setting: Setting;
    private campaign: Campaign;

    private textGenerationClient: ITextGenerationClient;

    constructor(setting: Setting, campaign: Campaign, textGenerationClient: ITextGenerationClient) {
        this.fileStore = new FileSystemStore();

        this.setting = setting;
        this.campaign = campaign;
        this.textGenerationClient = textGenerationClient
    }

    // Look for an entity based on the prompt
    async getEntity(entityType: EntityType, prompt: string): Promise<string | null> {
        const basePath: string = this.fileStore.getEntityBasePath(this.setting, this.campaign, entityType);

        // Check if the base directory exists
        if (!this.fileStore.directoryExists(basePath)) {
            // Initialize the directory if it doesn't exist
            this.fileStore.saveFile(path.join(basePath, "semantic_index.json"), JSON.stringify({
                "index": []
            }));
        }

        // Load the semantic index
        const semanticIndex: string = this.fileStore.loadFile(path.join(basePath, "semantic_index.json"));

        const indexPrompt: string = `
        I am going to give you JSON that represents an entity, as well as a list of other JSON entities.
        I want you to find the entity that matches the first entity based on the JSON
        The data I give you will have the following format:
        {
            "index": [
                {
                    "name": "Entity Name",
                    "context": "Entity Description",
                    "path": "entity_name"
                }
            ]
        }

        This is the list of entities that you can choose from:
        ${semanticIndex}

        This is the entity that I want you to find in the list:
        ${prompt}

        I want you to return the result in the following JSON format:
        {
            "name": "Entity Name",
            "context": "Entity Description",
            "path": "entity_name"
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

            // Check if the path exists
            const entityPath: string = path.join(basePath, responseJson.path);
            const exists: boolean = fs.existsSync(entityPath);

            if(!exists) {
                console.error(`Entity path does not exist: ${entityPath}`);
            }
            
            return exists;
        });
        const response: any = JSON.parse(responseString);

        if(response.result == 'none') {
            return null;
        }

        // Save the match data for debugging
        // Save the prompt and response
        // Append the file
        const debugPath: string = path.join(basePath, "debug.json");
        const debugData: any = {
            "prompt": prompt,
            "response": response
        }
        if (fs.existsSync(debugPath)) {
            const debugJson: any = JSON.parse(this.fileStore.loadFile(debugPath));
            debugJson.push(debugData);
            this.fileStore.saveFile(debugPath, JSON.stringify(debugJson, null, '\t'));
        } else {
            this.fileStore.saveFile(debugPath, JSON.stringify([debugData], null, '\t'));
        }

        // Load the entity data
        const entityData: string = this.fileStore.loadFile(path.join(basePath, response.path, 'entity.json'));
        return entityData;
    }

    // Add an entity to the semantic index
    async addEntity(entityType: EntityType, name: string, context: string, jsonData: string): Promise<void> {
        const basePath: string = this.fileStore.getEntityBasePath(this.setting, this.campaign, entityType);
        const entityFileName: string = this.fileStore.stripInvalidFilenameChars(name);

        // Check if the base directory exists
        if (!this.fileStore.directoryExists(basePath)) {
            // Initialize the directory if it doesn't exist
            this.fileStore.saveFile(path.join(basePath, "semantic_index.json"), JSON.stringify({
                "index": []
            }));
        }

        // Load the semantic index
        const semanticIndex: any = JSON.parse(this.fileStore.loadFile(path.join(basePath, "semantic_index.json")));

        // Add the new entity to the index
        semanticIndex.index.push({
            "name": name,
            "context": context,
            "path": `${entityFileName}`
        });

        // Save the updated index
        this.fileStore.saveFile(path.join(basePath, "semantic_index.json"), JSON.stringify(semanticIndex, null, '\t'));

        // Save the entity data
        this.fileStore.saveFile(path.join(basePath, entityFileName, `entity.json`), jsonData);
    }
}

export { SemanticIndex, EntityType };
import { ISemanticIndex, EntityType } from "./interfaces/ISemanticIndex";
import { IFileStore } from "../utils/interfaces/IFileStore";
import { FileSystemStore } from "../utils/FileSystemStore";

import { ITextGenerationClient } from "../generation/clients/interfaces/ITextGenerationClient";
import { OllamaClient } from "../generation/clients/OllamaClient";
import { RepeatJsonGeneration } from "../generation/clients/utils";

import * as path from "path";
import * as fs from "fs";

class SemanticIndex implements ISemanticIndex {

    private fileStore: IFileStore;

    private settingName: string;
    private campaignName: string;

    private textGenerationClient: ITextGenerationClient;

    constructor(settingName: string, campaignName: string, textGenerationClient: ITextGenerationClient = new OllamaClient()) {
        this.fileStore = new FileSystemStore();

        this.settingName = settingName;
        this.campaignName = campaignName;
        this.textGenerationClient = textGenerationClient
    }

    // Look for an entity based on the prompt
    async getEntity(entityType: EntityType, prompt: string): Promise<string | null> {
        const basePath: string = this.getEntityBasePath(entityType);

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
        I want you to use a prompt and determine which entity I should retrieve from the list of entities.
        I will give you a prompt and a semantic index with the following JSON format:
        {
            "index": [
                {
                    "name": "Entity Name",
                    "description": "Entity Description",
                    "path": "entity_name.json"
                }
            ]
        }

        This is the semantic index that you will use to do your search:
        ${semanticIndex}

        You will use the prompt to determine which entity to retrieve from the index.
        This is the prompt: ${prompt}

        I want you to return the result in the following JSON format:
        {
            "name": "Entity Name",
            "description": "Entity Description",
            "path": "entity_name.json"
        }

        Only select something if it truly matches the prompt, not just if it's similar.
        For example, if the prompt is a location that is a beach, don't just return another location that is a beach. 
        Only return the beach location if it's the same beach location that matches the prompt.
        Your purpose is to be a 'semantic index' that can find the exact entity that matches the prompt.

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
        const entityData: string = this.fileStore.loadFile(path.join(basePath, response.path));
        return entityData;
    }

    // Add an entity to the semantic index
    async addEntity(entityType: EntityType, name: string, context: string, jsonData: string): Promise<void> {
        const basePath: string = this.getEntityBasePath(entityType);
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
            "path": `${entityFileName}.json`
        });

        // Save the updated index
        this.fileStore.saveFile(path.join(basePath, "semantic_index.json"), JSON.stringify(semanticIndex, null, '\t'));

        // Save the entity data
        this.fileStore.saveFile(path.join(basePath, `${entityFileName}.json`), jsonData);
    }

    // Get the base path for the entity type
    private getEntityBasePath(entityType: EntityType): string {
        const basePath: string = {
            [EntityType.Character]: this.fileStore.getCharacterPath(this.settingName, this.campaignName),
            [EntityType.Location]: this.fileStore.getLocationsPath(this.settingName, this.campaignName),
            [EntityType.Faction]: this.fileStore.getFactionsPath(this.settingName, this.campaignName),
            [EntityType.Item]: this.fileStore.getItemsPath(this.settingName, this.campaignName)
        }[entityType];

        return basePath
    }
}

export { SemanticIndex, EntityType };
import { IFileStore } from "./interfaces/IFileStore";
import { Setting } from "../core/models/Setting";
import { Campaign } from "../core/models/Campaign";
import { Storyline } from "../core/models/Storyline";
import { Character } from "../core/models/Character";
import { Location } from "../core/models/Location";
import { Faction } from "../core/models/Faction";
import { EntityType } from "../core/SemanticIndex";
import { Session } from "../core/models/Session";

import { stripInvalidFilenameChars } from "./utils";

class FoundryStore implements IFileStore {

    compendiumName: string;

    constructor(compendiumName: string = 'ai-dungeon-master.settings') {
        this.compendiumName = compendiumName;
    }

    async getSettings(): Promise<Setting[]> {
        const settingsDirectories: string[] = await this.getDirectories(`${this.getBasePath()}/settings`);

        const settings: Setting[] = [];
        for (const settingName of settingsDirectories) {
            const setting = await this.getSetting(settingName);
            if (setting) {
                settings.push(setting);
            }
        }

        return settings;
    }

    async getCampaigns(settingName: string): Promise<Campaign[]> {
        settingName = stripInvalidFilenameChars(settingName);
        const campaignDirectories: string[] = await this.getDirectories(`${this.getBasePath()}/settings/${settingName}`);

        const campaigns: Campaign[] = [];
        for (const campaignName of campaignDirectories) {
            const campaign = await this.getCampaign(settingName, campaignName);
            if (campaign) {
                campaigns.push(campaign);
            }
        }
        return campaigns.length > 0 ? campaigns : [];
    }

    async getSessions(settingName: string, campaignName: string): Promise<Session[]> {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);

        console.log("Getting sessions for: ", settingName, campaignName)

        const sessionDirectories: string[] = await this.getDirectories(`${this.getBasePath()}/settings/${settingName}/${campaignName}/sessions`);

        console.log("Session directories: ", sessionDirectories)

        const sessions: Session[] = [];
        for (const sessionName of sessionDirectories) {
            const session = await this.getSession(settingName, campaignName, sessionName);
            if (session) {
                sessions.push(session);
            }
        }

        return sessions.length > 0 ? sessions : [];
    }

    async getSession(settingName: string, campaignName: string, sessionName: string): Promise<Session | null> {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);
        sessionName = stripInvalidFilenameChars(sessionName);

        const filePath = `${this.getBasePath()}/settings/${settingName}/${campaignName}/sessions/${sessionName}/session.json`;
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) as Session : null;
    }

    async getSetting(settingName: string): Promise<Setting | null> {
        settingName = stripInvalidFilenameChars(settingName);

        const filePath = this.getSettingPath(settingName) + "/setting.json";
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) as Setting : null;
    }

    async getCampaign(settingName: string, campaignName: string): Promise<Campaign | null> {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);

        const filePath = this.getCampaignPath(settingName, campaignName) + "/campaign.json";
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) as Campaign : null;
    }

    async getStoryline(settingName: string, campaignName: string, storylineName: string): Promise<Storyline | null> {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);
        storylineName = stripInvalidFilenameChars(storylineName);

        const filePath = this.getStorylinePath(settingName, campaignName, storylineName);
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) as Storyline : null;
    }

    async getCharacter(settingName: string, campaignName: string, characterName: string): Promise<Character | null> {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);
        characterName = stripInvalidFilenameChars(characterName);

        const filePath = `${this.getCharactersPath(settingName, campaignName)}/${characterName}/entity.json`;
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) as Character : null;
    }

    async getLocation(settingName: string, campaignName: string, locationName: string): Promise<Location | null> {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);
        locationName = stripInvalidFilenameChars(locationName);

        const filePath = `${this.getLocationsPath(settingName, campaignName)}/${locationName}/entity.json`;
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) as Location : null;
    }

    async getFaction(settingName: string, campaignName: string, factionName: string): Promise<Faction | null> {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);
        factionName = stripInvalidFilenameChars(factionName);

        const filePath = `${this.getFactionsPath(settingName, campaignName)}/${factionName}/entity.json`;
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) as Faction : null;
    }

    async getCharacters(settingName: string, campaignName: string): Promise<Character[]> {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);

        const charactersPath: string = this.getCharactersPath(settingName, campaignName);
        const characterDirectories: string[] = await this.getDirectories(charactersPath);

        const characters: Character[] = [];
        for (const characterName of characterDirectories) {
            const character = await this.getCharacter(settingName, campaignName, characterName);
            if (character) {
                characters.push(character);
            }
        }

        return characters;
    }

    async getLocations(settingName: string, campaignName: string): Promise<Location[]> {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);

        const locationsPath: string = this.getLocationsPath(settingName, campaignName);
        const locationDirectories: string[] = await this.getDirectories(locationsPath);

        const locations: Location[] = [];
        for (const locationName of locationDirectories) {
            const location = await this.getLocation(settingName, campaignName, locationName);
            if (location) {
                locations.push(location);
            }
        }

        return locations;
    }

    async getFactions(settingName: string, campaignName: string): Promise<Faction[]> {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);

        const factionsPath: string = this.getFactionsPath(settingName, campaignName);
        const factionDirectories: string[] = await this.getDirectories(factionsPath);

        const factions: Faction[] = [];
        for (const factionName of factionDirectories) {
            const faction = await this.getFaction(settingName, campaignName, factionName);
            if (faction) {
                factions.push(faction);
            }
        }

        return factions;
    }

    async saveSetting(settingName: string, setting: Setting): Promise<void> {
        settingName = stripInvalidFilenameChars(settingName);

        // Save the setting to a file
        const filePath: string = `${this.getSettingPath(settingName)}/setting.json`;
        await this.saveFile(filePath, JSON.stringify(setting, null, 2));
    }

    async saveCampaign(settingName: string, campaignName: string, campaign: Campaign): Promise<void> {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);

        const filePath = this.getCampaignPath(settingName, campaignName) + "/campaign.json";
        await this.saveFile(filePath, JSON.stringify(campaign, null, 2));
    }

    async saveStoryline(settingName: string, campaignName: string, storyline: Storyline): Promise<void> {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);

        const filePath = this.getStorylinePath(settingName, campaignName, storyline.name);
        await this.saveFile(filePath, JSON.stringify(storyline, null, 2));
    }

    async saveCharacter(settingName: string, campaignName: string, character: Character): Promise<void> {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);
        const characterName: string = stripInvalidFilenameChars(character.name);

        const filePath = `${this.getCharactersPath(settingName, campaignName)}/${characterName}/entity.json`;
        await this.saveFile(filePath, JSON.stringify(character, null, 2));
    }

    async saveLocation(settingName: string, campaignName: string, location: Location): Promise<void> {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);
        const locationName: string = stripInvalidFilenameChars(location.name);

        const filePath = `${this.getLocationsPath(settingName, campaignName)}/${locationName}/entity.json`;
        await this.saveFile(filePath, JSON.stringify(location, null, 2));
    }

    async saveFaction(settingName: string, campaignName: string, faction: Faction): Promise<void> {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);
        const factionName: string = stripInvalidFilenameChars(faction.name);

        const filePath = `${this.getFactionsPath(settingName, campaignName)}/${factionName}/entity.json`;
        await this.saveFile(filePath, JSON.stringify(faction, null, 2));
    }

    async saveCharacterImage(settingName: string, campaignName: string, characterName: string, fileName: string, base64Image: string): Promise<void> {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);
        characterName = stripInvalidFilenameChars(characterName);

        const filePath = `${this.getCharactersPath(settingName, campaignName)}/${characterName}/${fileName}`;
        await this.saveImage(filePath, base64Image);
    }

    async saveLocationImage(settingName: string, campaignName: string, locationName: string, fileName: string, base64Image: string): Promise<void> {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);
        locationName = stripInvalidFilenameChars(locationName);

        const filePath = `${this.getLocationsPath(settingName, campaignName)}/${locationName}/${fileName}`;
        await this.saveImage(filePath, base64Image);
    }

    async saveFactionImage(settingName: string, campaignName: string, factionName: string, fileName: string, base64Image: string): Promise<void> {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);
        factionName = stripInvalidFilenameChars(factionName);

        const filePath = `${this.getFactionsPath(settingName, campaignName)}/${factionName}/${fileName}`;
        await this.saveImage(filePath, base64Image);
    }

    async saveSession(settingName: string, campaignName: string, sessionName: string, session: Session): Promise<void> {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);
        sessionName = stripInvalidFilenameChars(sessionName);

        const filePath = `${this.getBasePath()}/settings/${settingName}/${campaignName}/sessions/${sessionName}/session.json`;
        console.log("Saving session to: ", filePath)
        await this.saveFile(filePath, JSON.stringify(session, null, 2));
    }

    async getEntity(setting: Setting, campaign: Campaign, entityType: EntityType, prompt: string): Promise<any | null> {
        const basePath: string = this.getEntityBasePath(setting, campaign, entityType);
        const entityFileName: string = stripInvalidFilenameChars(prompt);
        const filePath: string = `${basePath}/${entityFileName}/entity.json`;
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) : null;
    }

    async saveEntity(setting: Setting, campaign: Campaign, entityType: EntityType, prompt: string, entity: any): Promise<void> {
        const basePath: string = this.getEntityBasePath(setting, campaign, entityType);
        const entityFileName: string = stripInvalidFilenameChars(prompt);
        const filePath: string = `${basePath}/${entityFileName}/entity.json`;
        await this.saveFile(filePath, JSON.stringify(entity, null, 2));
    }

    async getSemanticIndex(setting: Setting, campaign: Campaign, entityType: EntityType): Promise<any | null> {
        const filePath = `${this.getEntityBasePath(setting, campaign, entityType)}/semantic_index.json`;
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) : null;
    }

    async saveSemanticIndex(setting: Setting, campaign: Campaign, entityType: EntityType, index: any): Promise<void> {
        const filePath = `${this.getEntityBasePath(setting, campaign, entityType)}/semantic_index.json`;
        await this.saveFile(filePath, JSON.stringify(index, null, 2));
    }

    async saveFile(filePath: string, fileContent: string): Promise<void> {
        // Get the folder path from the file path
        const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
        const folderPaths = folderPath.split('/');
        const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
        console.log("Saving file: ", filePath)

        // Create the directory structure if it doesn't exist
        let currentPath: any = '';
        for (const part of folderPaths) {
            currentPath += `${part}/`;
            try {
            // Check if the directory exists by attempting to browse it
                await FilePicker.browse('data', currentPath);
            } catch (error) {
                // If browsing fails, the directory doesn't exist; attempt to create it
                try {
                    await FilePicker.createDirectory('data', currentPath);
                    console.log(`Directory created: ${currentPath}`);
                } catch (createError) {
                    console.error(`Failed to create directory: ${currentPath}`, createError);
                    throw createError; // Stop the process if directory creation fails
                }
            }
        }

        // Use the FilePicker to write the file
        const result: any = await FilePicker.upload('data', folderPath, new File([fileContent], fileName), {});
        if (result.status === 'success') {
            console.log("File written successfully:", result.path);
        } else {
            console.error("Error writing file:", result.error);
        }
    }

    async saveText(filePath: string, fileContent: string): Promise<void> {
        console.log("Saving file: ", filePath)

        const pack = game.packs?.get(this.compendiumName);
        if (!pack){
            throw new Error(`Compendium ${filePath} not found.`);
        }

        // Initialize directory structure if it doesn't exist
        let parentFolderId: string | null = null;
        let parentFolder: Folder | undefined;
        if (filePath.includes('/')) {
            const directoryPath:string = filePath.substring(0, filePath.lastIndexOf('/'));
            parentFolderId = await this.createDirectory(directoryPath);
            parentFolder = pack.folders.find((f: any) => f.id === parentFolderId);

            if (!parentFolder) {
                throw new Error(`Parent folder ${directoryPath} not found in compendium ${this.compendiumName}.`);
            }
        }

        const entryName = filePath.substring(filePath.lastIndexOf('/') + 1);
        console.log("Entry name: ", entryName)
        let entry: any = null;
        const entryRef: any = parentFolder?.children.map((c: any) => c.entries.find((e: any) => e.name === entryName)).find((e: any) => e !== undefined);
        if (entryRef) {
            entry = await pack.getDocument(entryRef._id).catch(() => null);
        }
        console.log("Entry: ", entry)
        if (entry) {
            // Update the existing journal entry
            const page = entry.pages.find((p: any) => p.name === entryName);
            if (!page) {
                throw new Error(`Page ${entryName} not found in entry ${entry.name}.`);
            }
            await entry.update({
                pages: [
                    {
                        _id: page._id,
                        name: entryName,
                        type: "text",
                        text: {
                            content: fileContent,
                            format: 1
                        }
                    }
                ]
            });
        } else {
            // Create the journal entry
            JournalEntry.create(
              {
                name: entryName,
                folder: parentFolderId,
                pages: [
                    {
                        name: entryName,
                        type: "text",
                        text: {
                            content: fileContent,
                            format: 1
                        }
                    }
                ]
              },
              { pack: pack.collection }
            );
        }
    }

    base64ToBlob(base64: string, type: string): Blob {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type });
    }

    async saveImage(filePath: string, base64Image: string): Promise<void> {
        const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
        const folderPaths = folderPath.split('/');
        const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);

        // Create the directory structure if it doesn't exist
        let currentPath: any = '';
        for (const part of folderPaths) {
            currentPath += `${part}/`;
            try {
            // Check if the directory exists by attempting to browse it
                await FilePicker.browse('data', currentPath);
            } catch (error) {
                // If browsing fails, the directory doesn't exist; attempt to create it
                try {
                    await FilePicker.createDirectory('data', currentPath);
                    console.log(`Directory created: ${currentPath}`);
                } catch (createError) {
                    console.error(`Failed to create directory: ${currentPath}`, createError);
                    throw createError; // Stop the process if directory creation fails
                }
            }
        }

        const blob = this.base64ToBlob(base64Image, 'image/png');
        const file = new File([blob], fileName, { type: 'image/png' });

        await FilePicker.upload('data', filePath.substring(0, filePath.lastIndexOf('/')), file, {});
    }

    // Load a file from the compendium pack
    async loadFile(filePath: string): Promise<string | null> {
        console.log("Loading file: ", filePath)

        const response: any = await fetch(filePath)
        if (!response.ok) {
            console.error(`Failed to load file: ${response.status} ${response.statusText}`);
            return null;
        } else {
            console.log("File loaded successfully: ", filePath)
            return response.text();
        }

        /*
        console.log("Loading file: ", filePath)

        const pack = game.packs?.get(this.compendiumName);
        if (!pack) {
            throw new Error(`Compendium ${this.compendiumName} not found.`);
        }

        // Parse the path to get the folder names and file name
        const folderNames:string[] = filePath.split('/');
        console.log("Folder names: ", folderNames)
        const fileName = folderNames.pop() as string;
        console.log("File name: ", fileName)

        // Get the top level folder
        let folder: any = pack.folders.find((f: any) => f.name === folderNames[0] && f.parent === null);
        if (!folder) {
            console.error(`Folder ${folderNames[0]} not found in compendium ${this.compendiumName}.`);
            return null;
        }
        console.log("Top level folder: ", folder.name)

        // Loop through the folder names and find the last folder
        for(let i = 1; i < folderNames.length; i++) {
            const folderName = folderNames[i];
            folder = folder.children.find((f: any) => f.folder.name === folderName);
            if (!folder) {
                console.error(`Folder ${folderName} not found in compendium ${this.compendiumName}.`);
                return null;
            }

            console.log("Folder: ", folder.folder.name)
            console.dir(folder)
        }

        // Loop through the children and get the settings
        const entryRef = folder.entries.find((e: any) => e.name === fileName);
        if (!entryRef) {
            console.error(`Entry ${fileName} not found in folder ${folder.folder.name}.`);
            return null;
        }
        const entry:any = await pack.getDocument(entryRef._id).catch(() => null);
        if (!entry) {
            console.error(`Entry ${fileName} not found in compendium ${this.compendiumName}.`);
            return null;
        }
        const page = entry.pages.find((p: any) => p.name === fileName);
        if (!page) {
            console.error(`Page ${fileName} not found in entry ${entry.name}.`);
            return null;
        }
        // Parse the content of the page
        const content = page.text.content;
        if (!content) {
            console.error(`Content not found in page ${fileName}.`);
            return null;
        }

        return content;
        */
    }

    // Get the Folders at the path
    async getDirectories(path: any): Promise<string[]> {
        console.log("Getting directories: ", path)

        // Browse the target directory
        const response: any = await FilePicker.browse('data', path)

        // Get the last part of the path
        const directories: string[] = response.dirs.map((dir: any) => dir.substring(dir.lastIndexOf('/') + 1));
        return directories;
        /*
        const pack = game.packs?.get(this.compendiumName);
        if (!pack) {
            throw new Error(`Compendium ${this.compendiumName} not found.`);
        }

        const folderNames:string[] = path.split('/');

        // Get the top level folder
        let folder: any = pack.folders.find((f: any) => f.name === folderNames[0] && f.parent === null);
        if (!folder) {
            throw new Error(`Folder ${folderNames[0]} not found in compendium ${this.compendiumName}.`);
        }

        // Loop through the folder names and find the folder
        for(let i = 1; i < folderNames.length; i++) {
            const folderName = folderNames[i];
            folder = folder.children.find((f: any) => f.folder.name === folderName);
            if (!folder) {
                throw new Error(`Folder ${folderName} not found in compendium ${this.compendiumName}.`);
            }
        }

        // Collect all the folders within the found folder
        const folders: Folder[] = folder.children.map((f: any) => f.folder);
        return folders;
        */
    }

    // Create a directory structure in the compendium pack
    async createDirectory(directoryPath: string): Promise<string> {
        const pack: any = game.packs?.get(this.compendiumName);
        const folderNames:string[] = directoryPath.split('/');

        let parentFolder: any = null;
        console.log("Creating directories")
        for (let i = 0; i < folderNames.length; i++) {
            let folder;
            const folderName: string = folderNames[i];
            console.log("Current parent folder: ", parentFolder)
            console.log("Folder name: ", folderName)
            if (i === 0) {
                // Root folder
                folder = pack.folders.find((f:any) => f.name === folderName && f.parent === null);
                if (!folder) {
                    console.log("Creating root folder")
                    folder = await Folder.create({
                        name: folderName,
                        type: "JournalEntry",
                        folder: parentFolder?._id ?? null,
                        sorting: "a"
                    }, { pack: pack.collection });
                }
            } else {
                // Child folders
                folder = parentFolder.children.find((f:any) => f.folder.name === folderName);
                if (!folder) {
                    console.log("Creating child folder")
                    folder = await Folder.create({
                        name: folderName,
                        type: "JournalEntry",
                        folder: parentFolder?._id ?? null,
                        sorting: "a"
                    }, { pack: pack.collection });
                } else {
                    folder = folder.folder;
                }
            }

            parentFolder = folder;
        }

        return parentFolder._id;
    }

    async unlockCompendium(filePath: string=this.compendiumName): Promise<void> {
        const pack = game.packs?.get(filePath);
        if (!pack) throw new Error(`Compendium ${filePath} not found.`);
        await pack.configure({ locked: false });
    }

    async lockCompendium(filePath: string = this.compendiumName): Promise<void> {
        const pack = game.packs?.get(filePath);
        if (!pack) throw new Error(`Compendium ${filePath} not found.`);
        await pack.configure({ locked: true });
    }

    getBasePath(): string {
        return "modules/ai-dungeon-master/storage";
    }

    getSettingPath(settingName: string): string {
        settingName = stripInvalidFilenameChars(settingName);
        return `${this.getBasePath()}/settings/${settingName}`;
    }

    getCampaignPath(settingName: string, campaignName: string): string {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);
        return `${this.getBasePath()}/settings/${settingName}/${campaignName}`;
    }

    getStorylinePath(settingName: string, campaignName: string, storylineName: string): string {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);
        storylineName = stripInvalidFilenameChars(storylineName);
        return `${this.getBasePath()}/settings/${settingName}/${campaignName}/storylines/${storylineName}.json`;
    }

    getCharactersPath(settingName: string, campaignName: string): string {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);
        return `${this.getBasePath()}/settings/${settingName}/${campaignName}/characters`;
    }

    getLocationsPath(settingName: string, campaignName: string): string {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);
        return `${this.getBasePath()}/settings/${settingName}/${campaignName}/locations`;
    }

    getFactionsPath(settingName: string, campaignName: string): string {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);
        return `${this.getBasePath()}/settings/${settingName}/${campaignName}/factions`;
    }

    getItemsPath(settingName: string, campaignName: string): string {
        settingName = stripInvalidFilenameChars(settingName);
        campaignName = stripInvalidFilenameChars(campaignName);
        return `${this.getBasePath()}/settings/${settingName}/${campaignName}/items`;
    }

    getEntityBasePath(setting: Setting, campaign: Campaign, entityType: EntityType): string {
        const basePath: string = {
            [EntityType.Character]: this.getCharactersPath(setting.name, campaign.name),
            [EntityType.Location]: this.getLocationsPath(setting.name, campaign.name),
            [EntityType.Faction]: this.getFactionsPath(setting.name, campaign.name),
            [EntityType.Item]: this.getItemsPath(setting.name, campaign.name)
        }[entityType];

        return basePath
    }
}

export { FoundryStore };
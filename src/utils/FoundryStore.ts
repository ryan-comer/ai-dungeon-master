import { IFileStore } from "./interfaces/IFileStore";
import { Setting } from "../core/campaigns/models/Setting";
import { Campaign } from "../core/campaigns/models/Campaign";
import { Storyline } from "../core/campaigns/models/Storyline";
import { Character } from "../core/campaigns/models/Character";
import { Location } from "../core/campaigns/models/Location";
import { Faction } from "../core/campaigns/models/Faction";
import { EntityType } from "../core/SemanticIndex";

class FoundryStore implements IFileStore {

    compendiumName: string;

    constructor(compendiumName: string = 'ai-dungeon-master.settings') {
        this.compendiumName = compendiumName;
    }

    async getSettings(): Promise<Setting[]> {
        const settingsDirectories: Folder[] = await this.getDirectories("settings")

        console.log("Settings directories: ")
        console.dir(settingsDirectories)

        const settings: Setting[] = [];
        for (const directory of settingsDirectories) {
            const settingName = directory.name;
            const setting = await this.getSetting(settingName);
            if (setting) {
                settings.push(setting);
            }
        }

        return settings;
    }

    async getCampaigns(settingName: string): Promise<Campaign[]> {
        settingName = this.stripInvalidFilenameChars(settingName);

        const campaignDirectories: Folder[] = await this.getDirectories(`settings/${settingName}`)
        const campaigns: Campaign[] = [];
        for (const directory of campaignDirectories) {
            const campaignName = directory.name;
            const campaign = await this.getCampaign(settingName, campaignName);
            if (campaign) {
                campaigns.push(campaign);
            }
        }
        return campaigns.length > 0 ? campaigns : [];
    }

    async getSetting(settingName: string): Promise<Setting | null> {
        settingName = this.stripInvalidFilenameChars(settingName);

        const filePath = this.getSettingPath(settingName) + "/setting.json";
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) as Setting : null;
    }

    async getCampaign(settingName: string, campaignName: string): Promise<Campaign | null> {
        settingName = this.stripInvalidFilenameChars(settingName);
        campaignName = this.stripInvalidFilenameChars(campaignName);

        const filePath = this.getCampaignPath(settingName, campaignName) + "/campaign.json";
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) as Campaign : null;
    }

    async getStoryline(settingName: string, campaignName: string, storylineName: string): Promise<Storyline | null> {
        settingName = this.stripInvalidFilenameChars(settingName);
        campaignName = this.stripInvalidFilenameChars(campaignName);
        storylineName = this.stripInvalidFilenameChars(storylineName);

        const filePath = this.getStorylinePath(settingName, campaignName, storylineName);
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) as Storyline : null;
    }

    async getCharacter(settingName: string, campaignName: string, characterName: string): Promise<Character | null> {
        settingName = this.stripInvalidFilenameChars(settingName);
        campaignName = this.stripInvalidFilenameChars(campaignName);
        characterName = this.stripInvalidFilenameChars(characterName);

        const filePath = `${this.getCharactersPath(settingName, campaignName)}/${characterName}`;
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) as Character : null;
    }

    async getLocation(settingName: string, campaignName: string, locationName: string): Promise<Location | null> {
        settingName = this.stripInvalidFilenameChars(settingName);
        campaignName = this.stripInvalidFilenameChars(campaignName);
        locationName = this.stripInvalidFilenameChars(locationName);

        const filePath = `${this.getLocationsPath(settingName, campaignName)}/${locationName}`;
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) as Location : null;
    }

    async getFaction(settingName: string, campaignName: string, factionName: string): Promise<Faction | null> {
        settingName = this.stripInvalidFilenameChars(settingName);
        campaignName = this.stripInvalidFilenameChars(campaignName);
        factionName = this.stripInvalidFilenameChars(factionName);

        const filePath = `${this.getFactionsPath(settingName, campaignName)}/${factionName}`;
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) as Faction : null;
    }

    async saveSetting(settingName: string, setting: Setting): Promise<void> {
        settingName = this.stripInvalidFilenameChars(settingName);

        // Save the setting to a file
        const filePath: string = `${this.getSettingPath(settingName)}/setting.json`;
        try{
            await this.unlockCompendium();
            await this.saveText(filePath, JSON.stringify(setting, null, 2));
        } finally {
            await this.lockCompendium();
        }
    }

    async saveCampaign(settingName: string, campaignName: string, campaign: Campaign): Promise<void> {
        settingName = this.stripInvalidFilenameChars(settingName);
        campaignName = this.stripInvalidFilenameChars(campaignName);

        const filePath = this.getCampaignPath(settingName, campaignName) + "/campaign.json";
        try {
            await this.unlockCompendium();
            await this.saveText(filePath, JSON.stringify(campaign, null, 2));
        } finally {
            await this.lockCompendium();
        }
    }

    async saveStoryline(settingName: string, campaignName: string, storyline: Storyline): Promise<void> {
        settingName = this.stripInvalidFilenameChars(settingName);
        campaignName = this.stripInvalidFilenameChars(campaignName);

        const filePath = this.getStorylinePath(settingName, campaignName, storyline.name);
        try{
            await this.unlockCompendium();
            await this.saveText(filePath, JSON.stringify(storyline, null, 2));
        } finally {
            await this.lockCompendium();
        }
    }

    async saveCharacter(settingName: string, campaignName: string, character: Character): Promise<void> {
        settingName = this.stripInvalidFilenameChars(settingName);
        campaignName = this.stripInvalidFilenameChars(campaignName);

        const filePath = `${this.getCharactersPath(settingName, campaignName)}/${character.name}`;
        try {
            await this.unlockCompendium();
            await this.saveText(filePath, JSON.stringify(character, null, 2));
        } finally {
            await this.lockCompendium();
        }
    }

    async saveLocation(settingName: string, campaignName: string, location: Location): Promise<void> {
        settingName = this.stripInvalidFilenameChars(settingName);
        campaignName = this.stripInvalidFilenameChars(campaignName);

        const filePath = `${this.getLocationsPath(settingName, campaignName)}/${location.name}`;
        try {
            await this.unlockCompendium();
            await this.saveText(filePath, JSON.stringify(location, null, 2));
        } finally {
            await this.lockCompendium();
        }
    }

    async saveFaction(settingName: string, campaignName: string, faction: Faction): Promise<void> {
        settingName = this.stripInvalidFilenameChars(settingName);
        campaignName = this.stripInvalidFilenameChars(campaignName);

        const filePath = `${this.getFactionsPath(settingName, campaignName)}/${faction.name}`;
        try {
            await this.unlockCompendium();
            await this.saveText(filePath, JSON.stringify(faction, null, 2));
        } finally {
            await this.lockCompendium();
        }
    }

    async saveCharacterImage(settingName: string, campaignName: string, characterName: string, fileName: string, base64Image: string): Promise<void> {
        settingName = this.stripInvalidFilenameChars(settingName);
        campaignName = this.stripInvalidFilenameChars(campaignName);
        characterName = this.stripInvalidFilenameChars(characterName);

        const filePath = `${this.getCharactersPath(settingName, campaignName)}/${characterName}/${fileName}`;

        try {
            await this.unlockCompendium();
            await this.saveImage(filePath, base64Image);
        } finally {
            await this.lockCompendium();
        }
    }

    async saveLocationImage(settingName: string, campaignName: string, locationName: string, fileName: string, base64Image: string): Promise<void> {
        settingName = this.stripInvalidFilenameChars(settingName);
        campaignName = this.stripInvalidFilenameChars(campaignName);
        locationName = this.stripInvalidFilenameChars(locationName);

        const filePath = `${this.getLocationsPath(settingName, campaignName)}/${locationName}/${fileName}`;

        try {
            await this.unlockCompendium();
            await this.saveImage(filePath, base64Image);
        } finally {
            await this.lockCompendium();
        }
    }

    async saveFactionImage(settingName: string, campaignName: string, factionName: string, fileName: string, base64Image: string): Promise<void> {
        settingName = this.stripInvalidFilenameChars(settingName);
        campaignName = this.stripInvalidFilenameChars(campaignName);
        factionName = this.stripInvalidFilenameChars(factionName);

        const filePath = `${this.getFactionsPath(settingName, campaignName)}/${factionName}/${fileName}`;

        try {
            await this.unlockCompendium();
            await this.saveImage(filePath, base64Image);
        } finally {
            await this.lockCompendium();
        }
    }

    async getEntity(setting: Setting, campaign: Campaign, entityType: EntityType, prompt: string): Promise<any | null> {
        const filePath = `${this.getEntityBasePath(setting, campaign, entityType)}/${prompt}`;
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) : null;
    }

    async saveEntity(setting: Setting, campaign: Campaign, entityType: EntityType, prompt: string, entity: any): Promise<void> {
        const filePath = `${this.getEntityBasePath(setting, campaign, entityType)}/${prompt}`;

        try {
            await this.unlockCompendium();
            await this.saveText(filePath, JSON.stringify(entity, null, 2));
        } finally {
            await this.lockCompendium();
        }
    }

    async getSemanticIndex(setting: Setting, campaign: Campaign, entityType: EntityType): Promise<any | null> {
        const filePath = `${this.getEntityBasePath(setting, campaign, entityType)}/semantic_index.json`;
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) : null;
    }

    async saveSemanticIndex(setting: Setting, campaign: Campaign, entityType: EntityType, index: any): Promise<void> {
        const filePath = `${this.getEntityBasePath(setting, campaign, entityType)}/semantic_index.json`;

        try {
            await this.unlockCompendium();
            await this.saveText(filePath, JSON.stringify(index, null, 2));
        } finally {
            await this.lockCompendium();
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

    async saveImage(filePath: string, base64Image: string): Promise<void> {
        return this.saveText(filePath, base64Image);
    }

    // Load a file from the compendium pack
    async loadFile(filePath: string): Promise<string | null> {
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
    }

    // Get the Folders at the path
    async getDirectories(path: string): Promise<Folder[]> {
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

    getSettingPath(settingName: string): string {
        settingName = this.stripInvalidFilenameChars(settingName);
        return `settings/${settingName}`;
    }

    getCampaignPath(settingName: string, campaignName: string): string {
        settingName = this.stripInvalidFilenameChars(settingName);
        campaignName = this.stripInvalidFilenameChars(campaignName);
        return `settings/${settingName}/${campaignName}`;
    }

    getStorylinePath(settingName: string, campaignName: string, storylineName: string): string {
        settingName = this.stripInvalidFilenameChars(settingName);
        campaignName = this.stripInvalidFilenameChars(campaignName);
        storylineName = this.stripInvalidFilenameChars(storylineName);
        return `settings/${settingName}/${campaignName}/storylines/${storylineName}.json`;
    }

    getCharactersPath(settingName: string, campaignName: string): string {
        settingName = this.stripInvalidFilenameChars(settingName);
        campaignName = this.stripInvalidFilenameChars(campaignName);
        return `settings/${settingName}/${campaignName}/characters`;
    }

    getLocationsPath(settingName: string, campaignName: string): string {
        settingName = this.stripInvalidFilenameChars(settingName);
        campaignName = this.stripInvalidFilenameChars(campaignName);
        return `settings/${settingName}/${campaignName}/locations`;
    }

    getFactionsPath(settingName: string, campaignName: string): string {
        settingName = this.stripInvalidFilenameChars(settingName);
        campaignName = this.stripInvalidFilenameChars(campaignName);
        return `settings/${settingName}/${campaignName}/factions`;
    }

    getItemsPath(settingName: string, campaignName: string): string {
        settingName = this.stripInvalidFilenameChars(settingName);
        campaignName = this.stripInvalidFilenameChars(campaignName);
        return `settings/${settingName}/${campaignName}/items`;
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

    stripInvalidFilenameChars(name: string): string {
        return name.replace(/[<>:"/\\|?*]/g, "_");
    }
}

export { FoundryStore };
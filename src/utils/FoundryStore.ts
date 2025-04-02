import { IFileStore } from "./interfaces/IFileStore";
import { Setting } from "../core/campaigns/models/Setting";
import { Campaign } from "../core/campaigns/models/Campaign";
import { Storyline } from "../core/campaigns/models/Storyline";
import { Character } from "../core/campaigns/models/Character";
import { Location } from "../core/campaigns/models/Location";
import { Faction } from "../core/campaigns/models/Faction";
import { EntityType } from "../core/SemanticIndex";
import { Int } from "io-ts";

class FoundryStore implements IFileStore {

    compendiumName: string;

    constructor(compendiumName: string = 'ai-dungeon-master.settings') {
        this.compendiumName = compendiumName;
    }

    async getSettings(): Promise<Setting[]> {
        const pack = game.packs?.get(this.compendiumName);
        if (!pack) {
            throw new Error(`Compendium ${this.compendiumName} not found.`);
        }

        // Get the ID of the settings folder
        const settingsFolder = pack.folders.find((folder: any) => folder.name === "settings" && folder.type === "JournalEntry");
        if (!settingsFolder) {
            throw new Error(`Settings folder not found in compendium ${this.compendiumName}.`);
        }

        // Loop through the children and get the settings
        const settingsJson: any[] = settingsFolder.children
            .map((child: any) => child.entries.find((e: any) => e.name === "setting.json"))
            .filter((entry: any) => entry);

        // Loop through the settings and parse them
        let settings: Setting[] = [];
        for (const entryReference of settingsJson) {
            const entry:any = await pack.getDocument(entryReference._id);
            if (!entry) {
                console.warn(`Entry not found: ${entryReference._id}`);
                continue;
            }

            // Get the entry pages titled settings.json
            const page = entry.pages.find((p: any) => p.name === "setting.json");
            if (!page) {
                console.warn(`Page not found: settings.json`);
                continue;
            }
            // Parse the content of the page
            const content = page.text.content;
            if (!content) {
                console.warn(`Content not found in page: settings.json`);
                continue;
            }

            // Parse the content as JSON
            try {
                const parsedSetting = JSON.parse(content) as Setting;
                settings.push(parsedSetting);
            }
            catch (error) {
                console.error(`Error parsing JSON: ${error}`);
            }
        }

        return settings;
    }

    async getCampaigns(settingName: string): Promise<Campaign[]> {
        return [];
    }

    async getSetting(settingName: string): Promise<Setting | null> {
        const filePath = this.getSettingPath(settingName);
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) as Setting : null;
    }

    async getCampaign(settingName: string, campaignName: string): Promise<Campaign | null> {
        const filePath = this.getCampaignPath(settingName, campaignName);
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) as Campaign : null;
    }

    async getStoryline(settingName: string, campaignName: string, storylineName: string): Promise<Storyline | null> {
        const filePath = this.getStorylinePath(settingName, campaignName, storylineName);
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) as Storyline : null;
    }

    async getCharacter(settingName: string, campaignName: string, characterName: string): Promise<Character | null> {
        const filePath = `${this.getCharactersPath(settingName, campaignName)}/${characterName}`;
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) as Character : null;
    }

    async getLocation(settingName: string, campaignName: string, locationName: string): Promise<Location | null> {
        const filePath = `${this.getLocationsPath(settingName, campaignName)}/${locationName}`;
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) as Location : null;
    }

    async getFaction(settingName: string, campaignName: string, factionName: string): Promise<Faction | null> {
        const filePath = `${this.getFactionsPath(settingName, campaignName)}/${factionName}`;
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) as Faction : null;
    }

    async saveSetting(settingName: string, setting: Setting): Promise<void> {
        await this.unlockCompendium();

        settingName = this.stripInvalidFilenameChars(settingName);
        const journalPath = this.getSettingPath(settingName);

        // Create the path to the journal entry
        const parentFolderId: string | null = await this.createDirectory(journalPath);

        // Create the journal entry
        await JournalEntry.create( {
            name: "setting.json",
            folder: parentFolderId,
            pages: [
                {
                    name: "setting.json",
                    type: "text",
                    text: {
                        content: JSON.stringify(setting, null, 2),
                        format: 1
                    }
                }
            ]
        }, { pack: this.compendiumName })

        await this.lockCompendium();
    }

    async saveCampaign(settingName: string, campaignName: string, campaign: Campaign): Promise<void> {
        const filePath = this.getCampaignPath(settingName, campaignName);
        await this.saveFile(filePath, JSON.stringify(campaign, null, 2));
    }

    async saveStoryline(settingName: string, campaignName: string, storyline: Storyline): Promise<void> {
        const filePath = this.getStorylinePath(settingName, campaignName, storyline.name);
        await this.saveFile(filePath, JSON.stringify(storyline, null, 2));
    }

    async saveCharacter(settingName: string, campaignName: string, character: Character): Promise<void> {
        const filePath = `${this.getCharactersPath(settingName, campaignName)}/${character.name}`;
        await this.saveFile(filePath, JSON.stringify(character, null, 2));
    }

    async saveLocation(settingName: string, campaignName: string, location: Location): Promise<void> {
        const filePath = `${this.getLocationsPath(settingName, campaignName)}/${location.name}`;
        await this.saveFile(filePath, JSON.stringify(location, null, 2));
    }

    async saveFaction(settingName: string, campaignName: string, faction: Faction): Promise<void> {
        const filePath = `${this.getFactionsPath(settingName, campaignName)}/${faction.name}`;
        await this.saveFile(filePath, JSON.stringify(faction, null, 2));
    }

    async saveCharacterImage(settingName: string, campaignName: string, characterName: string, fileName: string, base64Image: string): Promise<void> {
        const filePath = `${this.getCharactersPath(settingName, campaignName)}/${characterName}/${fileName}`;
        await this.saveImage(filePath, base64Image);
    }

    async saveLocationImage(settingName: string, campaignName: string, locationName: string, fileName: string, base64Image: string): Promise<void> {
        const filePath = `${this.getLocationsPath(settingName, campaignName)}/${locationName}/${fileName}`;
        await this.saveImage(filePath, base64Image);
    }

    async saveFactionImage(settingName: string, campaignName: string, factionName: string, fileName: string, base64Image: string): Promise<void> {
        const filePath = `${this.getFactionsPath(settingName, campaignName)}/${factionName}/${fileName}`;
        await this.saveImage(filePath, base64Image);
    }

    async getEntity(setting: Setting, campaign: Campaign, entityType: EntityType, prompt: string): Promise<any | null> {
        const filePath = `${this.getEntityBasePath(setting, campaign, entityType)}/${prompt}`;
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) : null;
    }

    async saveEntity(setting: Setting, campaign: Campaign, entityType: EntityType, prompt: string, entity: any): Promise<void> {
        const filePath = `${this.getEntityBasePath(setting, campaign, entityType)}/${prompt}`;
        await this.saveFile(filePath, JSON.stringify(entity, null, 2));
    }

    async getSemanticIndex(setting: Setting, campaign: Campaign, entityType: EntityType): Promise<any | null> {
        const filePath = `${this.getEntityBasePath(setting, campaign, entityType)}/semantic_index`;
        const content = await this.loadFile(filePath);
        return content ? JSON.parse(content) : null;
    }

    async saveSemanticIndex(setting: Setting, campaign: Campaign, entityType: EntityType, index: any): Promise<void> {
        const filePath = `${this.getEntityBasePath(setting, campaign, entityType)}/semantic_index`;
        await this.saveFile(filePath, JSON.stringify(index, null, 2));
    }

    async saveFile(filePath: string, fileContent: string): Promise<void> {
        await this.unlockCompendium()

        const pack = game.packs?.get(filePath);
        if (!pack) throw new Error(`Compendium ${filePath} not found.`);

        // Initialize directory structure if it doesn't exist
        let parentFolderId: string | null = null;
        if (filePath.includes('/')) {
            const directoryPath:string = filePath.substring(0, filePath.lastIndexOf('/'));
            parentFolderId = await this.createDirectory(directoryPath);
        }

        const entryName = filePath.substring(filePath.lastIndexOf('/') + 1);
        const entries = await pack.getDocuments()
        let entry = entries.find((e:any) => e.name === entryName && e.parent === parentFolderId);

        if (entry) {

        } else {
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
                            format: 0
                        }
                    }
                ]
              },
              { pack: pack.collection }
            );
        }

        await this.lockCompendium()
    }

    async saveImage(filePath: string, base64Image: string): Promise<void> {
        const pack = game.packs?.get(filePath);
        if (!pack) throw new Error(`Compendium ${filePath} not found.`);
        const entry = await pack.getDocument(filePath).catch(() => null);
        if (entry) {
            await entry.update({ img: base64Image });
        } else {
            await pack.createDocument({ name: filePath, img: base64Image }, {});
        }
    }

    async loadFile(filePath: string): Promise<string | null> {
        const pack = game.packs?.get(filePath);
        if (!pack) throw new Error(`Compendium ${filePath} not found.`);
        const entry = await pack.getDocument(filePath);
        if (!entry) return null;
        return null;
        //return entry.data.content;
    }

    // Create a directory structure in the compendium pack
    async createDirectory(directoryPath: string): Promise<string> {
        const pack: any = game.packs?.get(this.compendiumName);
        const folderNames = directoryPath.split('/');

        let parentFolder: any = null;
        for (const folderName of folderNames) {
           let folder = pack.folders.find((f:any) => f.name === folderName && f.parent === (parentFolder?.id ?? null));
  
            if (!folder) {
                folder = await Folder.create({
                name: folderName,
                type: "JournalEntry",
                folder: parentFolder?.id ?? null,
                sorting: "a"
                }, { pack: pack.collection });
            }

            parentFolder = folder; 
        }

        return parentFolder.id;
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
        return `settings/${settingName}`;
    }

    getCampaignPath(settingName: string, campaignName: string): string {
        return `campaigns/${settingName}/${campaignName}`;
    }

    getStorylinePath(settingName: string, campaignName: string, storylineName: string): string {
        return `storylines/${settingName}/${campaignName}/${storylineName}`;
    }

    getCharactersPath(settingName: string, campaignName: string): string {
        return `characters/${settingName}/${campaignName}`;
    }

    getLocationsPath(settingName: string, campaignName: string): string {
        return `locations/${settingName}/${campaignName}`;
    }

    getFactionsPath(settingName: string, campaignName: string): string {
        return `factions/${settingName}/${campaignName}`;
    }

    getItemsPath(settingName: string, campaignName: string): string {
        return `items/${settingName}/${campaignName}`;
    }

    getEntityBasePath(setting: Setting, campaign: Campaign, entityType: EntityType): string {
        return `${entityType}/${setting.name}/${campaign.name}`;
    }

    stripInvalidFilenameChars(name: string): string {
        return name.replace(/[<>:"/\\|?*]/g, "_");
    }
}

export { FoundryStore };
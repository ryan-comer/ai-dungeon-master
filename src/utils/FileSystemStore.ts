import { IFileStore } from "./interfaces/IFileStore";
import { EntityType } from "../core/SemanticIndex";
import * as fs from "fs";
import * as path from "path";
import { Setting } from "../core/campaigns/models/Setting";
import { Campaign } from "../core/campaigns/models/Campaign";
import { Storyline } from "../core/campaigns/models/Storyline";
import { Character } from "../core/campaigns/models/Character";
import { Location } from "../core/campaigns/models/Location";
import { Faction } from "../core/campaigns/models/Faction";

import { stripInvalidFilenameChars } from "./utils";

class FileSystemStore implements IFileStore {

    async getSettings(): Promise<Setting[]> {
        const settingsDir = path.join(__dirname, "./settings");
        if (!fs.existsSync(settingsDir)) {
            return [];
        }

        // Get all directories in the settings folder
        const settingsDirs = fs.readdirSync(settingsDir).filter(file => fs.statSync(path.join(settingsDir, file)).isDirectory());

        const settings: Setting[] = [];
        for (const dir of settingsDirs) {
            const settingPath = path.join(settingsDir, dir, "setting.json");
            if (fs.existsSync(settingPath)) {
                const settingData = this.loadFile(settingPath);
                settings.push(JSON.parse(settingData) as Setting);
            }
        }

        return settings;
    }

    async getCampaigns(settingName: string): Promise<Campaign[]> {
        const campaignsDir = path.join(__dirname, "./settings", stripInvalidFilenameChars(settingName));
        if (!fs.existsSync(campaignsDir)) {
            return [];
        }

        // Get all directories in the campaigns folder
        const campaignDirs = fs.readdirSync(campaignsDir).filter(file => fs.statSync(path.join(campaignsDir, file)).isDirectory());

        const campaigns: Campaign[] = [];
        for (const dir of campaignDirs) {
            const campaignPath = path.join(campaignsDir, dir, "campaign.json");
            if (fs.existsSync(campaignPath)) {
                const campaignData = this.loadFile(campaignPath);
                campaigns.push(JSON.parse(campaignData) as Campaign);
            }
        }

        return campaigns;
    }

    async getSetting(settingName: string): Promise<Setting | null> {
        const filePath = this.getSettingPath(settingName);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const settingData = this.loadFile(filePath);
        return JSON.parse(settingData) as Setting;
    }

    async getCampaign(settingName: string, campaignName: string): Promise<Campaign | null> {
        const filePath = this.getCampaignPath(settingName, campaignName);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const campaignData = this.loadFile(filePath);
        return JSON.parse(campaignData) as Campaign;
    }

    async getStoryline(settingName: string, campaignName: string, storylineName: string): Promise<Storyline | null> {
        const filePath = this.getStorylinePath(settingName, campaignName, storylineName);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const storylineData = this.loadFile(filePath);
        return JSON.parse(storylineData) as Storyline;
    }

    async getCharacter(settingName: string, campaignName: string, characterName: string): Promise<Character | null> {
        const filePath = path.join(this.getCharactersPath(settingName, campaignName), stripInvalidFilenameChars(characterName), `entity.json`);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const characterData = this.loadFile(filePath);
        return JSON.parse(characterData) as Character;
    }

    async getLocation(settingName: string, campaignName: string, locationName: string): Promise<Location | null> {
        const filePath = path.join(this.getLocationsPath(settingName, campaignName), stripInvalidFilenameChars(locationName), `entity.json`);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const locationData = this.loadFile(filePath);
        return JSON.parse(locationData) as Location;
    }

    async getFaction(settingName: string, campaignName: string, factionName: string): Promise<Faction | null> {
        const filePath = path.join(this.getFactionsPath(settingName, campaignName), stripInvalidFilenameChars(factionName), `entity.json`);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const factionData = this.loadFile(filePath);
        return JSON.parse(factionData) as Faction;
    }

    async saveSetting(settingName: string, setting: Setting): Promise<void> {
        const filePath = this.getSettingPath(settingName);
        this.saveFile(filePath, JSON.stringify(setting, null, 2));
    }

    async saveCampaign(settingName: string, campaignName: string, campaign: Campaign): Promise<void> {
        const filePath = this.getCampaignPath(settingName, campaignName);
        this.saveFile(filePath, JSON.stringify(campaign, null, 2));
    }

    async saveStoryline(settingName: string, campaignName: string, storyline: Storyline): Promise<void> {
        const filePath = this.getStorylinePath(settingName, campaignName, storyline.name);
        this.saveFile(filePath, JSON.stringify(storyline, null, 2));
    }

    async saveCharacter(settingName: string, campaignName: string, character: Character): Promise<void> {
        const filePath = path.join(this.getCharactersPath(settingName, campaignName), stripInvalidFilenameChars(character.name), `entity.json`);
        this.saveFile(filePath, JSON.stringify(character, null, 2));
    }

    async saveLocation(settingName: string, campaignName: string, location: Location): Promise<void> {
        const filePath = path.join(this.getLocationsPath(settingName, campaignName), stripInvalidFilenameChars(location.name), `entity.json`);
        this.saveFile(filePath, JSON.stringify(location, null, 2));
    }

    async saveFaction(settingName: string, campaignName: string, faction: Faction): Promise<void> {
        const filePath = path.join(this.getFactionsPath(settingName, campaignName), stripInvalidFilenameChars(faction.name), `entity.json`);
        this.saveFile(filePath, JSON.stringify(faction, null, 2));
    }

    async saveCharacterImage(settingName: string, campaignName: string, characterName: string, fileName: string, base64Image: string): Promise<void> {
        const filePath = path.join(this.getCharactersPath(settingName, campaignName), `${stripInvalidFilenameChars(characterName)}`, fileName);
        this.saveImage(filePath, base64Image);
    }

    async saveLocationImage(settingName: string, campaignName: string, locationName: string, fileName: string, base64Image: string): Promise<void> {
        const filePath = path.join(this.getLocationsPath(settingName, campaignName), `${stripInvalidFilenameChars(locationName)}`, fileName);
        this.saveImage(filePath, base64Image);
    }

    async saveFactionImage(settingName: string, campaignName: string, factionName: string, fileName: string, base64Image: string): Promise<void> {
        const filePath = path.join(this.getFactionsPath(settingName, campaignName), `${stripInvalidFilenameChars(factionName)}`, fileName);
        this.saveImage(filePath, base64Image);
    }

    async getEntity(setting: Setting, campaign: Campaign, entityType: EntityType, prompt: string): Promise<any | null> {
        const basePath: string = this.getEntityBasePath(setting, campaign, entityType);
        const entityFileName: string = stripInvalidFilenameChars(prompt);
        const filePath: string = path.join(basePath, entityFileName, "entity.json");
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const entityData = this.loadFile(filePath);
        return JSON.parse(entityData);
    }

    async saveEntity(setting: Setting, campaign: Campaign, entityType: EntityType, prompt: string, entity: any): Promise<void> {
        const basePath: string = this.getEntityBasePath(setting, campaign, entityType);
        const entityFileName: string = stripInvalidFilenameChars(prompt);
        const filePath: string = path.join(basePath, entityFileName, "entity.json");
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        this.saveFile(filePath, JSON.stringify(entity, null, 2));
    }

    async getSemanticIndex(setting: Setting, campaign: Campaign, entityType: EntityType): Promise<any | null> {
        const basePath: string = this.getEntityBasePath(setting, campaign, entityType);
        const filePath: string = path.join(basePath, "semantic_index.json");
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const indexData = this.loadFile(filePath);
        return JSON.parse(indexData);
    }

    async saveSemanticIndex(setting: Setting, campaign: Campaign, entityType: EntityType, index: any): Promise<void> {
        const basePath: string = this.getEntityBasePath(setting, campaign, entityType);
        const filePath: string = path.join(basePath, "semantic_index.json");
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        this.saveFile(filePath, JSON.stringify(index, null, 2));
    }

    saveFile(filePath: string, fileContent: string): void {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, fileContent, "utf8");
    }

    saveImage(filePath: string, base64Image: string) {
        const buffer: Buffer = Buffer.from(base64Image, "base64");
        fs.writeFileSync(filePath, buffer);
    }

    loadFile(filePath: string): string {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        return fs.readFileSync(filePath, "utf8");
    }

    // Helper functions to get paths
    getSettingPath(settingName: string): string {
        return `./settings/${stripInvalidFilenameChars(settingName)}/setting.json`;
    }
    getCampaignPath(settingName: string, campaignName: string): string {
        return `./settings/${stripInvalidFilenameChars(settingName)}/${stripInvalidFilenameChars(campaignName)}/campaign.json`;
    }
    getStorylinePath(settingName: string, campaignName: string, storylineName: string): string {
        return `./settings/${stripInvalidFilenameChars(settingName)}/${stripInvalidFilenameChars(campaignName)}/storylines/${stripInvalidFilenameChars(storylineName)}.json`;
    }
    getCharactersPath(settingName: string, campaignName: string): string {
        return `./settings/${stripInvalidFilenameChars(settingName)}/${stripInvalidFilenameChars(campaignName)}/characters`;
    }
    getLocationsPath(settingName: string, campaignName: string): string {
        return `./settings/${stripInvalidFilenameChars(settingName)}/${stripInvalidFilenameChars(campaignName)}/locations`;
    }
    getFactionsPath(settingName: string, campaignName: string): string {
        return `./settings/${stripInvalidFilenameChars(settingName)}/${stripInvalidFilenameChars(campaignName)}/factions`;
    }
    getItemsPath(settingName: string, campaignName: string): string {
        return `./settings/${stripInvalidFilenameChars(settingName)}/${stripInvalidFilenameChars(campaignName)}/items`;
    }

    // Get the base path for the entity type
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

export { FileSystemStore };
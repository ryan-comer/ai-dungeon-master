import { IFileStore } from "./interfaces/IFileStore";
import { EntityType } from "../core/SemanticIndex";
import * as fs from "fs";
import * as path from "path";
import { Setting } from "../core/campaigns/models/Setting";
import { Campaign } from "../core/campaigns/models/Campaign";

class FileSystemStore implements IFileStore {
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

    directoryExists(directoryPath: string): boolean {
        return fs.existsSync(directoryPath);
    }

    createDirectory(directoryPath: string): void {
        if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath, { recursive: true });
        }
    }

    // Helper functions to get paths
    getSettingPath(settingName: string): string {
        return `./settings/${this.stripInvalidFilenameChars(settingName)}/setting.json`;
    }
    getCampaignPath(settingName: string, campaignName: string): string {
        return `./settings/${this.stripInvalidFilenameChars(settingName)}/${this.stripInvalidFilenameChars(campaignName)}/campaign.json`;
    }
    getStorylinePath(settingName: string, campaignName: string, storylineName: string): string {
        return `./settings/${this.stripInvalidFilenameChars(settingName)}/${this.stripInvalidFilenameChars(campaignName)}/storylines/${this.stripInvalidFilenameChars(storylineName)}.json`;
    }
    getCharacterPath(settingName: string, campaignName: string): string {
        return `./settings/${this.stripInvalidFilenameChars(settingName)}/${this.stripInvalidFilenameChars(campaignName)}/characters`;
    }
    getLocationsPath(settingName: string, campaignName: string): string {
        return `./settings/${this.stripInvalidFilenameChars(settingName)}/${this.stripInvalidFilenameChars(campaignName)}/locations`;
    }
    getFactionsPath(settingName: string, campaignName: string): string {
        return `./settings/${this.stripInvalidFilenameChars(settingName)}/${this.stripInvalidFilenameChars(campaignName)}/factions`;
    }
    getItemsPath(settingName: string, campaignName: string): string {
        return `./settings/${this.stripInvalidFilenameChars(settingName)}/${this.stripInvalidFilenameChars(campaignName)}/items`;
    }

    // Get the base path for the entity type
    getEntityBasePath(setting: Setting, campaign: Campaign, entityType: EntityType): string {
        const basePath: string = {
            [EntityType.Character]: this.getCharacterPath(setting.name, campaign.name),
            [EntityType.Location]: this.getLocationsPath(setting.name, campaign.name),
            [EntityType.Faction]: this.getFactionsPath(setting.name, campaign.name),
            [EntityType.Item]: this.getItemsPath(setting.name, campaign.name)
        }[entityType];

        return basePath
    }

    stripInvalidFilenameChars(name: string): string {
        return name.replace(/[^a-z0-9]/gi, "_");
    }
}

export { FileSystemStore };
import { Setting } from "../../core/campaigns/models/Setting";
import { Campaign } from "../../core/campaigns/models/Campaign";
import { EntityType } from "../../core/SemanticIndex";

interface IFileStore {
    saveFile(filePath: string, fileContent: string): void;
    saveImage(filePath: string, base64Image: string): void;
    loadFile(filePath: string): string;
    directoryExists(directoryPath: string): boolean;
    createDirectory(directoryPath: string): void;

    // Helper functions to get paths
    getSettingPath(settingName: string): string;
    getCampaignPath(settingName: string, campaignName: string): string;
    getStorylinePath(settingName: string, campaignName: string, storylineName: string): string;
    getCharacterPath(settingName: string, campaignName: string): string;
    getLocationsPath(settingName: string, campaignName: string): string;
    getFactionsPath(settingName: string, campaignName: string): string;
    getItemsPath(settingName: string, campaignName: string): string;
    getEntityBasePath(setting: Setting, campaign: Campaign, entityType: EntityType): string;

    stripInvalidFilenameChars(name: string): string;
}

export { IFileStore };
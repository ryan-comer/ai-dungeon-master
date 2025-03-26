interface IFileStore {
    saveFile(filePath: string, fileContent: string): void;
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

    stripInvalidFilenameChars(name: string): string;
}

export { IFileStore };
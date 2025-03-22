// The core manager that manages the core state of the AI Dungeon Master
interface ICoreManager {
    initialize(): void;

    createSetting(userPrompt: string): Promise<string>;
    createCampaign(settingName: string, userPrompt: string): Promise<string>;
    createStoryline(settingName: string, campaignName: string, milestoneIndex: number, userPrompt: string): Promise<string>;

    getSetting(settingName: string): Promise<string>;
    getCampaign(settingName: string, campaignName: string): Promise<string>;
    getStoryline(settingName: string, campaignName: string, storylineName: string): Promise<string>;
}

export { ICoreManager };
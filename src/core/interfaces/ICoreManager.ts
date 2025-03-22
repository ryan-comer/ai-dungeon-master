// The core manager that manages the core state of the AI Dungeon Master
interface ICoreManager {
    initialize(): void;
    createCampaign(userPrompt: string): Promise<string>;
    createSetting(setting: string, userPrompt: string): Promise<string>;
    createStoryline(setting: string, campaign: string, milestoneIndex: number, userPrompt: string): Promise<string>;
    loadCampaign(): void;
}

export { ICoreManager };
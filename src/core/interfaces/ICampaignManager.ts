interface ICampaignManager {
    createSetting(userPrompt: string): Promise<string>;
    createCampaign(setting: string, userPrompt: string): Promise<string>;
    createStoryline(setting: string, campaign: string, milestoneIndex: number, userPrompt: string): Promise<string>;
    deleteCampaign(): void;
    updateCampaign(): void;
    getCampaign(name: string): void;
}

export { ICampaignManager };
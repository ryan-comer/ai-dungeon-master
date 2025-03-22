interface ICampaignManager {
    createSetting(userPrompt: string): Promise<string>;
    createCampaign(setting: string, userPrompt: string): Promise<string>;
    createStoryline(setting: string, campaign: string, milestoneIndex: number, userPrompt: string): Promise<string>;

    getSetting(setting: string): Promise<string>;
    getCampaign(setting: string, campaign: string): Promise<string>;
    getStoryline(setting: string, campaign: string, storyline: string): Promise<string>;
}

export { ICampaignManager };
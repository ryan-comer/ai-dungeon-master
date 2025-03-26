import { CoreManager } from "./core/CoreManager";
import 'dotenv/config';

// Create a new instance of the core manager
const coreManager = new CoreManager();

// Initialize the core manager
coreManager.initialize();

// Create a campaign
const settingPrompt: string = "A fantasy setting with a dark and gritty tone.";
const campaignPrompt: string = "The players have to find the sword of 1000 truths to defeat the dark lord.";
coreManager.createSetting(settingPrompt).then(async (settingName: string) => {
    await coreManager.createCampaign(settingName, campaignPrompt).then(async (campaignName: string) => {
        const campaign: string = await coreManager.getCampaign(settingName, campaignName);
        const campaignJson: any = JSON.parse(campaign);

        for (let i = 0; i < campaignJson.milestones.length; i++) {
            await coreManager.createStoryline(settingName, campaignName, i, campaignJson.milestones[i].description);
        }
    })
})
import { CoreManager } from "./core/CoreManager";

// Create a new instance of the core manager
const coreManager = new CoreManager();

// Initialize the core manager
coreManager.initialize();

// Create a campaign
coreManager.createSetting().then(async (settingName: string) => {
    await coreManager.createCampaign(settingName).then(async (campaignName: string) => {
        await coreManager.createStoryline(settingName, campaignName, 0)
    })
})
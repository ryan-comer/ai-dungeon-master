import { CoreManager } from "./core/CoreManager";
import 'dotenv/config';

// Create a new instance of the core manager
const coreManager = new CoreManager();

// Initialize the core manager
coreManager.initialize();

// Create a campaign
const settingPrompt: string = "A world based on Spongebob";
const campaignPrompt: string = "The players have to defeat the evil Plankton. Give plankton a super interesting and unique goal that the players have to stop.";

//const settingPrompt: string = "A human's immune system (e.g. white blood cells, antibodies, etc.). The whole world is inside the body of a human.";
//const campaignPrompt: string = "The players have to fight off a genetically engineered virus to protect their host. Add as much drama and flair as you want to make it interesting";

//const settingPrompt: string = "The world of Gilmore Girls";
//const campaignPrompt: string = "The characters of Gilmore Girls are now in Texas";

//const settingPrompt: string = "The world of Eberron, specifically Karrnath";
//const campaignPrompt: string = "The campaign takes place in Karrnath and has a very interesting and unique plot";

//const settingPrompt: string = "The world of Pokemon";
//const campaignPrompt: string = "The players have to stop a unique threat to the world of Pokemon";

coreManager.createSetting(settingPrompt).then(async (settingName: string) => {
    await coreManager.createCampaign(settingName, campaignPrompt).then(async (campaignName: string) => {
        const campaign: string = await coreManager.getCampaign(settingName, campaignName);
        const campaignJson: any = JSON.parse(campaign);

        for (let i = 0; i < campaignJson.milestones.length; i++) {
            await coreManager.createStoryline(settingName, campaignName, i, campaignJson.milestones[i].description);
        }
    })
})
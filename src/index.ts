import { CoreManager } from "./core/CoreManager";
import { GoogleClient } from "./generation/clients/GoogleClient";
import { ForgeClient } from "./generation/clients/ForgeClient";
import { DiscordSpeechClient } from "./generation/clients/DiscordSpeechClient";
import 'dotenv/config';
import { ITextGenerationClient } from "./generation/clients/interfaces/ITextGenerationClient";
import { IImageGenerationClient } from "./generation/clients/interfaces/IImageGenerationClient";
import { IFileStore } from "./utils/interfaces/IFileStore";
import { FileSystemStore } from "./utils/FileSystemStore";
import { Setting } from "./core/models/Setting";
import { Campaign } from "./core/models/Campaign";
import { ITextToSpeechClient } from "./generation/clients/interfaces/ITextToSpeechClient";

// Create a new instance of the core manager
const textGenerationClient: ITextGenerationClient = new GoogleClient(process.env.GOOGLE_API_KEY as string);
const imageGenerationClient: IImageGenerationClient = new ForgeClient();
const speechClient: ITextToSpeechClient = new DiscordSpeechClient();
const fileStore: IFileStore = new FileSystemStore('./storage');


const coreManager = new CoreManager(textGenerationClient, imageGenerationClient, speechClient, fileStore);

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

coreManager.createSetting(settingPrompt).then(async (setting: Setting) => {
    await coreManager.createCampaign(setting.name, campaignPrompt).then(async (campaign: Campaign) => {
        for (let i = 0; i < campaign.milestones.length; i++) {
            await coreManager.createStoryline(setting.name, campaign.name, i, campaign.milestones[i].description);
        }
    })
});

/*
coreManager.createSetting(settingPrompt).then(async (settingName: string) => {
    await coreManager.createCampaign(settingName, campaignPrompt).then(async (campaignName: string) => {
        const campaign: string = await coreManager.getCampaign(settingName, campaignName);
        const campaignJson: any = JSON.parse(campaign);

        for (let i = 0; i < campaignJson.milestones.length; i++) {
            await coreManager.createStoryline(settingName, campaignName, i, campaignJson.milestones[i].description);
        }
    })
})
*/
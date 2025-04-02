import { CoreManager } from "../src/core/CoreManager.ts";

import { ForgeClient } from "../src/generation/clients/ForgeClient.ts";
import { GoogleClient } from "../src/generation/clients/GoogleClient.ts";
import { FoundryStore } from "../src/utils/FoundryStore.ts";

export class CampaignWindow extends Application {

    settingsList;

    constructor(options = {}) {
        super(options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "campaign-window",
            title: "Campaign Settings",
            template: "modules/ai-dungeon-master/templates/campaign-window.html",
            width: 400,
            height: "auto",
            resizable: true
        })
    }

    activateListeners(html) {
        super.activateListeners(html);

        this.settingsList = html.find('#setting-list');

        html.find('#create-setting-btn').click(this._onCreateSetting.bind(this));
        html.find('#create-campaign-btn').click(this._onCreateCampaign.bind(this));
    }

    _onCreateSetting(event) {
        event.preventDefault();

        const settingPrompt = document.getElementById('setting-prompt').value;
        console.log("Setting Prompt:", settingPrompt);

        const googleApiKey = game.settings.get("ai-dungeon-master", "googleApiKey");
        const coreManager = new CoreManager(new GoogleClient(googleApiKey), new ForgeClient(), new FoundryStore());

        coreManager.createSetting(settingPrompt).then(async (settingName) => {
            console.log("Setting created:", settingName);
            await this.refreshSettings();
        })
    }

    _onCreateCampaign(event) {
        event.preventDefault();

        const campaignPrompt = document.getElementById('campaign-prompt').value;
        console.log("Campaign Prompt:", campaignPrompt);
    }

    async refreshSettings() {
        const store = new FoundryStore();
        const settings = await store.getSettings();
        
        // Clear existing settings
        this.settingsList.empty();

        // Add new settings
        settings.forEach(setting => {
            const option = $(`<option value="${setting.name}">${setting.name}</option>`);
            this.settingsList.append(option);
        });

        console.log("Settings refreshed:", settings);
    }
}
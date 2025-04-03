import { CoreManager } from "../src/core/CoreManager.ts";

import { ForgeClient } from "../src/generation/clients/ForgeClient.ts";
import { GoogleClient } from "../src/generation/clients/GoogleClient.ts";
import { FoundryStore } from "../src/utils/FoundryStore.ts";

export class CampaignWindow extends Application {

    settingsList;
    campaignList;

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
        this.campaignList = html.find('#campaign-list');

        html.find('#create-setting-btn').click(this._onCreateSetting.bind(this));
        html.find('#create-campaign-btn').click(this._onCreateCampaign.bind(this));

        // Add change listener to settings list
        this.settingsList.change(this._onSettingChange.bind(this));
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

    async _onCreateCampaign(event) {
        event.preventDefault();

        const campaignPrompt = document.getElementById('campaign-prompt').value;
        console.log("Campaign Prompt:", campaignPrompt);

        // Check if a setting is selected
        const settingName = this.settingsList.val();
        if (!settingName) {
            ui.notifications.error("Please select a setting before creating a campaign.");
            return;
        }

        console.log("Selected Setting:", settingName);

        const googleApiKey = game.settings.get("ai-dungeon-master", "googleApiKey");
        const coreManager = new CoreManager(new GoogleClient(googleApiKey), new ForgeClient(), new FoundryStore());
        const campaignName = await coreManager.createCampaign(settingName, campaignPrompt);
        console.log("Campaign created:", campaignName);

        await this.refreshCampaigns();
    }

    _onSettingChange(event) {
        this.checkEnableCampaigns();
    }

    checkEnableCampaigns() {
        const selectedSetting = this.settingsList.val();
        const isSettingSelected = !!selectedSetting;

        // Enable or disable campaign options based on the selected setting
        this.campaignList.prop('disabled', !isSettingSelected);
        document.getElementById('campaign-prompt').disabled = !isSettingSelected;
        document.getElementById('create-campaign-btn').disabled = !isSettingSelected;
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

        this.checkEnableCampaigns();

        console.log("Settings refreshed:", settings);
    }

    async refreshCampaigns() {
        const store = new FoundryStore();
        const campaigns = await store.getCampaigns();
        
        // Clear existing campaigns
        this.campaignList.empty();

        // Add new campaigns
        campaigns.forEach(campaign => {
            const option = $(`<option value="${campaign.name}">${campaign.name}</option>`);
            this.campaignList.append(option);
        });

        console.log("Campaigns refreshed:", campaigns);
    }
}
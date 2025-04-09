import { CoreManager } from "../src/core/CoreManager.ts";
import { ForgeClient } from "../src/generation/clients/ForgeClient.ts";
import { GoogleClient } from "../src/generation/clients/GoogleClient.ts";
import { FoundryStore } from "../src/utils/FoundryStore.ts";
import { Logger } from "../src/utils/Logger.ts";
import { getCoreManager } from "./core-manager-instance.js";

export class CampaignWindow extends Application {

    settingsList;
    campaignList;

    googleApiKey;
    logger;
    coreManager;

    constructor(options = {}) {
        super(options);
        this.coreManager = getCoreManager();
        this.logger = this.coreManager.Logger();
    }

    static get defaultOptions() {
        return Object.assign(super.defaultOptions, {
            id: "campaign-window",
            title: "Campaign Settings",
            template: "modules/ai-dungeon-master/templates/campaign-window.html",
            width: 400,
            height: "auto",
            resizable: true
        });
    }

    activateListeners(html) {
        super.activateListeners(html);

        this.settingsList = html.find('#setting-list');
        this.campaignList = html.find('#campaign-list');
        this.loadingIcon = html.find('#loading-icon');
        this.statusText = html.find('#status-text');

        this.createSettingButton = html.find('#create-setting-btn');
        this.createCampaignButton = html.find('#create-campaign-btn');
        this.loadCampaignButton = html.find('#load-campaign-btn');
        this.startSessionButton = html.find('#start-session-btn');

        this.createSettingButton.click(this._onCreateSetting.bind(this));
        this.createCampaignButton.click(this._onCreateCampaign.bind(this));
        this.loadCampaignButton.click(this._onLoadCampaign.bind(this));
        this.startSessionButton.click(this._onStartSession.bind(this));

        // Add change listener to settings list
        this.settingsList.change(this._onSettingChange.bind(this));

        // Refesh settings and campaigns on load
        this.refreshSettings().then(() => {
            this.refreshCampaigns();
        });

        // Check if there's a loaded campaign
        this.coreManager.getLoadedCampaign().then(loadedCampaign => {
            console.log("Loaded campaign:", loadedCampaign);
            if (loadedCampaign) {
                document.getElementById('campaign-loaded').textContent = loadedCampaign.name;
                document.getElementById('start-session-btn').classList.remove('hidden');
            } else {
                document.getElementById('start-session-btn').classList.add('hidden');
            }
        });
    }

    async _onCreateSetting(event) {
        event.preventDefault();

        const settingPrompt = document.getElementById('setting-prompt').value;
        const createSettingButton = document.getElementById('create-setting-btn');
        createSettingButton.disabled = true; // Disable button

        this.logger.on("info", (message) => {
            this._setLoadingState(true, message);
        });

        try {
            const setting = await this.coreManager.createSetting(settingPrompt);
            console.dir(setting)
            await this.refreshSettings();
        } finally {
            this._setLoadingState(false, "Idle");
            createSettingButton.disabled = false; // Re-enable button
        }
    }

    async _onCreateCampaign(event) {
        event.preventDefault();

        const campaignPrompt = document.getElementById('campaign-prompt').value;
        const createCampaignButton = document.getElementById('create-campaign-btn');
        createCampaignButton.disabled = true; // Disable button

        // Check if a setting is selected
        const settingName = this.settingsList.val();
        if (!settingName) {
            ui.notifications.error("Please select a setting before creating a campaign.");
            createCampaignButton.disabled = false; // Re-enable button
            return;
        }

        this.logger.on("info", (message) => {
            this._setLoadingState(true, message);
        });

        try {
            const campaign = await this.coreManager.createCampaign(settingName, campaignPrompt);

            for (let i = 0; i < campaign.milestones.length; i++) {
                await this.coreManager.createStoryline(settingName, campaign.name, i, campaign.milestones[i].description);
            }

            await this.refreshCampaigns();
        } finally {
            this._setLoadingState(false, "Idle");
            createCampaignButton.disabled = false; // Re-enable button
        }
    }

    async _onLoadCampaign(event) {
        event.preventDefault();

        const selectedCampaign = this.campaignList.val();
        if (!selectedCampaign) {
            ui.notifications.error("Please select a campaign to load.");
            return;
        }

        const selectedSetting = this.settingsList.val();
        if (!selectedSetting) {
            ui.notifications.error("Please select a setting before loading a campaign.");
            return;
        }

        try {
            this._setLoadingState(true, "Loading campaign...");
            const campaign = await this.coreManager.loadCampaign(selectedSetting, selectedCampaign);
            document.getElementById('campaign-loaded').textContent = campaign.name;
            document.getElementById('start-session-btn').classList.remove('hidden');

            ui.notifications.info(`Campaign "${campaign.name}" loaded successfully.`);
        } finally {
            this._setLoadingState(false, "Idle");
        }
    }

    async _onSettingChange(event) {
        this.checkEnableCampaigns();
        await this.refreshCampaigns();
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
        console.log("Refreshing settings...");

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
    }

    async refreshCampaigns() {
        console.log("Refreshing campaigns...");

        // Get the selected setting
        const selectedSetting = this.settingsList.val();
        if (!selectedSetting) {
            this.logger.info("No setting selected, skipping campaign refresh.");
            return; // No setting selected, do nothing
        }

        const store = new FoundryStore();
        const campaigns = await store.getCampaigns(selectedSetting);
        
        // Clear existing campaigns
        this.campaignList.empty();

        // Add new campaigns
        campaigns.forEach(campaign => {
            const option = $(`<option value="${campaign.name}">${campaign.name}</option>`);
            this.campaignList.append(option);
        });

        if (campaigns.length > 0) {
            this.loadCampaignButton.prop('disabled', false);
        }
    }

    async _onStartSession() {
        await this.coreManager.startSession();
    }

    _setLoadingState(isLoading, status) {
        this.loadingIcon.toggleClass('hidden', !isLoading);
        this.statusText.text(status);
    }
}
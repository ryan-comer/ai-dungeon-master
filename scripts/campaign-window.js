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
        this.sessionList = html.find('#session-list');
        this.loadingIcon = html.find('#loading-icon');
        this.statusText = html.find('#status-text');

        this.createSettingButton = html.find('#create-setting-btn');
        this.createCampaignButton = html.find('#create-campaign-btn');
        this.createSessionButton = html.find('#create-session-btn');

        this.startSessionButton = html.find('#start-session-btn');
        this.sessionPrompt = html.find('#session-prompt');

        this.createSettingButton.click(this._onCreateSetting.bind(this));
        this.createCampaignButton.click(this._onCreateCampaign.bind(this));
        this.createSessionButton.click(this._onCreateSession.bind(this));
        this.startSessionButton.click(this._onStartSession.bind(this));

        // Add change listener to settings list
        this.settingsList.change(this._onSettingChange.bind(this));
        this.campaignList.change(this._onCampaignChange.bind(this));
        this.sessionList.change(this._onSessionChange.bind(this));

        // Refesh settings and campaigns on load
        this.refreshSettings().then(async () => {
            await this.refreshCampaigns();
            await this.refreshSessions();
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

    async _onCampaignChange(event) {
        await this.refreshSessions();
    }

    async _onSettingChange(event) {
        await this.refreshCampaigns();
        await this.refreshSessions();
    }

    async _onSessionChange(event) {
        // placeholder if needed for session selection changes
    }

    async _onCreateSession(event) {
        event.preventDefault();
        const sessionPrompt = this.sessionPrompt.val();
        const createBtn = this.createSessionButton;
        createBtn.prop('disabled', true);
        const settingName = this.settingsList.val();
        const campaignName = this.campaignList.val();
        if (!settingName || !campaignName) {
            ui.notifications.error("Please select a setting and campaign before creating a session.");
            createBtn.prop('disabled', false);
            return;
        }
        if (sessionPrompt.length === 0) {
            ui.notifications.error("Please enter a session prompt.");
            createBtn.prop('disabled', false);
            return;
        }
        console.log("Creating session:", settingName, campaignName, sessionPrompt);
        this.logger.on("info", msg => this._setLoadingState(true, msg));
        try {
            await this.coreManager.createSession(settingName, campaignName, sessionPrompt);
            await this.refreshSessions();
        } finally {
            this._setLoadingState(false, "Idle");
            createBtn.prop('disabled', false);
        }
    }

    async _onStartSession(event) {
        event.preventDefault();
        const settingName = this.settingsList.val();
        const campaignName = this.campaignList.val();
        const sessionName = this.sessionList.val();
        
        if (!settingName || !campaignName || !sessionName) {
            ui.notifications.error("Please select a setting, campaign, and session before starting.");
            return;
        } else {
            console.log("Starting session:", settingName, campaignName, sessionName);
        }
        
        try {
            this._setLoadingState(true, "Starting session...");
            await this.coreManager.startSession(settingName, campaignName, sessionName);
        } catch (error) {
            ui.notifications.error("Failed to start session: " + error.message);
            console.error(error);
        } finally {
            this._setLoadingState(false, "Idle");
        }
    }

    _setLoadingState(isLoading, status) {
        this.loadingIcon.toggleClass('hidden', !isLoading);
        this.statusText.text(status);
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
    }

    async refreshSessions() {
        console.log("Refreshing sessions...");
        const settingName = this.settingsList.val();
        const campaignName = this.campaignList.val();
        if (!settingName || !campaignName) {
            this.sessionList.empty();
            return;
        }
        const store = new FoundryStore();
        const sessions = await store.getSessions(settingName, campaignName);
        this.sessionList.empty();
        sessions.forEach(s => {
            const opt = $(`<option value="${s.name}">${s.name}</option>`);
            this.sessionList.append(opt);
        });
    }
}
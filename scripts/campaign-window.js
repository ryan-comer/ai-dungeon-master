import { CoreManager } from "../src/core/CoreManager.ts";
import { ForgeClient } from "../src/generation/clients/ForgeClient.ts";
import { GoogleClient } from "../src/generation/clients/GoogleClient.ts";
import { FoundryStore } from "../src/utils/FoundryStore.ts";
import { Logger } from "../src/utils/Logger.ts";
import { getCoreManager } from "./core-manager-instance.js";

export class CampaignWindow extends Application {

    // Grids
    settingsGrid;
    campaignsGrid;
    sessionsGrid;
    playersGrid;

    // Selected entities
    selectedSetting;
    selectedCampaign;
    selectedSession;

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
            width: 800,
            height: "auto",
            resizable: true
        });
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Grids
        this.settingsGrid = html.find('#settings-grid');
        this.campaignsGrid = html.find('#campaigns-grid');
        this.sessionsGrid = html.find('#sessions-grid');
        this.playersGrid = html.find('#players-grid');

        this.loadingIcon = html.find('#loading-icon');
        this.statusText = html.find('#status-text');

        this.createSettingButton = html.find('#create-setting-btn');
        this.createCampaignButton = html.find('#create-campaign-btn');
        this.createSessionButton = html.find('#create-session-btn');
    this.startSessionButton = html.find('#start-session-btn');

    this.sessionPrompt = html.find('#session-prompt');
    this.processingStatus = html.find('#processing-status');

        this.createSettingButton.click(this._onCreateSetting.bind(this));
        this.createCampaignButton.click(this._onCreateCampaign.bind(this));
    this.createSessionButton.click(this._onCreateSession.bind(this));
    this.startSessionButton.click(this._onStartSession.bind(this));

        // Tabs switching (scoped, custom classes)
        const tabs = html.find('.adm-tabs .adm-tab');
        const panes = html.find('.adm-tab-pane');
        tabs.click((e) => {
            const tab = $(e.currentTarget);
            const name = tab.data('tab');
            tabs.removeClass('active');
            tab.addClass('active');
            panes.removeClass('active');
            html.find(`#tab-${name}`).addClass('active');
        });

        // Grid selections
        this.settingsGrid.on('click', '.entity-card', (e) => {
            const name = $(e.currentTarget).data('name');
            this._selectSetting(name);
        });
        this.campaignsGrid.on('click', '.entity-card', (e) => {
            const name = $(e.currentTarget).data('name');
            this._selectCampaign(name);
        });
        this.sessionsGrid.on('click', '.entity-card', (e) => {
            const name = $(e.currentTarget).data('name');
            this._selectSession(name);
        });

        // Refesh settings and campaigns on load
        this.refreshSettings().then(async () => {
            await this.refreshCampaigns();
            await this.refreshSessions();
            await this.refreshPlayers();
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
        const settingName = this.selectedSetting;
        if (!settingName) {
            ui.notifications.error("Please select a setting before creating a campaign.");
            createCampaignButton.disabled = false; // Re-enable button
            return;
        }

        this.logger.on("info", (message) => {
            this._setLoadingState(true, message);
        });

        try {
            // Handle PDF manual uploads - we need to store them temporarily and pass the file data
            const playerInput = document.getElementById('player-manual-upload');
            const gmInput = document.getElementById('gm-manual-upload');
            
            let pdfManuals = {};
            
            // Instead of uploading immediately, we'll pass the file data to be handled after campaign creation
            if (playerInput?.files?.length > 0) {
                pdfManuals.playerManualFile = playerInput.files[0];
            }
            
            if (gmInput?.files?.length > 0) {
                pdfManuals.gmManualFile = gmInput.files[0];
            }

            // Create campaign with progressive generation
            const campaign = await this.coreManager.createCampaign(settingName, campaignPrompt, pdfManuals);
            ui.notifications.info("Campaign creation started! You can monitor progress below and resume if needed.");

            await this.refreshCampaigns();
        } catch (error) {
            console.error("Campaign creation failed:", error);
            ui.notifications.error("Campaign creation failed: " + error.message);
        } finally {
            this._setLoadingState(false, "Idle");
            createCampaignButton.disabled = false; // Re-enable button
        }
    }

    // Selection helpers
    _selectSetting(name) {
        this.selectedSetting = name;
        // highlight
    this.settingsGrid.find('.entity-card').removeClass('selected');
    this.settingsGrid.find('.entity-card').filter((_, el) => $(el).data('name') === name).addClass('selected');
        // clear dependent selections
        this.selectedCampaign = undefined;
        this.selectedSession = undefined;
        // refresh dependent grids
        this.refreshCampaigns();
        this.refreshSessions();
        this.refreshPlayers();
    }

    _selectCampaign(name) {
        if (!this.selectedSetting) {
            ui.notifications.warn('Select a setting first.');
            return;
        }
        this.selectedCampaign = name;
    this.campaignsGrid.find('.entity-card').removeClass('selected');
    this.campaignsGrid.find('.entity-card').filter((_, el) => $(el).data('name') === name).addClass('selected');
        this.selectedSession = undefined;
        this.refreshSessions();
        this.refreshPlayers();
    }

    _selectSession(name) {
        if (!this.selectedSetting || !this.selectedCampaign) {
            ui.notifications.warn('Select a setting and campaign first.');
            return;
        }
        this.selectedSession = name;
    this.sessionsGrid.find('.entity-card').removeClass('selected');
    this.sessionsGrid.find('.entity-card').filter((_, el) => $(el).data('name') === name).addClass('selected');
        this.refreshPlayers();
    }

    async _onCreateSession(event) {
        event.preventDefault();
        const sessionPrompt = this.sessionPrompt.val();
        const createBtn = this.createSessionButton;
        createBtn.prop('disabled', true);
        const settingName = this.selectedSetting;
        const campaignName = this.selectedCampaign;
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

    // Start session button removed from Players tab; players are independent
    async _onStartSession(event) {
        event.preventDefault();
        const startBtn = this.startSessionButton;
        startBtn.prop('disabled', true);
        try {
            const settingName = this.selectedSetting;
            const campaignName = this.selectedCampaign;
            const sessionName = this.selectedSession;
            if (!settingName || !campaignName) {
                ui.notifications.error("Please select a setting and campaign.");
                return;
            }
            if (!sessionName) {
                ui.notifications.error("Please select a session to start.");
                return;
            }

            // Read player AI control flags from Players tab checkboxes
            const players = [];
            this.playersGrid.find('.player-checkbox').each((_, el) => {
                const $el = $(el);
                const name = $el.data('player-name');
                const isAIControlled = $el.is(':checked');
                players.push({ name, isAIControlled });
            });

            this._setLoadingState(true, `Starting session: ${sessionName}`);
            await this.coreManager.startSession(settingName, campaignName, sessionName, players);
            ui.notifications.info(`Session started: ${sessionName}`);
        } catch (err) {
            console.error("Failed to start session:", err);
            ui.notifications.error(`Failed to start session: ${err.message || err}`);
        } finally {
            this._setLoadingState(false, "Idle");
            startBtn.prop('disabled', false);
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
        // Clear and populate grid
        this.settingsGrid.empty();
        if (!settings || settings.length === 0) {
            this.settingsGrid.append('<div class="empty-note">No settings found. Create one below.</div>');
            return;
        }
        settings.forEach(setting => {
            const name = setting.name;
            const card = $(`
                <div class="entity-card setting-card" data-name="${name}">
                    <div class="entity-title">${name}</div>
                </div>
            `);
            if (this.selectedSetting === name) card.addClass('selected');
            this.settingsGrid.append(card);
        });
    }

    async refreshCampaigns() {
        console.log("Refreshing campaigns...");

        // Get the selected setting
        const selectedSetting = this.selectedSetting;
        // Clear grid first
        this.campaignsGrid.empty();
        if (!selectedSetting) {
            this.logger.info("No setting selected, skipping campaign refresh.");
            this.campaignsGrid.append('<div class="empty-note">Select a setting to view campaigns.</div>');
            return; // No setting selected, do nothing
        }

        const store = new FoundryStore();
        const campaigns = await store.getCampaigns(selectedSetting);
        if (!campaigns || campaigns.length === 0) {
            this.campaignsGrid.append('<div class="empty-note">No campaigns yet. Create one below.</div>');
            return;
        }
        campaigns.forEach(campaign => {
            const name = campaign.name;
            const card = $(`
                <div class="entity-card campaign-card" data-name="${name}">
                    <div class="entity-title">${name}</div>
                </div>
            `);
            if (this.selectedCampaign === name) card.addClass('selected');
            this.campaignsGrid.append(card);
        });
    }

    async refreshSessions() {
        console.log("Refreshing sessions...");
        const settingName = this.selectedSetting;
        const campaignName = this.selectedCampaign;
        this.sessionsGrid.empty();
        if (!settingName || !campaignName) {
            this.sessionsGrid.append('<div class="empty-note">Select a setting and campaign to view sessions.</div>');
            return;
        }
        const store = new FoundryStore();
        const sessions = await store.getSessions(settingName, campaignName);
        if (!sessions || sessions.length === 0) {
            this.sessionsGrid.append('<div class="empty-note">No sessions yet. Create one below.</div>');
            return;
        }
        sessions.forEach(s => {
            const name = s.name;
            const card = $(`
                <div class="entity-card session-card" data-name="${name}">
                    <div class="entity-title">${name}</div>
                </div>
            `);
            if (this.selectedSession === name) card.addClass('selected');
            this.sessionsGrid.append(card);
        });
    }
    
    /**
     * Refresh the player control list: list all player actors and their AI control flag
     */
    async refreshPlayers() {
        this.playersGrid.empty();
        // Retrieve players via CoreManager to avoid duplicating logic
        let players = [];
        try {
            players = await this.coreManager.getPlayers();
        } catch (err) {
            console.error("Failed to fetch players:", err);
        }
        // For each player, create a card with a checkbox
        players.forEach(p => {
            const name = p.name;
            const isAI = false; // default unchecked until session start
            const card = $(`
                <div class="entity-card player-card" data-name="${name}">
                    <label class='player-label'>
                        <input type='checkbox' class='player-checkbox' data-player-name='${name}' ${isAI ? 'checked' : ''} />
                        ${name} <span class='muted'>(AI Controlled)</span>
                    </label>
                </div>
            `);
            this.playersGrid.append(card);
        });
    }

    // Player creation UI removed per request

    // In-progress campaigns UI removed per request
}
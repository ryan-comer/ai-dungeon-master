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
        this.playerList = html.find('#player-list');
        this.campaignList = html.find('#campaign-list');
        this.sessionList = html.find('#session-list');
        this.progressCampaignList = html.find('#progress-campaign-list');
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

        // Add change listener to settings list
        this.settingsList.change(this._onSettingChange.bind(this));
        this.campaignList.change(this._onCampaignChange.bind(this));
        this.sessionList.change(this._onSessionChange.bind(this));
        // When session changes, refresh the player control list
        this.sessionList.change(this._onSessionChange.bind(this));

        // Refesh settings and campaigns on load
        this.refreshSettings().then(async () => {
            await this.refreshCampaigns();
            await this.refreshSessions();
            await this.refreshPlayers();
            await this.refreshInProgressCampaigns();
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
            await this.refreshInProgressCampaigns();
        } catch (error) {
            console.error("Campaign creation failed:", error);
            ui.notifications.error("Campaign creation failed: " + error.message);
            await this.refreshInProgressCampaigns(); // Refresh to show failed campaign
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
        // Refresh player list when selecting a session
        const settingName = this.settingsList.val();
        const campaignName = this.campaignList.val();
        const sessionName = this.sessionList.val();
        if (!settingName || !campaignName || !sessionName) {
            this.playerList.empty();
            return;
        }
        await this.refreshPlayers();
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
            // Collect AI control flags for all session players
            const sessionPlayers = [];
            this.playerList.find('input.player-checkbox').each((i, el) => {
                const name = $(el).data('player-name');
                const isAI = $(el).is(':checked');
                sessionPlayers.push({ name, isAIControlled: isAI });
            });
            // Start the session with initial player control flags
            this._setLoadingState(true, "Starting session with player flags...");
            await this.coreManager.startSession(settingName, campaignName, sessionName, sessionPlayers);
            // Refresh player list UI after session start
            await this.refreshPlayers();
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
    
    /**
     * Refresh the player control list: list all player actors and their AI control flag
     */
    async refreshPlayers() {
        this.playerList.empty();
        // Retrieve players via CoreManager to avoid duplicating logic
        let players = [];
        try {
            players = await this.coreManager.getPlayers();
        } catch (err) {
            console.error("Failed to fetch players:", err);
        }
        // For each player, create a checkbox
        players.forEach(p => {
            const name = p.name;
            const isAI = false; // default unchecked until session start
            const item = $("<div class='player-item'></div>");
            const checkbox = $(`<input type='checkbox' class='player-checkbox' data-player-name='${name}'/>`);
            checkbox.prop('checked', isAI);
            const label = $(`<label class='player-label'>${name} (AI Controlled)</label>`);
            item.append(checkbox, label);
            this.playerList.append(item);
        });
    }

    async refreshInProgressCampaigns() {
        try {
            const inProgressCampaigns = await this.coreManager.getInProgressCampaigns();
            this.populateInProgressCampaigns(inProgressCampaigns);
        } catch (error) {
            console.error("Error refreshing in-progress campaigns:", error);
        }
    }

    populateInProgressCampaigns(campaigns) {
        this.progressCampaignList.empty();
        
        if (campaigns.length === 0) {
            this.progressCampaignList.append('<p><em>No campaigns currently in progress</em></p>');
            return;
        }

        campaigns.forEach(campaign => {
            const progress = campaign.progress;
            const progressPercentage = progress ? this.getOverallProgress(progress) : 0;
            const stageText = progress ? progress.stage.replace(/_/g, ' ').toUpperCase() : 'Unknown';
            const statusClass = this.getProgressStatusClass(progress);
            
            const campaignCard = $(`
                <div class="campaign-progress-card ${statusClass}">
                    <div class="campaign-header">
                        <h4>${campaign.name}</h4>
                        <span class="setting-name">(${campaign.setting})</span>
                    </div>
                    <div class="progress-info">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                        </div>
                        <span class="progress-text">${progressPercentage}% - ${stageText}</span>
                    </div>
                    <div class="campaign-actions">
                        <button class="resume-campaign-btn" data-setting="${campaign.setting}" data-campaign="${campaign.name}" 
                                ${progress?.stage === 'completed' ? 'disabled' : ''}>
                            ${progress?.stage === 'failed' ? 'Retry' : progress?.stage === 'completed' ? 'Complete' : 'Resume'}
                        </button>
                        <button class="view-progress-btn" data-setting="${campaign.setting}" data-campaign="${campaign.name}">
                            View Details
                        </button>
                    </div>
                    ${progress?.error ? `<div class="error-message">Error: ${progress.error}</div>` : ''}
                </div>
            `);
            
            this.progressCampaignList.append(campaignCard);
        });

        // Bind event handlers for the buttons
        this.progressCampaignList.find('.resume-campaign-btn').click(this._onResumeCampaign.bind(this));
        this.progressCampaignList.find('.view-progress-btn').click(this._onViewProgress.bind(this));
    }

    async _onResumeCampaign(event) {
        const button = $(event.currentTarget);
        const settingName = button.data('setting');
        const campaignName = button.data('campaign');
        
        button.prop('disabled', true);
        
        this.logger.on("info", (message) => {
            this._setLoadingState(true, message);
        });

        try {
            await this.coreManager.resumeCampaignGeneration(settingName, campaignName);
            ui.notifications.info("Campaign generation completed successfully!");
            await this.refreshInProgressCampaigns();
            await this.refreshCampaigns();
        } catch (error) {
            console.error("Campaign resume failed:", error);
            ui.notifications.error("Failed to resume campaign generation: " + error.message);
            await this.refreshInProgressCampaigns();
        } finally {
            this._setLoadingState(false, "Idle");
            button.prop('disabled', false);
        }
    }

    async _onViewProgress(event) {
        const button = $(event.currentTarget);
        const settingName = button.data('setting');
        const campaignName = button.data('campaign');
        
        try {
            const campaign = await this.coreManager.getCampaign(settingName, campaignName);
            if (campaign && campaign.progress) {
                this._showProgressDialog(campaign);
            }
        } catch (error) {
            console.error("Error viewing progress:", error);
            ui.notifications.error("Could not load campaign progress details.");
        }
    }

    _showProgressDialog(campaign) {
        const progress = campaign.progress;
        const completedStages = progress.completedStages.map(stage => stage.replace(/_/g, ' ')).join(', ');
        const storylineDetails = progress.storylineProgress.map(sp => 
            `<li>${sp.milestoneName}: ${sp.completed ? '✅ Complete' : '⏳ Pending'}${sp.error ? ` (Error: ${sp.error})` : ''}</li>`
        ).join('');
        
        const content = `
            <div class="progress-details">
                <h3>${campaign.name} Progress</h3>
                <p><strong>Overall Progress:</strong> ${this.getOverallProgress(progress)}%</p>
                <p><strong>Current Stage:</strong> ${progress.stage.replace(/_/g, ' ')}</p>
                <p><strong>Completed Stages:</strong> ${completedStages || 'None'}</p>
                
                <h4>Storyline Progress:</h4>
                <ul>${storylineDetails}</ul>
                
                ${progress.error ? `<div class="error"><strong>Error:</strong> ${progress.error}</div>` : ''}
                <p><strong>Last Updated:</strong> ${new Date(progress.lastUpdated).toLocaleString()}</p>
            </div>
        `;

        new Dialog({
            title: "Campaign Generation Progress",
            content: content,
            buttons: {
                close: {
                    label: "Close"
                }
            },
            default: "close"
        }).render(true);
    }

    getOverallProgress(progress) {
        if (!progress) return 0;
        const completedStagesCount = progress.completedStages ? progress.completedStages.length : 0;
        const currentStageProgress = (progress.currentStageProgress || 0) / 100;
        const totalStages = progress.totalStages || 7;
        return Math.round(((completedStagesCount + currentStageProgress) / totalStages) * 100);
    }

    getProgressStatusClass(progress) {
        if (!progress) return 'in-progress';
        if (progress.stage === 'failed') return 'failed';
        if (progress.stage === 'completed') return 'completed';
        return 'in-progress';
    }
}
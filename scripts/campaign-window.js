console.log("Campaign Window Loaded")
export class CampaignWindow extends Application {
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

        html.find('#create-setting-btn').click(this._onCreateSetting.bind(this));
        html.find('#create-campaign-btn').click(this._onCreateCampaign.bind(this));
    }

    _onCreateSetting(event) {
        event.preventDefault();

        const settingPrompt = document.getElementById('setting-prompt').value;
        console.log("Setting Prompt:", settingPrompt);
    }

    _onCreateCampaign(event) {
        event.preventDefault();

        const campaignPrompt = document.getElementById('campaign-prompt').value;
        console.log("Campaign Prompt:", campaignPrompt);
    }
}
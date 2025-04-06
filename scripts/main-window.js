import {
    CampaignWindow
} from './campaign-window.js';
import { getCoreManager } from "./core-manager-instance.js";

function campaignLoaded(campaign) {

}

export function initializeMainWindow() {
    // Wait for the DOM to be fully loaded
    const chatControls = document.getElementById('chat-controls');
    if (chatControls) {
        const templatePath = 'modules/ai-dungeon-master/templates/main-window.html';
        fetch(templatePath)
            .then(response => response.text())
            .then(html => {
                const templateElement = document.createElement('div');
                templateElement.style.flex = '0';
                templateElement.innerHTML = html;

                // Add the template before the chat controls
                chatControls.before(templateElement);
            })
            .then(() => {
                document.getElementById('ai-dm-submit-prompt').addEventListener('click', () => {
                    const coreManager = getCoreManager();

                    const prompt = document.getElementById('ai-dm-prompt').value;

                    coreManager.userMessage(prompt);
                });

                document.getElementById('ai-dm-settings-button').addEventListener('click', () => {
                    const campaignWindow = new CampaignWindow();
                    campaignWindow.render(true);
                });
            })
            .catch(error => console.error(`Failed to load template: ${templatePath}`, error));
    } else {
        console.error("Chat log element not found.");
    }
}
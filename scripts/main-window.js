import { CampaignWindow } from './campaign-window.js';

// Wait for the DOM to be fully loaded
Hooks.on('ready', () => {
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
                    const prompt = document.getElementById('ai-dm-prompt').value;
                    const responseElement = document.getElementById('ai-dm-status-message');

                    // Simulate AI response (replace this with actual API call logic)
                    const simulatedResponse = `You said: "${prompt}"`;

                    // Display the response
                    responseElement.textContent = simulatedResponse;
                });

                document.getElementById('ai-dm-settings-button').addEventListener('click', () => {
                    console.log('Settings button clicked!');
                    const campaignWindow = new CampaignWindow();
                    campaignWindow.render(true);
                });
            })
            .catch(error => console.error(`Failed to load template: ${templatePath}`, error));
    } else {
        console.error("Chat log element not found.");
    }
});
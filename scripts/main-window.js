import {
    CampaignWindow
} from './campaign-window.js';
import { getCoreManager } from "./core-manager-instance.js";

Hooks.on('chatMessage', (chatLog, messageText, chatData) => {
    const coreManager = getCoreManager();
    if (messageText.startsWith('/ai')) {
        if (game.user.isGM) {
            // If the user is a GM, we can process the command directly
            console.log("Processing command as GM:", messageText);
            coreManager.userMessage(messageText, chatData);
        } else {
            // Send the message to the GM's instance
            console.log("Sending command to GM:", messageText);
            game.socket.emit('module.ai-dungeon-master', {
                type: 'userMessage',
                content: messageText,
                chatData: chatData
            });
        }
        return false;
    }
});


export function initializeMainWindow() {
    const coreManager = getCoreManager();

    // Listen for messages sent to the GM's instance
    if (game.user.isGM) {
        game.socket.on('module.ai-dungeon-master', (data) => {
            console.log("Received message from player:", data);
            if (data.type === 'userMessage') {
                coreManager.userMessage(data.content, data.chatData);
            }
        });
    }

    // Wait for the DOM to be fully loaded
    const chatControls = document.getElementById('chat-controls');
    if (chatControls && game.user.isGM) {

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
                /*
                document.getElementById('ai-dm-submit-prompt').addEventListener('click', () => {
                    const prompt = document.getElementById('ai-dm-prompt').value;

                    //coreManager.userMessage(prompt);
                });
                */

                document.getElementById('ai-dm-settings-button').addEventListener('click', () => {
                    const campaignWindow = new CampaignWindow();
                    campaignWindow.render(true);
                });

                // Subscribe to logger events
                const statusMessageElement = document.getElementById('ai-dm-status-message');
                if (statusMessageElement) {
                    coreManager.logger.on('log', (message) => {
                        statusMessageElement.textContent = `Log: ${message}`;
                    });

                    coreManager.logger.on('info', (message) => {
                        statusMessageElement.textContent = `Info: ${message}`;
                    });

                    coreManager.logger.on('error', (error) => {
                        statusMessageElement.textContent = `Error: ${error}`;
                        console.error("Error in AI Dungeon Master:", error);
                    });
                } else {
                    console.error("Status message element not found.");
                }
            })
            .catch(error => console.error(`Failed to load template: ${templatePath}`, error));
    } else {
        console.error("Chat log element not found.");
    }
}
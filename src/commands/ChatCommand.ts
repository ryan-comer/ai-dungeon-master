import { ICommand } from "./interfaces/ICommand";
import { IContextManager } from "../core/interfaces/IContextManager";
import { ChatData } from "../core/interfaces/ICoreManager";
import { sendChatMessage } from "../utils/utils";
import { ITool } from "../tools/interfaces/ITool";

class ChatCommand implements ICommand {
    name: string;
    description: string;

    constructor() {
        this.name = "ChatCommand";
        this.description = "Command for the AI DM to process a user message and generate a response.";
    }

    async execute(message: string, chatData: ChatData, contextManager: IContextManager): Promise<void> {
        // Parse the message to extract the user input from /aidm
        const commandPrefix: string = "/aidm";
        message = message.slice(commandPrefix.length).trim(); // Remove the command prefix
        if (message.length === 0) {
            contextManager.logger.warn("No message provided after command prefix.");
            return;
        }

        sendChatMessage(`${chatData.speaker}: ${message}`); // Send the user message to the chat

        let response: string = "";
        try {
            response = await contextManager.textGenerationClient.generateText(message, contextManager.chatHistory);
        } catch (error) {
            contextManager.logger.error("Error generating text:", error);
            return;
        }
        contextManager.chatHistory.push(message); // Add user message to chat history
        contextManager.chatHistory.push(response); // Add AI response to chat history
        sendChatMessage(response); // Send the AI response to the chat

        // Check if any tools should be fired
        if (contextManager.tools.length > 0) {
            const toolsToFire = await this.checkForTools(contextManager);
            for (const tool of toolsToFire || []) {
                contextManager.logger.info(`Firing tool: ${tool.name}`);
                await tool.run(contextManager); // Run the tool
            }
        }
    }

    help(): string {
        return `Usage: /aidm {MESSAGE}`;
    }

    async checkForTools(contextManager: IContextManager): Promise<ITool[] | null> {
        const prompt: string = `
        I am going to give you a list of tools
        Each tool has a name an a description
        The description explains when the tools should be fired
        I want you to tell me which tools should be fired based on the current context of our conversation

        Here is the list of tools:
        [
            ${contextManager.tools.map(tool => JSON.stringify({
                name: tool.name,
                description: tool.description
            }))}
        ]

        I want you to respond with the names of the tool that should be fired
        Only respond with the names of the tool
        If multiple tools should be fired, respond with the names of all the tools separated by commas
        Example: "Tool1, Tool2, Tool3"
        It's possible that no tool should be fired, in that case respond with 'None'
        Do not respond with anything else
        `

        const response: string = await contextManager.textGenerationClient.generateText(prompt, contextManager.chatHistory);

        if (response.trim() === "None") {
            return null; // No tool should be fired
        }

        const toolNames: string[] = response.split(",").map(name => name.trim());
        const toolsToFire: ITool[] = [];
        for (const toolName of toolNames) {
            const tool: ITool | undefined = contextManager.tools.find(t => t.name === toolName.trim());
            if (tool) {
                toolsToFire.push(tool); // Add the tool to the list of tools to fire
            } else {
                contextManager.logger.warn(`Tool not found: ${toolName}`);
            }
        }

        return toolsToFire; // Return the list of tools to fire
    }
}

export { ChatCommand };
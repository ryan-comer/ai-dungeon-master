import { ICommand } from "./interfaces/ICommand";
import { SceneViewerTool } from "../tools/SceneViewerTool";
import { IContextManager } from "../core/interfaces/IContextManager";
import { ChatData } from "../core/interfaces/ICoreManager";
import { sendChatMessage } from "../utils/utils";

class SceneViewCommand implements ICommand {
    name: string;
    description: string;

    constructor() {
        this.name = "SceneViewCommand";
        this.description = "Command to view the current scene.";
    }

    async execute(message: string, chatData: ChatData, contextManager: IContextManager): Promise<void> {
        sendChatMessage("Viewing the current scene...");

        // Logic to view the current scene
        const sceneViewerTool = new SceneViewerTool();
        await sceneViewerTool.run(contextManager);
    }

    help(): string {
        return `Usage: /aishow {Optional Prompt}`;
    }
}

export { SceneViewCommand };
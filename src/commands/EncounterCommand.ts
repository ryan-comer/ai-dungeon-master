import { ICommand } from "./interfaces/ICommand";
import { CreateEncounterTool } from "../tools/CreateEncounterTool";
import { sendChatMessage } from "../utils/utils";

class EncounterCommand implements ICommand {
    name: string;
    description: string;

    constructor() {
        this.name = "EncounterCommand";
        this.description = "Command to generate a combat encounter.";
    }

    async execute(message: string, chatData: any, contextManager: any): Promise<any> {
        sendChatMessage("Creating a combat encounter...");
        // Logic to generate a combat encounter
        const createEncounterTool = new CreateEncounterTool();
        await createEncounterTool.run(contextManager);
    }

    help(): string {
        return `Usage: /aiencounter {Optional Prompt}`;
    }
}

export { EncounterCommand };
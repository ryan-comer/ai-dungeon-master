import { IContextManager } from "../../core/interfaces/IContextManager";
import { ChatData } from "../../core/interfaces/ICoreManager";

interface ICommand {
    name: string;
    description: string;
    execute(message: string, chatData: ChatData, contextManager: IContextManager): Promise<void>;
    help(): string;
}

export { ICommand };
import { IContextManager } from "../../core/interfaces/IContextManager";

// Callable tool for the AI assistant to run
interface ITool {
    name: string;
    description: string;
    run(contextmanager: IContextManager): Promise<void>;
}

export { ITool };
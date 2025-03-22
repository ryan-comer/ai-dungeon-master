// Callable tool for the AI assistant to run
interface ITool {
    name: string;
    description: string;
    run(): void;
}

export { ITool };
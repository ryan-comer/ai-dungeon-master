class Session {
    public name: string;
    public chatHistory: string[];

    constructor(name: string = "Default Session") {
        this.name = name;
        this.chatHistory = [];
    }
}

export { Session };
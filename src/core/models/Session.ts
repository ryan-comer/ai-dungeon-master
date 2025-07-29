class Session {
    public name: string;
    public chatHistory: string[];
    public sessionIndices: number[];

    constructor(name: string = "Default Session") {
        this.name = name;
        this.chatHistory = [];
        this.sessionIndices = [];
    }
}

export { Session };
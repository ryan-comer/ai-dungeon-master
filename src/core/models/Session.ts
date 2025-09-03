import { SessionPlayer } from "./SessionPlayer";
import { ChatMessage } from "./ChatMessage";
class Session {
    public name: string;
    public chatMessages: ChatMessage[];
    public sessionIndices: number[];
    public players: SessionPlayer[];

    constructor(name: string = "Default Session") {
        this.name = name;
        this.chatMessages = [];
        this.sessionIndices = [];
        this.players = [];
    }
}

export { Session };
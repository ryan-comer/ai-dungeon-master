import { Context } from "../models/Context"

import { Setting } from "../models/Setting";
import { Campaign } from "../models/Campaign";

interface IContextManager {
    loadContext(setting: Setting, campaign: Campaign): Promise<Context | null>;
    startSession(): Promise<void>;
    sendUserMessage(message: string): Promise<void>;
}

export { IContextManager };
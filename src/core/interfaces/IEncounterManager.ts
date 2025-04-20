import { init } from "fp-ts/lib/ReadonlyNonEmptyArray";
import { Encounter } from "../models/Encounter";
import { IContextManager } from "./IContextManager";

interface IEncounterManager {
    init(contextManager: IContextManager): void;
    startEncounter(contextManager: IContextManager): void;
    endEncounter(): void;
}

export { IEncounterManager };
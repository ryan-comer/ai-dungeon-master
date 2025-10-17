import { Setting } from "../../core/models/Setting";
import { Campaign } from "../../core/models/Campaign";
import { Storyline } from "../../core/models/Storyline";
import { EntityType } from "../../core/SemanticIndex";
import { Character } from "../../core/models/Character";
import { Location } from "../../core/models/Location";
import { Faction } from "../../core/models/Faction";
import { Session } from "../../core/models/Session";

interface IFileStore {
    getCharacters(settingName: string, campaignName: string): Promise<Character[]>;
    getLocations(settingName: string, campaignName: string): Promise<Location[]>;
    getFactions(settingName: string, campaignName: string): Promise<Faction[]>;

    getSetting(settingName: string): Promise<Setting | null>;
    getCampaign(settingName: string, campaignName: string): Promise<Campaign | null>;
    getStoryline(settingName: string, campaignName: string, storylineName: string): Promise<Storyline | null>;
    getCharacter(settingName: string, campaignName: string, characterName: string): Promise<Character | null>;
    getLocation(settingName: string, campaignName: string, locationName: string): Promise<Location | null>;
    getFaction(settingName: string, campaignName: string, factionName: string): Promise<Faction | null>;

    getSettings(): Promise<Setting[]>;
    getCampaigns(settingName: string): Promise<Campaign[]>;
    getInProgressCampaigns(): Promise<Campaign[]>;

    saveSetting(settingName: string, setting: Setting): Promise<void>;
    saveCampaign(settingName: string, campaignName: string, campaign: Campaign): Promise<void>;
    saveStoryline(settingName: string, campaignName: string, storyline: Storyline): Promise<void>;
    saveCharacter(settingName: string, campaignName: string, character: Character): Promise<void>;
    saveLocation(settingName: string, campaignName: string, location: Location): Promise<void>;
    saveFaction(settingName: string, campaignName: string, faction: Faction): Promise<void>;

    saveSession(settingName: string, campaignName: string, sessionName: string, session: Session): Promise<void>;
    getSession(settingName: string, campaignName: string, sessionName: string): Promise<Session | null>;
    getSessions(settingName: string, campaignName: string): Promise<Session[]>;

    saveCharacterImage(settingName: string, campaignName: string, characterName: string, fileName: string, base64Image: string): Promise<void>;
    saveLocationImage(settingName: string, campaignName: string, locationName: string, fileName: string, base64Image: string): Promise<void>;
    saveFactionImage(settingName: string, campaignName: string, factionName: string, fileName: string, base64Image: string): Promise<void>;

    getEntity(setting: Setting, campaign: Campaign, entityType: EntityType, prompt: string): Promise<any | null>;
    saveEntity(setting: Setting, campaign: Campaign, entityType: EntityType, prompt: string, entity: any): Promise<void>;

    getSemanticIndex(setting: Setting, campaign: Campaign, entityType: EntityType): Promise<any | null>;
    saveSemanticIndex(setting: Setting, campaign: Campaign, entityType: EntityType, index: any): Promise<void>;

    getBasePath(): string;
    getCampaignDirectory(settingName: string, campaignName: string): string;
    saveFile(filePath: string, data: string): Promise<void>;
    saveImage(filePath: string, data: string): Promise<void>;
    loadFile(filePath: string): Promise<string | null> | string;
    fileExists(filePath: string): Promise<boolean>;
}

export { IFileStore };
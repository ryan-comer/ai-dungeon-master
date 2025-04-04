import { Setting } from "../../core/campaigns/models/Setting";
import { Campaign } from "../../core/campaigns/models/Campaign";
import { Storyline } from "../../core/campaigns/models/Storyline";
import { EntityType } from "../../core/SemanticIndex";
import { Character } from "../../core/campaigns/models/Character";
import { Location } from "../../core/campaigns/models/Location";
import { Faction } from "../../core/campaigns/models/Faction";

interface IFileStore {
    // Helper functions to get paths
    getSetting(settingName: string): Promise<Setting | null>;
    getCampaign(settingName: string, campaignName: string): Promise<Campaign | null>;
    getStoryline(settingName: string, campaignName: string, storylineName: string): Promise<Storyline | null>;
    getCharacter(settingName: string, campaignName: string, characterName: string): Promise<Character | null>;
    getLocation(settingName: string, campaignName: string, locationName: string): Promise<Location | null>;
    getFaction(settingName: string, campaignName: string, factionName: string): Promise<Faction | null>;

    getSettings(): Promise<Setting[]>;
    getCampaigns(settingName: string): Promise<Campaign[]>;

    saveSetting(settingName: string, setting: Setting): Promise<void>;
    saveCampaign(settingName: string, campaignName: string, campaign: Campaign): Promise<void>;
    saveStoryline(settingName: string, campaignName: string, storyline: Storyline): Promise<void>;
    saveCharacter(settingName: string, campaignName: string, character: Character): Promise<void>;
    saveLocation(settingName: string, campaignName: string, location: Location): Promise<void>;
    saveFaction(settingName: string, campaignName: string, faction: Faction): Promise<void>;

    saveCharacterImage(settingName: string, campaignName: string, characterName: string, fileName: string, base64Image: string): Promise<void>;
    saveLocationImage(settingName: string, campaignName: string, locationName: string, fileName: string, base64Image: string): Promise<void>;
    saveFactionImage(settingName: string, campaignName: string, factionName: string, fileName: string, base64Image: string): Promise<void>;

    getEntity(setting: Setting, campaign: Campaign, entityType: EntityType, prompt: string): Promise<any | null>;
    saveEntity(setting: Setting, campaign: Campaign, entityType: EntityType, prompt: string, entity: any): Promise<void>;

    getSemanticIndex(setting: Setting, campaign: Campaign, entityType: EntityType): Promise<any | null>;
    saveSemanticIndex(setting: Setting, campaign: Campaign, entityType: EntityType, index: any): Promise<void>;

    saveFile(filePath: string, data: string): Promise<void>;
}

export { IFileStore };
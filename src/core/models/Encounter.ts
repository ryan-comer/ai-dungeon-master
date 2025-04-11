import * as t from "io-ts";

const AbilityScoresCodec = t.type({
    strength: t.number,
    dexterity: t.number,
    constitution: t.number,
    intelligence: t.number,
    wisdom: t.number,
    charisma: t.number,
});

const SpellCodec = t.type({
    name: t.string,
    description: t.string,
    effect: t.string,
    imagePrompt: t.string
});

const FeatureCodec = t.type({
    name: t.string,
    description: t.string,
    effect: t.string,
    imagePrompt: t.string
});

const WeaponCodec = t.type({
    name: t.string,
    description: t.string,
    effect: t.string,
    imagePrompt: t.string
});

const EquipmentCodec = t.type({
    name: t.string,
    description: t.string,
    effect: t.string,
    imagePrompt: t.string
});

const EntityCodec = t.type({
    name: t.string,
    description: t.string,
    tokenPrompt: t.string,
    count: t.number,
    class: t.string,
    level: t.number,
    alignment: t.string,
    abilities: AbilityScoresCodec,
    armorClass: t.number,
    hitPoints: t.number,
    speed: t.number,
    weapons: t.array(WeaponCodec),
    equipment: t.array(EquipmentCodec),
    spells: t.array(SpellCodec),
    features: t.array(FeatureCodec),
    cr: t.number,
    size: t.union([t.literal("tiny"), t.literal("sm"), t.literal("med"), t.literal("lg"), t.literal("huge"), t.literal("grg")]),
});

const EncounterCodec = t.type({
    name: t.string,
    description: t.string,
    battlemapPrompt: t.string,
    entities: t.array(EntityCodec),
});

class AbilityScores {
    constructor(
        public strength: number,
        public dexterity: number,
        public constitution: number,
        public intelligence: number,
        public wisdom: number,
        public charisma: number
    ) {}
}

class Spell {
    constructor(public name: string, public description: string, public effect: string, public imagePrompt: string) {}
}

class Feature {
    constructor(public name: string, public description: string, public effect: string, public imagePrompt: string) {}
}

class Weapon {
    constructor(public name: string, public description: string, public effect: string, public imagePrompt: string) {}
}

class Equipment {
    constructor(public name: string, public description: string, public effect: string, public imagePrompt: string) {}
}

class Entity {
    constructor(
        public name: string,
        public description: string,
        public tokenPrompt: string,
        public count: number,
        public classType: string,
        public level: number,
        public alignment: string,
        public abilities: AbilityScores,
        public armorClass: number,
        public hitPoints: number,
        public speed: number,
        public weapons: Weapon[],
        public equipment: Equipment[],
        public spells: Spell[],
        public features: Feature[],
        public cr: number,
        public size: string,
    ) {}
}

class Encounter {
    constructor(
        public name: string,
        public description: string,
        public battlemapPrompt: string,
        public entities: Entity[]
    ) {}
}

export { Encounter, EncounterCodec };
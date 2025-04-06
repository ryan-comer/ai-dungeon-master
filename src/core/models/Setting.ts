import * as t from 'io-ts';

class Setting {
	name: string;
	description: string;
	geography: Array<{
		name: string;
		description: string;
		features: string;
		settlements: Array<{
			name: string;
			description: string;
			population: string;
			knownFor: string;
		}>;
	}>;
	factions: Array<{
		name: string;
		description: string;
		alignment: string;
		goals: string;
		members: Array<{
			name: string;
			role: string;
			description: string;
		}>;
	}>;
	notableFigures: Array<{
		name: string;
		description: string;
		role: string;
	}>;
	historicalEvents: Array<{
		name: string;
		description: string;
		date: string;
	}>;
	deities: Array<{
		name: string;
		description: string;
	}>;
	monsters: Array<{
		name: string;
		description: string;
		habitat: string;
	}>;
	conflicts: Array<{
		name: string;
		description: string;
		parties: Array<{
			name: string;
			description: string;
		}>;
	}>;

	constructor(data: any) {
		this.name = data.name;
		this.description = data.description;
		this.geography = data.geography;
		this.factions = data.factions;
		this.notableFigures = data.notableFigures;
		this.historicalEvents = data.historicalEvents;
		this.deities = data.deities;
		this.monsters = data.monsters;
		this.conflicts = data.conflicts;
	}
}

const SettingCodec = t.type({
	name: t.string,
	description: t.string,
	geography: t.array(
		t.type({
			name: t.string,
			description: t.string,
			features: t.string,
			settlements: t.array(
				t.type({
					name: t.string,
					description: t.string,
					population: t.string,
					knownFor: t.string,
				})
			),
		})
	),
	factions: t.array(
		t.type({
			name: t.string,
			description: t.string,
			alignment: t.string,
			goals: t.string,
			members: t.array(
				t.type({
					name: t.string,
					role: t.string,
					description: t.string,
				})
			),
		})
	),
	notableFigures: t.array(
		t.type({
			name: t.string,
			description: t.string,
			role: t.string,
		})
	),
	historicalEvents: t.array(
		t.type({
			name: t.string,
			description: t.string,
			date: t.string,
		})
	),
	deities: t.array(
		t.type({
			name: t.string,
			description: t.string,
		})
	),
	monsters: t.array(
		t.type({
			name: t.string,
			description: t.string,
			habitat: t.string,
		})
	),
	conflicts: t.array(
		t.type({
			name: t.string,
			description: t.string,
			parties: t.array(
				t.type({
					name: t.string,
					description: t.string,
				})
			),
		})
	),
});

export { Setting, SettingCodec };
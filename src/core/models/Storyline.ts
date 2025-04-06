import * as t from 'io-ts';

class Storyline {
	name: string;
	campaign: string;
	description: string;
	objectives: string[];
	segments: {
		name: string;
		description: string;
		tasks: {
			name: string;
			description: string;
			objective: string;
		}[];
		locations: {
			name: string;
			description: string;
			features: string;
		}[];
		characters: {
			name: string;
			description: string;
			role: string;
		}[];
	}[];
	factions: {
		name: string;
		description: string;
		relevance: string;
	}[];

	constructor(data: {
		name: string;
		campaign: string;
		description: string;
		objectives: string[];
		segments: {
			name: string;
			description: string;
			tasks: {
				name: string;
				description: string;
				objective: string;
			}[];
			locations: {
				name: string;
				description: string;
				features: string;
			}[];
			characters: {
				name: string;
				description: string;
				role: string;
			}[];
		}[];
		factions: {
			name: string;
			description: string;
			relevance: string;
		}[];
	}) {
		this.name = data.name;
		this.campaign = '';
		this.description = data.description;
		this.objectives = data.objectives;
		this.segments = data.segments;
		this.factions = data.factions;
	}
}

const StorylineCodec = t.type({
	name: t.string,
	campaign: t.string,
	description: t.string,
	objectives: t.array(t.string),
	segments: t.array(
		t.type({
			name: t.string,
			description: t.string,
			tasks: t.array(
				t.type({
					name: t.string,
					description: t.string,
					objective: t.string,
				})
			),
			locations: t.array(
				t.type({
					name: t.string,
					description: t.string,
					features: t.string,
				})
			),
			characters: t.array(
				t.type({
					name: t.string,
					description: t.string,
					role: t.string,
				})
			),
		})
	),
	factions: t.array(
		t.type({
			name: t.string,
			description: t.string,
			relevance: t.string,
		})
	),
});

export { Storyline, StorylineCodec };
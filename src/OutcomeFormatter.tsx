import {Result} from "./Outcome";
import {SimpleFormatter} from "./SimpleFormatter";
import {ScavengerFormatter} from "./ScavengerFormatter";

export type ComponentProperties = {
    absolute: string,
    sign: '+' | '-' | '=',
    result: Result,
    type: 'die' | 'modifier' | 'total',
    dieEmoji: string // This is used for specific dice faces
}

export type OutcomeProperties = {
    content: string,
    components: ComponentProperties[]
}

export enum OutcomeTheme {
    Nerd = 'Nerd',
    Normie = 'Normie',
    Scavenger = 'Scavenger',
    Wizard = 'Wizard',
    Pilot = 'Pilot',
    Hacker = 'Hacker',
    Cliquebait = 'Cliquebait',
    OldOne = 'OldOne'
}

export const THEME_FORMATTERS: {[theme in OutcomeTheme]: OutcomeFormatter} = {
    Nerd: new SimpleFormatter(),
    Normie: new SimpleFormatter(),
    Scavenger: new ScavengerFormatter(),
    Wizard: new SimpleFormatter(),
    Pilot: new SimpleFormatter(),
    Hacker: new SimpleFormatter(),
    Cliquebait: new SimpleFormatter(),
    OldOne: new SimpleFormatter()
}

// Map each theme to a set of [verbiage, emoji] for each outcome:
export const THEME_VERBIAGE: {[theme in OutcomeTheme]: {[result in Result]: string[]}} = {
    Nerd: {
        'none': ['No Roll Required', '😐'],
        'failure': ['Failure', '😞'],
        'mixed': ['Mixed Success', '😐'],
        'success': ['Complete Success', '🙂'],
        'critical': ['Critical Success', '😃']
    }, Normie: {
        'none': ['None', '👌'],
        'failure': ['Bad', '👎'],
        'mixed': ['Fair', '👌'],
        'success': ['Good', '👍'],
        'critical': ['Great', '🔥']
    }, Scavenger: {
        'none': ['Dull', '💤'],
        'failure': ['Scrap', '🗑️'],
        'mixed': ['Scuff', '🔧'],
        'success': ['Solid', '💪'],
        'critical': ['Turbo', '🤘']
    }, Wizard: {
        'none': ['Idle', '🔮'],
        'failure': ['Blunder', '❄️'],
        'mixed': ['Falter', '🎭'],
        'success': ['Clear', '✨'],
        'critical': ['Excel', '💥']
    }, Pilot: { // Space/sci-fi theme
        'none': ['Safe', '🌕'],
        'failure': ['Abort', '🌑'],
        'mixed': ['Adrift', '💫'],
        'success': ['Locked', '🚀'],
        'critical': ['Stellar', '🌌']
    }, Hacker: {
        'none': ['Null', ':|'],
        'failure': ['Crash', ':\'('],
        'mixed': ['Glitch', ':/'],
        'success': ['Sync', ':)'],
        'critical': ['Root', ':D']
    }, Cliquebait: {
        'none': ['Pass', '😶'],
        'failure': ['Cringe', '😨'],
        'mixed': ['Awkward', '😩'],
        'success': ['Tight', '😎'],
        'critical': ['Iconic', '🤩']
    }, OldOne: {
        'none': ['Dormant', '💤'],
        'failure': ['Doomed', '🐙'],
        'mixed': ['Warped', '⚝'],
        'success': ['Attuned', '🗝️'],
        'critical': ['Ascendant', '🎆']
    }
}

export interface OutcomeFormatter {
    formatOutcome(outcomeProperties: OutcomeProperties, theme: OutcomeTheme): string;
    formatResponse(content: string, outcomeProperties: OutcomeProperties, theme: OutcomeTheme): string;
}
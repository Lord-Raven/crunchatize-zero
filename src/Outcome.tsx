import {Action} from "./Action";

export enum Result {
    Failure = 'Failure',
    MixedSuccess = 'Mixed Success',
    CompleteSuccess = 'Complete Success',
    CriticalSuccess = 'Critical Success',
    None = 'No Roll Needed'
}

export const ResultDescription: {[result in Result]: string} = {
    [Result.Failure]: `{{user}} will fail to achieve their goal and will actively sour or worsen their situation. Describe {{user}}'s actions, dialog, and poor outcome in your own words as you continue to propel the narrative.`,
    [Result.MixedSuccess]: `{{user}} may achieve their goal, but in an inferior way or at some cost. Describe {{user}}'s actions, dialog, and mixed outcome in your own words as you continue to propel the narrative.`,
    [Result.CompleteSuccess]: `{{user}} will successfully achieve what they were attempting and clearly improve their situation. Describe {{user}}'s actions, dialog, and positive outcome in your own words as you continue to propel the narrative.`,
    [Result.CriticalSuccess]: `{{user}} will resoundingly achieve what they were attempting, dramatically improving their situation in incredible fashion or with better-than-dreamed-of results. Describe {{user}}'s actions, dialog, and overwhelmingly successful outcome in your own words as you continue to propel the narrative.`,
    [Result.None]: '{{user}} took a risk-free action. Describe their actions and dialog in your own words as you continue to propel the narrative.'
}

export const ResultSpan: {[result in Result]: (input: string) => string} = {
    [Result.Failure]: (input: string) => `<span style='color: red;'>${input}</span>`,
    [Result.MixedSuccess]: (input: string) => `<span style='color: darkorange;'>${input}</span>`,
    [Result.CompleteSuccess]: (input: string) => `<span style='color: mediumseagreen;'>${input}</span>`,
    [Result.CriticalSuccess]: (input: string) => `<span style='color: #b9f2ff;''>${input}</span>`,
    [Result.None]: (input: string) => input,
}

const emojiDice: {[key: number]: string} = {
    1: ResultSpan["Failure"]('\u2680 1'),
    2: ResultSpan["Mixed Success"]('\u2681 2'),
    3: ResultSpan["Mixed Success"]('\u2682 3'),
    4: ResultSpan["Complete Success"]('\u2683 4'),
    5: ResultSpan["Complete Success"]('\u2684 5'),
    6: ResultSpan["Critical Success"]('\u2685 6')
}

export class Outcome {
    result: Result;
    dieResult1: number;
    dieResult2: number;
    action: Action;
    total: number;

    constructor(dieResult1: number, dieResult2: number, action: Action) {
        const total = dieResult1 + dieResult2 + action.difficultyModifier;
        this.result = (action.free ? Result.None : (dieResult1 + dieResult2 == 12 ? Result.CriticalSuccess : (total >= 10 ? Result.CompleteSuccess : (total >= 7 ? Result.MixedSuccess : Result.Failure))));

        this.dieResult1 = dieResult1;
        this.dieResult2 = dieResult2;
        this.action = action;
        this.total = this.dieResult1 + this.dieResult2 + this.action.difficultyModifier;
    }

    getDieEmoji(side: number): string {

        return emojiDice[side];
    }

    getDifficultyColor(modifier: number): string {
        const modString = `${Math.abs(modifier)}`;
        switch(modifier) {
            case 1:
                return `${modifier >= 0 ? ' + ' : ' - '}${ResultSpan["Critical Success"](modString)}`;
            case 0:
                return `${modifier >= 0 ? ' + ' : ' - '}${ResultSpan["Complete Success"](modString)}`;
            case -1:
                return `${modifier >= 0 ? ' + ' : ' - '}${ResultSpan["Mixed Success"](modString)}`;
            default:
                return `${modifier >= 0 ? ' + ' : ' - '}${ResultSpan["Failure"](modString)}`;
        }
    }

    getDescription(): string {
        if (this.action.free) {
            return `###(No Check) ${this.action.description}###`;
        } else {
            return `###${this.action.description}###\n#${this.getDieEmoji(this.dieResult1)} + ${this.getDieEmoji(this.dieResult2)}${this.getDifficultyColor(this.action.difficultyModifier)}<sup><sub><sup>(difficulty)</sup></sub></sup> = ${ResultSpan[this.result](`${this.total} (${this.result})`)}#`
        }
    }
}
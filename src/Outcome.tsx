import {Action} from "./Action";

export enum Result {
    Failure = 'failure',
    Mixed = 'mixed',
    Success = 'success',
    Critical = 'critical',
    None = 'none'
}

export const ResultDescription: {[result in Result]: string} = {
    [Result.Failure]: `{{user}} will fail to achieve their goal and will actively sour or worsen their situation. Describe {{user}}'s actions, dialog, and poor outcome in your own words as you continue to propel the narrative.`,
    [Result.Mixed]: `{{user}} may achieve their goal, but in an inferior way or at some cost. Describe {{user}}'s actions, dialog, and mixed outcome in your own words as you continue to propel the narrative.`,
    [Result.Success]: `{{user}} will successfully achieve what they were attempting and clearly improve their situation. Describe {{user}}'s actions, dialog, and positive outcome in your own words as you continue to propel the narrative.`,
    [Result.Critical]: `{{user}} will resoundingly achieve what they were attempting, dramatically improving their situation in incredible fashion or with better-than-dreamed-of results. Describe {{user}}'s actions, dialog, and overwhelmingly successful outcome in your own words as you continue to propel the narrative.`,
    [Result.None]: '{{user}} took a risk-free action. Describe their actions and dialog in your own words as you continue to propel the narrative.'
}

const diceEmoji: {[key: number]: string} = {
    1: '\u2680',
    2: '\u2681',
    3: '\u2682',
    4: '\u2683',
    5: '\u2684',
    6: '\u2685'
}

const diceClass: {[key: number]: Result} = {
    1: Result.Failure,
    2: Result.Mixed,
    3: Result.Mixed,
    4: Result.Success,
    5: Result.Success,
    6: Result.Critical
}

export class Outcome {
    result: Result;
    dieResult1: number;
    dieResult2: number;
    action: Action;
    total: number;

    constructor(dieResult1: number, dieResult2: number, action: Action) {
        const total = dieResult1 + dieResult2 + action.difficultyModifier;
        this.result = (action.free ? Result.None : (dieResult1 + dieResult2 == 12 ? Result.Critical : (total >= 10 ? Result.Success : (total >= 7 ? Result.Mixed : Result.Failure))));

        this.dieResult1 = dieResult1;
        this.dieResult2 = dieResult2;
        this.action = action;
        this.total = this.dieResult1 + this.dieResult2 + this.action.difficultyModifier;
    }

    getDieEmoji(side: number): string {

        return diceEmoji[side];
    }

    getDieClass(side: number): Result {
        return diceClass[side];
    }

    getDifficultyClass(modifier: number): Result {
        if (modifier >= 1) {
            return Result.Critical;
        } else if (modifier == 0) {
            return Result.Success;
        } else if (modifier == -1) {
            return Result.Mixed;
        } else {
            return Result.Failure;
        }
    }
}
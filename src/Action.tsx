
import { Outcome } from "./Outcome";

export class Action {
    description: string;
    difficultyModifier: number;
    free: boolean;

    constructor(description: string, free: boolean, difficultyModifier: number) {
        this.description = description;
        this.difficultyModifier = difficultyModifier;
        this.free = free;
    }

    // Method to simulate a dice roll
    diceRoll(): number {
        return Math.floor(Math.random() * 6) + 1;
    }

    // Method to determine success, partial success, or failure
    determineSuccess(): Outcome {
        const dieResult1: number = this.diceRoll();
        const dieResult2: number = this.diceRoll();
        return new Outcome(dieResult1, dieResult2, this);
    }
}
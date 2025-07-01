import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message, Character, User} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";
import {Client} from "@gradio/client";
import { Outcome, Result, ResultDescription } from "./Outcome";
import { Action } from "./Action";

type MessageStateType = any;

type ConfigType = any;

type InitStateType = any;

type ChatStateType = any;

interface SaveState {
    lastOutcome: Outcome|null;
    lastOutcomePrompt: string;
}

export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {
    
    readonly defaultStat: number = 0;
    readonly levelThresholds: number[] = [2, 5, 8, 12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];

    // message-level variables
    userState: {[key: string]: SaveState} = {};

    // other
    client: any;
    users: {[key: string]: User} = {};
    characters: {[key: string]: Character} = {};
    globalModifier: number;

    constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
        super(data);
        const {
            characters,
            users,
            messageState,
            config
        } = data;
        this.users = users;
        this.characters = characters;
        console.log(this.users);
        console.log(this.characters);
        this.globalModifier = config.difficultyModifier ?? 0;

        for (let user of Object.values(this.users)) {
            this.userState[user.anonymizedId] = this.initializeUserState();
        }
        this.setStateFromMessageState(messageState);
    }

    initializeUserState(): SaveState {
        return {
            lastOutcome: null,
            lastOutcomePrompt: ''
        }
    }

    getUserState(anonymizedId: string): SaveState {
        return this.userState[anonymizedId] ?? this.initializeUserState();
    }

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {

        try {
            this.client = await Client.connect("Ravenok/statosphere-backend");
        } catch (error) {
            console.error(`Error connecting to backend.`);
        }

        console.log('Finished loading stage.');

        return {
            success: true,
            error: null,
            initState: null,
            chatState: null,
        };
    }

    async setState(state: MessageStateType): Promise<void> {
        this.setStateFromMessageState(state);
    }

    async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        const {
            anonymizedId,
            content,
            promptForId
        } = userMessage;

        let errorMessage: string|null = null;
        let takenAction: Action|null = null;
        let finalContent: string|undefined = content;

        if (finalContent) {
            let sequence = this.replaceTags(content,
                {"user": anonymizedId ? this.users[anonymizedId].name : '', "char": promptForId ? this.characters[promptForId].name : ''});

            const difficultyMapping:{[key: string]: number} = {
                '1 (simple and safe)': 1000,
                '2 (straightforward or fiddly)': 1,
                '3 (complex or tricky)': 0,
                '4 (challenging and risky)': -1,
                '5 (arduous and dangerous)': -2,
                '6 (virtually impossible)': -3};
            let difficultyRating:number = 0;
            const difficultyHypothesis = 'On a scale of 1-6, the difficulty of the narrator\'s actions is {}.';
            let difficultyResponse = await this.query({sequence: sequence, candidate_labels: Object.keys(difficultyMapping), hypothesis_template: difficultyHypothesis, multi_label: true });
            if (difficultyResponse && difficultyResponse.labels[0]) {
                console.log(`Difficulty modifier selected: ${difficultyMapping[difficultyResponse.labels[0]] + this.globalModifier}`);
                difficultyRating = difficultyMapping[difficultyResponse.labels[0]] + this.globalModifier;
            } else {
                difficultyRating = 0;
            }

            if (difficultyRating < 1000) {
                takenAction = new Action(finalContent, false, difficultyRating);
            } else {
                takenAction = new Action(finalContent, true, 0);
            }
        }

        if (takenAction) {
            this.setLastOutcome(anonymizedId, takenAction.determineSuccess());
            finalContent = this.getUserState(anonymizedId).lastOutcome?.getDescription();
        }

        return {
            stageDirections: `\n[INST]${this.replaceTags(this.getUserState(anonymizedId).lastOutcomePrompt,{
                "user": this.users[anonymizedId].name,
                "char": promptForId ? this.characters[promptForId].name : ''
            })}\n[/INST]`,
            messageState: this.buildMessageState(),
            modifiedMessage: finalContent,
            systemMessage: null,
            error: errorMessage,
            chatState: null,
        };
    }

    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {

        Object.values(this.users).forEach(user => this.getUserState(user.anonymizedId).lastOutcomePrompt = '');

        return {
            stageDirections: null,
            messageState: this.buildMessageState(),
            modifiedMessage: null,
            error: null,
            systemMessage: null,
            chatState: null
        };
    }

    setStateFromMessageState(messageState: MessageStateType) {
        console.log('messageState:');
        console.log(messageState);
        for (let user of Object.values(this.users)) {
            let userState = this.getUserState(user.anonymizedId);
            if (messageState != null) {
                let lastOutcome = messageState[user.anonymizedId]?.['lastOutcome'] ?? messageState['lastOutcome'] ?? null;
                userState.lastOutcome = lastOutcome ? this.convertOutcome(lastOutcome) : null;
                userState.lastOutcomePrompt = messageState[user.anonymizedId]?.['lastOutcomePrompt'] ?? messageState['lastOutcomePrompt'] ?? '';
            }
            this.userState[user.anonymizedId] = userState;
        }
    }

    convertOutcome(input: any): Outcome {
        return new Outcome(input['dieResult1'], input['dieResult2'], this.convertAction(input['action']));
    }

    convertAction(input: any): Action {
        return new Action(input['description'], input['free'], input['difficultyModifier']);
    }

    buildMessageState(): any {
        let messageState: any = {};
        for (let user of Object.values(this.users)) {
            let userState: { [key: string]: any } = {};
            userState['lastOutcome'] = this.getUserState(user.anonymizedId).lastOutcome ?? null;
            userState['lastOutcomePrompt'] = this.getUserState(user.anonymizedId).lastOutcomePrompt ?? '';

            messageState[user.anonymizedId] = userState;
        }
        console.log('buildMessageState:');
        console.log(messageState);
        return messageState;
    }

    setLastOutcome(anonymizedId: string, outcome: Outcome|null) {
        this.getUserState(anonymizedId).lastOutcome = outcome;
        this.getUserState(anonymizedId).lastOutcomePrompt = '';
        if (this.getUserState(anonymizedId).lastOutcome) {
            this.getUserState(anonymizedId).lastOutcomePrompt += `{{user}} has chosen the following action: ${this.getUserState(anonymizedId).lastOutcome?.action.description ?? ''}\n`;
            this.getUserState(anonymizedId).lastOutcomePrompt += `${ResultDescription[this.getUserState(anonymizedId).lastOutcome?.result ?? Result.None]}\n`
            if (Object.values(this.users).length > 1) {
                this.getUserState(anonymizedId).lastOutcomePrompt += `Use third-person language for {{user}}.\n`;
            }
        }
    }

    replaceTags(source: string, replacements: {[name: string]: string}) {
        return source.replace(/{{([A-z]*)}}/g, (match) => {
            return replacements[match.substring(2, match.length - 2)];
        });
    }

    async query(data: any) {
        let result: any = null;
        if (this.client) {
            try {
                const response = await this.client.predict("/predict", {data_string: JSON.stringify(data)});
                result = JSON.parse(`${response.data[0]}`);
            } catch(e) {
                console.log(e);
            }
        }
        if (result) {
            console.log({sequence: data.sequence, hypothesisTemplate: data.hypothesis_template, labels: result.labels, scores: result.scores});
        } else {
            console.warn('Disconnected from Hugging Face pipeline. Difficulty defaulting to 0');
        }
        return result;
    }

    render(): ReactElement {
        return <></>;
    }

}

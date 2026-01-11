import {Result} from "./Outcome";
import {
    OutcomeFormatter,
    OutcomeProperties,
    OutcomeTheme,
    THEME_VERBIAGE
} from "./OutcomeFormatter";

const MAP_CLASS_TO_VARS: {[result in Result]: string} = {
    'failure': '--failure: 255,0,0;',
    'mixed': '--mixed: 255,140,0;',
    'success': '--success: 60,179,113;',
    'critical': '--critical: 176,224,230;',
    'none': '--none: 153,153,153;'
};

export class SimpleFormatter implements OutcomeFormatter {
    formatOutcome(outcomeProperties: OutcomeProperties, theme: OutcomeTheme): string {
        const totalClass = (outcomeProperties.components[outcomeProperties.components.length - 1]).result;
        const root = `<div style="${outcomeProperties.components.map(c => MAP_CLASS_TO_VARS[c.result])
                .reduce<string[]>((acc, value) => {if (!acc.includes(value)) acc.push(value); return acc;}, [])
                .join('')}` +
            `margin: 1rem; border: 2px solid rgb(var(--${totalClass})); border-radius: 8px; padding: 1rem 1rem; ` +
            `background: linear-gradient(to bottom, rgba(var(--${totalClass}), 0.2), #0000); box-shadow: 0 2px 4px #0003; ` +
            //(totalClass === 'none' ? '' : 'border-bottom: none; ') +
            `font-family: system-ui, sans-serif; text-shadow: 2px 2px 2px #0009; font-size: 2rem; line-height: 1.75rem; white-space: pre-wrap;">`;
        return root +
            `<div style="display: flex; justify-content: center; color: #ddd; font-size: 1.5rem; margin-bottom: 0.75rem;"><b><i>${outcomeProperties.content}</b></i></div>` +
            (outcomeProperties.components[outcomeProperties.components.length - 1].result !== 'none' ? (
                `<div style="display: ${outcomeProperties.components.length > 1 ? 'flex' : 'none'}; justify-content: center;">` +
                outcomeProperties.components.map((component, index) => {
                    return (index > 0 ? `<span style="color: rgb(var(--${component.result}));"> ${component.sign} </span>` : '') +
                        (component.dieEmoji ? `<span style="color: rgb(var(--${component.result})); font-size: 3rem;">${component.dieEmoji}</span>` : '') +
                        `<span style="color: rgb(var(--${component.result}));">${component.absolute}` +
                        `${index == outcomeProperties.components.length - 1 ? ` (${THEME_VERBIAGE[theme][component.result][0]})` : ''}</span>` +
                        (component.type == 'modifier' ? ` <sup style="color: rgb(var(--${component.result}));"><sub><sub>(difficulty)</sub></sub></sup>` : '');
                }).join('') + '</div>'
            ) : '') +
            '</div>';
    }

    formatResponse(content: string, outcomeProperties: OutcomeProperties, theme: OutcomeTheme): string {
        const totalClass = (outcomeProperties.components[outcomeProperties.components.length - 1]).result;
        const root = `<div style="${outcomeProperties.components.map(c => MAP_CLASS_TO_VARS[c.result])
                .reduce<string[]>((acc, value) => {if (!acc.includes(value)) acc.push(value); return acc;}, [])
                .join('')}` +
            `margin: 1rem; border: 2px solid rgb(var(--${totalClass})); border-radius: 8px; padding: 1rem 1rem; ` +
            `background: linear-gradient(to top, rgba(var(--${totalClass}), 0.2), #0000); box-shadow: 0 2px 4px #0003; ` +
            (totalClass === 'none' ? '' : 'border-top: none; ') +
            `font-family: system-ui, sans-serif; text-shadow: 2px 2px 2px #0009; white-space: pre-wrap;">`;
        return `${root}${content}</div>`;
    }
}
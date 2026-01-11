import {OutcomeFormatter, OutcomeProperties, OutcomeTheme, THEME_VERBIAGE} from "./OutcomeFormatter";
import {Result} from "./Outcome";

const MAP_CLASS_TO_VARS: {[result in Result]: string} = {
    'failure': '--failure:204,0,0;--failure-dark:102,0,0;--failure-path:polygon(15% 15%,30% 5%,90% 0%,100% 8%,95% 56%,80% 55%,80% 100%,60% 92%,40% 95%,25% 90%,10% 95%,20% 62%,0% 65%);',
    'mixed': '--mixed:255,153,50;--mixed-dark:185,60,30;--mixed-path:polygon(5% 35%,25% 8%,40% 15%,100% 5%,80% 40%,75% 65%,80% 95%,30% 100%,5% 90%,0% 60%);',
    'success': '--success:66,180,102;--success-dark:33,102,51;--success-path:polygon(5% 35%,25% 8%,60% 0%,100% 5%,80% 40%,75% 65%,80% 100%,30% 85%,5% 90%,0% 60%);',
    'critical': '--critical:204,255,255;--critical-dark:102,153,153;--critical-path:polygon(5% 35%,25% 8%,100% 0%,75% 40%,100% 40%,70% 70%,55% 100%,20% 75%,30% 60%,0% 60%);',
    'none': '--none:153,153,153;--none-dark:102,102,102;--none-path:polygon(5% 35%,25% 8%,100% 0%,80% 40%,75% 65%,80% 100%,30% 95%,5% 90%,0% 60%);'
};

export class ScavengerFormatter implements OutcomeFormatter {
    formatOutcome(outcomeProperties: OutcomeProperties, theme: OutcomeTheme): string {
        const totalClass = (outcomeProperties.components[outcomeProperties.components.length - 1]).result;
        const root = `<div style="${outcomeProperties.components.map(c => MAP_CLASS_TO_VARS[c.result])
                .reduce<string[]>((acc, value) => {if (!acc.includes(value)) acc.push(value); return acc;}, [])
                .join('')}` +
            `--font-transform: skew(-15deg) rotate(-10deg);--bkg-path: polygon(0% 3rem, 100% 0.5rem, 90% 90%, 3% 82%); ` +
            `--asfalt: url('https://www.transparenttextures.com/patterns/asfalt-dark.png'); ` +
            `font-family: system-ui, sans-serif; padding: 1rem; color: #eee; position: relative; z-index: 2; paint-order: stroke fill; text-align: center;">`;
        const background = `<div style="position: absolute; clip-path: var(--bkg-path); background: linear-gradient(135deg, rgb(var(--${totalClass})), rgb(var(--${totalClass}-dark))), ` +
            `var(--asfalt); background-blend-mode: multiply; inset: 0; z-index: -2;"></div>` +
            `<div style="position: absolute; inset: -4px; right: -6px; z-index: -3; clip-path: var(--bkg-path); background: rgb(var(--${totalClass}-dark));"></div>` +
            `<div style="position: absolute; top: 8px; left: 10px; right: -16px; bottom: -12px; z-index: -4; clip-path: var(--bkg-path); background: #0003;"></div>` +
            `<div style="transform: skew(-15deg) rotate(-2deg); font-size: 1.5rem; -webkit-text-stroke: 3px rgb(var(--${totalClass}-dark)); text-shadow: 3px 3px 3px black;"><b><i>${outcomeProperties.content}</i></b></div>`;

        return root + background +
            `<div style="display: flex; flex-direction: row; justify-content: center; align-items: flex-end; flex-wrap: nowrap; white-space: nowrap; pointer-events: none;">` +
            outcomeProperties.components.map((component, index) => {
                return `<div style="position: relative; margin-left: 1rem; height: 6rem; width: 4rem;">` +
                    `<div style="position: absolute; inset: 0; clip-path: var(--${component.result}-path); background: linear-gradient(to bottom, rgb(var(--${component.result})), rgb(var(--${component.result}-dark))), var(--asfalt); z-index: -1;"></div>` +
                    `<div style="position: absolute; inset: -4px; right: -6px; clip-path: var(--${component.result}-path); background: rgb(var(--${component.result}-dark)); z-index: -2;"></div>` +
                    `<div style="position: absolute; top: 8px; left: 10px; right: -16px; bottom: -12px; clip-path: var(--${component.result}-path); background: #0003; z-index: -4;"></div>` +
                    `<div style="transform: var(--font-transform); -webkit-text-stroke: 3px rgb(var(--${component.result}-dark)); font-size: 2.5rem;">` +
                    (index != 0 ? `<div style="position: absolute; left: -0.8rem;">${component.sign}</div>` : '') +
                    `<div>${component.absolute}</div>` +
                    (component.type == 'die' ? `<div style="font-size: 1rem;">🎲 Roll</div>` :
                        (component.type == 'modifier' ? `<div style="font-size: 1rem;">${THEME_VERBIAGE[theme][component.result][1]} Mod</div>` :
                            `<div style="font-size: 1rem; position: absolute; left: 50%; transform: translateX(-50%);">${THEME_VERBIAGE[theme][component.result][1]} ${THEME_VERBIAGE[theme][component.result][0]}!</div>`)) +
                    `</div></div>`;
            }).join('') +
            '</div></div>';
    }

    formatResponse(content: string, outcomeProperties: OutcomeProperties, theme: OutcomeTheme): string {
        return content;
    }
}

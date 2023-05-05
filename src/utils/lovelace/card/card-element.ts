import { LovelaceCard, LovelaceCardConfig } from "../../../ha";

export const createCardElement = (config: LovelaceCardConfig): LovelaceCard | undefined => {
    try {
        // @ts-ignore
        const element = document.createElement(
            computeCardComponentName(config.type),
            config
        ) as LovelaceCard;
        element.setConfig(config);
        return element;
    } catch (err) {
        return undefined;
    }
};

export function computeCardComponentName(type: string): string {
    let tag = type;
    if (tag && tag.startsWith("custom:")) {
        tag = tag.substr("custom:".length);
    } else {
        tag = `hui-${tag}-card`;
    }
    return tag;
}

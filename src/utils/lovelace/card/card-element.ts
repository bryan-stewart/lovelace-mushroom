import { PREFIX_NAME } from "../../../const";
import { LovelaceCard, LovelaceCardConfig } from "../../../ha";

export const createCardElementOLD = (cardConfig) => {
    const _createError = (error, config) => {
        return _createCard("hui-error-card", {
            type: "error",
            error,
            config,
        });
    };

    const _createCard = (tag, config) => {
        const element = window.document.createElement(tag);
        try {
            element.setConfig(config);
        } catch (err) {
            console.error(tag, err);
            return _createError((err as Error).message, config);
        }
        return element;
    };

    if (!cardConfig || typeof cardConfig !== "object" || !cardConfig.type)
        return _createError("No type defined", cardConfig);

    let tag = cardConfig.type;
    if (tag && tag.startsWith("custom:")) {
        tag = tag.substr("custom:".length);
    } else {
        tag = `hui-${tag}-card`;
    }

    return _createCard(tag, cardConfig);
};

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

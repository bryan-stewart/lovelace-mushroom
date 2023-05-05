import { array, assign, boolean, define, number, object, optional, string, union } from "superstruct";
import { lovelaceCardConfigStruct } from "../../shared/config/lovelace-card-config";
import { LovelaceCardConfig } from "../../ha";
import { EntityCardConfig } from "../entity-card/entity-card-config";
import { templateCardConfigStruct } from "../template-card/template-card-config";

const TABS = [
    "custom:mushroom-entity-card",
    "custom:mushroom-person-card",
    "custom:mushroom-template-card",
];

export type TabbedCardConfig = LovelaceCardConfig & {
    tabs: EntityCardConfig[],
    dropdowns: LovelaceCardConfig[]
};

export const tabbedCardTabConfigStruct = assign(
    templateCardConfigStruct,
    object({
        type: define('Compatible Card', (type: any) => TABS.includes(type)),
        icon_color: optional(string()),
        icon_size: optional(union([string(), number()])),
    })
);

export const tabbedCardConfigStruct = assign(
    lovelaceCardConfigStruct,
    object({
        tabs: array(tabbedCardTabConfigStruct),
        dropdowns: array(object()),
    })
);

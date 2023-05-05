import { object, optional } from "superstruct";
import { ActionConfig, actionConfigStruct } from "../../ha";
import { HaFormSchema } from "../../utils/form/ha-form";
import { UiAction } from "../../utils/form/ha-selector";

export const actionsSharedConfigStruct = object({
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    double_tap_action: optional(actionConfigStruct),
});

export type ActionsSharedConfig = {
    tap_action?: ActionConfig;
    hold_action?: ActionConfig;
    double_tap_action?: ActionConfig;
};

export const computeActionsFormSchema = (config?): HaFormSchema[] => [
    {
        name: "tap_action",
        selector: { "mush-action": config },
    },
    {
        name: "hold_action",
        selector: { "mush-action": config },
    },
    {
        name: "double_tap_action",
        selector: { "mush-action": config },
    },
];

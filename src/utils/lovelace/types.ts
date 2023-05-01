import { ChipsCardOptions } from "../../cards/chips-card/chips-card";
import { Condition, HomeAssistant, LovelaceCardConfig, LovelaceConfig } from "../../ha";
import { LovelaceChipConfig } from "./chip/types";

export interface LovelaceChipEditor extends LovelaceGenericElementEditor {
    setConfig(config: LovelaceChipConfig): void;
}

export interface LovelaceDropdownEditor extends LovelaceGenericElementEditor {
    setConfig(config: LovelaceCardConfig): void;
}

export interface LovelaceGenericElementEditor extends HTMLElement {
    hass?: HomeAssistant;
    lovelace?: LovelaceConfig;
    options?: ChipsCardOptions;
    setConfig(config: any): void;
    focusYamlEditor?: () => void;
}

export interface ConditionalCardConfig extends LovelaceCardConfig {
    card: LovelaceCardConfig;
    conditions: Condition[];
}

import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { HomeAssistant } from "../../../ha";
import "../../../shared/editor/action-picker";
import { UiAction } from "../ha-selector";

export type MushActionSelector = {
    "mush-action": { dropdowns: number; actions: UiAction[] };
};

@customElement("ha-selector-mush-action")
export class HaMushActionSelector extends LitElement {
    @property() public hass!: HomeAssistant;

    @property() public selector!: MushActionSelector;

    @property() public value?: any;

    @property() public label?: string;

    protected render() {
        return html`
            <mushroom-action-picker
                .hass=${this.hass}
                .label=${this.label}
                .value=${this.value}
                .actions=${this.selector["mush-action"].actions}
                .dropdowns=${this.selector["mush-action"].dropdowns}
            ></mushroom-action-picker>
        `;
    }
}

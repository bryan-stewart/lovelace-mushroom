import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { fireEvent, HomeAssistant } from "../../../ha";

export type MushSizeSelector = {
    "mush-size": {};
};

@customElement("ha-selector-mush-size")
export class HaMushSizeSelector extends LitElement {
    @property() public hass!: HomeAssistant;

    @property() public selector!: MushSizeSelector;

    @property() public value?: any;

    @property() public label?: string;

    protected render() {
        return html`
            <mushroom-size-picker
                .hass=${this.hass}
                .label=${this.label}
                .value=${this.value}
                @value-changed=${this._valueChanged}
            ></mushroom-size-picker>
        `;
    }

    private _valueChanged(ev: CustomEvent) {
        fireEvent(this, "value-changed", { value: ev.detail.value || undefined });
    }
}

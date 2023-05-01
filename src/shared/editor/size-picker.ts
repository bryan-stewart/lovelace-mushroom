import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { fireEvent, HomeAssistant } from "../../ha";
import setupCustomlocalize from "../../localize";
import { loadHaComponents } from "../../utils/loader";
// import setupCustomlocalize from "../../localize";
import "../form/mushroom-select";
import "../input-number";

const SIZE = [
    "default",
    "extra-small",
    "small",
    "medium",
    "large",
    "extra-large",
    "custom",
] as const;
type Size = (typeof SIZE)[number];

const ICONS: Record<Size, string> = {
    default: "mdi:square-rounded-outline",
    "extra-small": "mdi:size-xs",
    small: "mdi:size-s",
    medium: "mdi:size-m",
    large: "mdi:size-l",
    "extra-large": "mdi:size-xl",
    custom: "mdi:resize",
};

@customElement("mushroom-size-picker")
export class SizePicker extends LitElement {
    @property() public sizes;

    @property() public label = "";

    @property() public value?: any;

    @property() public configValue = "";

    @property() public hass!: HomeAssistant;

    connectedCallback() {
        super.connectedCallback();
        void loadHaComponents();
    }

    render() {
        const customLocalize = setupCustomlocalize(this.hass);
        const value = this.value || "default";
        const selectValue = +value ? "custom" : value;
        return html`
            <div class="size-select">
                <mushroom-select
                    icon
                    .label=${this.label}
                    .configValue=${"icon_size"}
                    @selected=${this._valueChanged}
                    @closed=${(e) => e.stopPropagation()}
                    .value=${selectValue}
                    fixedMenuPosition
                    naturalMenuWidth
                >
                    <ha-icon slot="icon" .icon=${ICONS[selectValue as Size]}></ha-icon>
                    ${SIZE.map((size) => {
                        return html`
                            <mwc-list-item .value=${size} graphic="icon">
                                ${customLocalize(`editor.form.size_picker.values.${size}`)}
                                <ha-icon slot="graphic" .icon=${ICONS[size]}></ha-icon>
                            </mwc-list-item>
                        `;
                    })}
                </mushroom-select>
                ${this.value == "custom" || +this.value
                    ? html`<div class="more-options">
                          <mushroom-input-number
                              .value=${this.value == "custom" ? 36 : +this.value}
                              .max=${60}
                              .min=${18}
                              @change=${this._valueChanged}
                          ></mushroom-input-number>
                      </div>`
                    : ""}
            </div>
        `;
    }

    private _valueChanged(ev): void {
        ev.stopPropagation();
        if (!this.hass) {
            return;
        }
        const value = ev.target.value || ev.detail.value;
        if (this.value?.icon_size === value) {
            return;
        }
        if (value === "default") {
            fireEvent(this, "value-changed", { value: "" });
            return;
        }
        if (value === "custom") {
            fireEvent(this, "value-changed", { value: 36 });
            return;
        }

        fireEvent(this, "value-changed", {
            value,
        });
    }

    static get styles(): CSSResultGroup {
        return css`
            mushroom-select {
                width: 100%;
            }
            .more-options {
                margin-top: 8px;
            }
        `;
    }
}

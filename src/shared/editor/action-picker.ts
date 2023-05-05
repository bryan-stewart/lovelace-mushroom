import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { fireEvent, HomeAssistant } from "../../ha";
import setupCustomlocalize from "../../localize";
import { loadActionSelector, loadHaComponents } from "../../utils/loader";
// import setupCustomlocalize from "../../localize";
import "../form/mushroom-select";

const ACTION = [
    "default",
    "more-info",
    "toggle",
    "navigate",
    "url",
    "call-service",
    "none",
] as const;

@customElement("mushroom-action-picker")
export class ActionPicker extends LitElement {
    @property() public actions;

    @property() public dropdowns;

    @property() public label = "";

    @property() public value?: any;

    @property() public configValue = "";

    @property() public hass!: HomeAssistant;

    connectedCallback() {
        super.connectedCallback();
        void loadHaComponents();
    }

    _selectChanged(ev) {
        const value = ev.target.value;
        if (value) {
            this.dispatchEvent(
                new CustomEvent("value-changed", {
                    detail: {
                        value: value !== "default" ? value : "",
                    },
                })
            );
        }
    }

    render() {
        const customLocalize = setupCustomlocalize(this.hass);
        const actions = this.actions || [...ACTION];
        if (this.dropdowns) actions.splice(1, 0, 'dropdown')

        return html`
            ${loadActionSelector()}
            <div class="action-select">
                <mushroom-select
                    .label=${this.label}
                    .configValue=${"action"}
                    @selected=${this._actionPicked}
                    @closed=${(e) => e.stopPropagation()}
                    .value=${this.value?.action || "default"}
                    fixedMenuPosition
                    naturalMenuWidth
                >
                    ${actions.map((action) => {
                        return html`
                            <mwc-list-item .value=${action}>
                                ${customLocalize(`editor.form.action_picker.values.${action}`)}
                            </mwc-list-item>
                        `;
                    })}
                </mushroom-select>
            </div>
            ${this.value?.action === "navigate"
                ? html`<div class="more-options">
                      <ha-navigation-picker
                          .hass=${this.hass}
                          .label=${this.hass!.localize(
                              "ui.panel.lovelace.editor.action-editor.navigation_path"
                          )}
                          .value=${this.value?.navigation_path || ""}
                          @value-changed=${this._navigateValueChanged}
                      ></ha-navigation-picker>
                  </div>`
                : ""}
            ${this.value?.action === "url"
                ? html`<div class="more-options">
                      <ha-textfield
                          .label=${this.hass!.localize(
                              "ui.panel.lovelace.editor.action-editor.url_path"
                          )}
                          .value=${this.value?.url_path}
                          .configValue=${"url_path"}
                          @input=${this._valueChanged}
                      ></ha-textfield>
                  </div> `
                : ""}
            ${this.value?.action === "call-service"
                ? html`<div class="more-options">
                      <ha-service-control
                          .hass=${this.hass}
                          .value=${this.value}
                          .showAdvanced=${this.hass.userData?.showAdvanced}
                          @value-changed=${this._serviceValueChanged}
                          narrow
                      ></ha-service-control>
                  </div> `
                : ""}
            ${this.value?.action === "dropdown"
                ? html`<div class="more-options">
                      <mushroom-select
                          .label=${"Dropdown"}
                          .configValue=${"dropdown"}
                          @selected=${this._valueChanged}
                          @closed=${(e) => e.stopPropagation()}
                          .value=${this.value.dropdown || "default"}
                          fixedMenuPosition
                          naturalMenuWidth
                      >
                          <mwc-list-item .value=${"default"}> Default </mwc-list-item>
                          <mwc-list-item .value=${"close"}> Close </mwc-list-item>
                          ${this.dropdowns && this.dropdowns.map(
                              (d, i) =>
                                  html`<mwc-list-item .value=${i + 1 + ""}
                                      >(${i + 1}) ${d}</mwc-list-item
                                  >`
                          )}
                      </mushroom-select>
                  </div> `
                : ""}
        `;
    }

    private _actionPicked(ev): void {
        ev.stopPropagation();
        if (!this.hass) {
            return;
        }
        const value = ev.target.value;
        if (this.value?.action === value) {
            return;
        }
        if (value === "default") {
            fireEvent(this, "value-changed", { value: undefined });
            return;
        }

        let data;
        switch (value) {
            case "url": {
                data = { url_path: this.value?.url_path || "" };
                break;
            }
            case "call-service": {
                data = { service: this.value?.service || "" };
                break;
            }
            case "navigate": {
                data = { navigation_path: this.value?.navigation_path || "" };
                break;
            }
        }

        fireEvent(this, "value-changed", {
            value: { action: value, ...data },
        });
    }

    private _valueChanged(ev): void {
        ev.stopPropagation();
        if (!this.hass) {
            return;
        }
        const target = ev.target! as any;
        const value = ev.target.value;
        if (this.value?.[`${target.configValue}`] === value) {
            return;
        }
        if (target.configValue) {
            fireEvent(this, "value-changed", {
                value: {
                    ...this.value!,
                    ...(value != "default" && { [target.configValue!]: value }),
                },
            });
        }
    }

    private _serviceValueChanged(ev: CustomEvent) {
        ev.stopPropagation();
        const value = {
            ...this.value!,
            service: ev.detail.value.service || "",
            data: ev.detail.value.data,
            target: ev.detail.value.target || {},
        };
        if (!ev.detail.value.data) {
            delete value.data;
        }
        // "service_data" is allowed for backwards compatibility but replaced with "data" on write
        if ("service_data" in value) {
            delete value.service_data;
        }

        fireEvent(this, "value-changed", { value });
    }

    private _navigateValueChanged(ev: CustomEvent) {
        ev.stopPropagation();
        const value = {
            ...this.value!,
            navigation_path: ev.detail.value,
        };

        fireEvent(this, "value-changed", { value });
    }

    static get styles(): CSSResultGroup {
        return css`
            mushroom-select {
                width: 100%;
            }
            .more-options {
                margin-top: 8px;
            }
            ha-service-control {
                --service-control-padding: 0;
                padding-top: 12px;
            }
        `;
    }
}

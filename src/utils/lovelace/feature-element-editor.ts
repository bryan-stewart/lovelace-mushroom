import { css, CSSResultGroup, html, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { guard } from "lit/directives/guard.js";
import type { SortableEvent } from "sortablejs";
import { fireEvent, LovelaceCardConfig, sortableStyles } from "../../ha";
import setupCustomlocalize from "../../localize";
import { MushroomBaseElement } from "../base-element";
import { LovelaceChipConfig } from "./chip/types";
import { HassEntity } from "home-assistant-js-websocket";

let Sortable;

declare global {
    interface HASSDomEvents {
        "features-changed": {
            features: LovelaceChipConfig[] | LovelaceCardConfig[];
            type: string;
        };
    }
}

@customElement("mushroom-feature-editor")
export class FeaturesEditor extends MushroomBaseElement {
    @property({ attribute: false }) protected features?: LovelaceChipConfig[];

    @property() protected type: string = "card";

    @property() protected label?: string;

    @property() protected uneditable: string[] = [];

    @state() private _attached = false;

    @state() private _renderEmptySortable = false;

    private _sortable?;

    public connectedCallback() {
        super.connectedCallback();
        this._attached = true;
    }

    public disconnectedCallback() {
        super.disconnectedCallback();
        this._attached = false;
    }

    protected render() {
        if (!this.features || !this.hass) {
            return nothing;
        }

        const customLocalize = setupCustomlocalize(this.hass);

        return html`
            <h3>${this.label}</h3>
            <div class="features">
                ${guard([this.features, this._renderEmptySortable], () =>
                    this._renderEmptySortable
                        ? ""
                        : this.features!.map(
                              (featureConf, index) => html`
                                  <div class="feature">
                                      <div class="handle">
                                          <ha-icon icon="mdi:drag"></ha-icon>
                                      </div>
                                      ${html`
                                          <div class="special-row">
                                              <div>
                                                  <span>
                                                      ${this._renderFeatureLabel(featureConf)}</span
                                                  >
                                                  <span class="secondary">
                                                      ${this._renderFeatureSecondary(featureConf)}
                                                  </span>
                                              </div>
                                          </div>
                                      `}
                                      ${this.uneditable.includes(featureConf.type)
                                          ? nothing
                                          : html`
                                                <ha-icon-button
                                                    .label=${customLocalize(
                                                        "editor.chip.chip-picker.edit"
                                                    )}
                                                    class="edit-icon"
                                                    .index=${index}
                                                    @click=${this._editFeature}
                                                >
                                                    <ha-icon icon="mdi:pencil"></ha-icon>
                                                </ha-icon-button>
                                            `}
                                      <ha-icon-button
                                          .label=${customLocalize("editor.chip.chip-picker.clear")}
                                          class="remove-icon"
                                          .index=${index}
                                          @click=${this._removeFeature}
                                      >
                                          <ha-icon icon="mdi:close"></ha-icon>
                                      </ha-icon-button>
                                  </div>
                              `
                          )
                )}
            </div>
            <slot name="add"></slot>
        `;
    }

    protected updated(changedProps: PropertyValues): void {
        super.updated(changedProps);

        const attachedChanged = changedProps.has("_attached");
        const featuresChanged = changedProps.has("features");

        if (!featuresChanged && !attachedChanged) {
            return;
        }

        if (attachedChanged && !this._attached) {
            // Tear down sortable, if available
            this._sortable?.destroy();
            this._sortable = undefined;
            return;
        }

        if (!this._sortable && this.features) {
            this._createSortable();
            return;
        }

        if (featuresChanged) {
            this._handleFeaturesChanged();
        }
    }

    private async _handleFeaturesChanged() {
        this._renderEmptySortable = true;
        await this.updateComplete;
        const container = this.shadowRoot!.querySelector(".features")!;
        while (container.lastElementChild) {
            container.removeChild(container.lastElementChild);
        }
        this._renderEmptySortable = false;
    }

    private async _createSortable() {
        if (!Sortable) {
            const sortableImport = await import("sortablejs/modular/sortable.core.esm");

            Sortable = sortableImport.Sortable;
            Sortable.mount(sortableImport.OnSpill);
            Sortable.mount(sortableImport.AutoScroll());
        }

        this._sortable = new Sortable(this.shadowRoot!.querySelector(".features"), {
            animation: 150,
            fallbackClass: "sortable-fallback",
            handle: ".handle",
            onEnd: async (evt: SortableEvent) => this._featureMoved(evt),
        });
    }

    private _featureMoved(ev: SortableEvent): void {
        if (ev.oldIndex === ev.newIndex) {
            return;
        }

        const newFeatures = this.features!.concat();

        newFeatures.splice(ev.newIndex!, 0, newFeatures.splice(ev.oldIndex!, 1)[0]);

        fireEvent(this, "features-changed", { features: newFeatures, type: this.type });
    }

    private _removeFeature(ev: CustomEvent): void {
        const index = (ev.currentTarget as any).index;
        const newConfigFeatures = this.features!.concat();

        newConfigFeatures.splice(index, 1);

        fireEvent(this, "features-changed", {
            features: newConfigFeatures,
            type: this.type,
        });
    }

    private _editFeature(ev: CustomEvent): void {
        const index = (ev.currentTarget as any).index;
        fireEvent<any>(this, "edit-detail-element", {
            subElementConfig: {
                index,
                type: this.type,
                elementConfig: this.features![index],
            },
        });
    }

    private _renderFeatureLabel(featureConf: LovelaceChipConfig | LovelaceCardConfig): string {
        const customLocalize = setupCustomlocalize(this.hass);
        if (this.type == "chip") {
            let label = customLocalize(`editor.chip.chip-picker.types.${featureConf.type}`);
            if (featureConf.type === "conditional" && featureConf.conditions.length > 0) {
                const condition = featureConf.conditions[0];
                const entity = this.getEntityName(condition.entity) ?? condition.entity;
                label += ` - ${entity} ${
                    condition.state
                        ? `= ${condition.state}`
                        : condition.state_not
                        ? `≠ ${condition.state_not}`
                        : null
                }`;
            }
            return label;
        } else {
            return featureConf.type
                .replace("custom:", "")
                .split("-")
                .map((name) => name[0].toUpperCase() + name.substr(1))
                .join(" ");
        }
    }

    private _renderFeatureSecondary(
        featureConf: LovelaceChipConfig | LovelaceCardConfig
    ): string | undefined {
        const customLocalize = setupCustomlocalize(this.hass);
        if ("entity" in featureConf && featureConf.entity) {
            return `${this.getEntityName(featureConf.entity) ?? featureConf.entity}`;
        }
        if ("entities" in featureConf && featureConf.entities) {
            return `${this.getEntitiesType(featureConf.entities)}`;
        }
        if ("chip" in featureConf && featureConf.chip) {
            const label = customLocalize(`editor.chip.chip-picker.types.${featureConf.chip.type}`);
            return `${this._renderFeatureSecondary(featureConf.chip)} (via ${label})`;
        }
        return undefined;
    }

    private getEntityName(entity_id: string): string | undefined {
        if (!this.hass) return undefined;
        const stateObj = this.hass.states[entity_id] as HassEntity | undefined;
        if (!stateObj) return undefined;
        return stateObj.attributes.friendly_name;
    }

    private getEntitiesType(entities: LovelaceCardConfig["entities"]): string | undefined {
        if (!this.hass || !entities.length) return undefined;
        const matching = entities.every(
            (e) =>
                (e.entity?.split(".")[0] || e.split(".")[0]) ==
                (entities[0].entity?.split(".")[0] || entities[0].split(".")[0])
        );
        const domain = matching
            ? entities[0].entity?.split(".")[0] || entities[0].split(".")[0]
            : "Various";
        return domain[0].toUpperCase() + domain.substr(1);
    }

    static get styles(): CSSResultGroup {
        return [
            super.styles,
            sortableStyles,
            css`
                .feature {
                    display: flex;
                    align-items: center;
                }

                ha-icon {
                    display: flex;
                }

                .feature .handle {
                    padding-right: 8px;
                    cursor: move;
                }

                .feature .handle > * {
                    pointer-events: none;
                }

                .special-row {
                    height: 60px;
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-grow: 1;
                }

                .special-row div {
                    display: flex;
                    flex-direction: column;
                }

                .remove-icon,
                .edit-icon {
                    --mdc-icon-button-size: 36px;
                    color: var(--secondary-text-color);
                }

                .secondary {
                    font-size: 12px;
                    color: var(--secondary-text-color);
                }
            `,
        ];
    }
}

import { css, CSSResultGroup, html, nothing, TemplateResult, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { guard } from "lit/directives/guard.js";
import type { SortableEvent } from "sortablejs";
import { fireEvent, LovelaceCardConfig, sortableStyles } from "../../ha";
import setupCustomlocalize from "../../localize";
import "../../shared/form/mushroom-select";
import { MushroomBaseElement } from "../base-element";

let Sortable;

declare global {
    interface HASSDomEvents {
        "dropdowns-changed": {
            dropdowns: LovelaceCardConfig[];
        };
    }
}

@customElement("mushroom-dropdowns-editor")
export class DropdownsCardEditorDropdowns extends MushroomBaseElement {
    @property({ attribute: false }) protected dropdowns?: LovelaceCardConfig[];

    @property() protected label?: string;

    @state() private _cardPicker: boolean = false;

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
        if (!this.dropdowns || !this.hass) {
            return nothing;
        }

        if (this._cardPicker) {
            return html`<hui-card-picker
                .lovelace=${this.lovelace}
                .hass=${this.hass}
                @config-changed=${this._addDropdown}
            ></hui-card-picker>`;
        }

        const customLocalize = setupCustomlocalize(this.hass);

        return html`
            <h3>
                ${this.label ||
                `${customLocalize("editor.card.dropdown.dropdown-picker.dropdowns")} (${this.hass!.localize(
                    "ui.panel.lovelace.editor.card.config.required"
                )})`}
            </h3>
            <div class="dropdowns">
                ${guard([this.dropdowns, this._renderEmptySortable], () =>
                    this._renderEmptySortable
                        ? ""
                        : this.dropdowns!.map(
                              (dropdownConf, index) => html`
                                  <div class="dropdown">
                                      <div class="handle">
                                          <ha-icon icon="mdi:drag"></ha-icon>
                                      </div>
                                      ${html`
                                          <div class="special-row">
                                              <div>
                                                  <span>
                                                      ${this._renderDropdownLabel(
                                                          dropdownConf
                                                      )}</span
                                                  >
                                                  <span class="secondary"
                                                      >${this._renderDropdownSecondary(
                                                          dropdownConf
                                                      )}</span
                                                  >
                                              </div>
                                          </div>
                                      `}
                                      <ha-icon-button
                                          .label=${customLocalize(
                                              "editor.card.dropdown.dropdown-picker.clear"
                                          )}
                                          class="remove-icon"
                                          .index=${index}
                                          @click=${this._removeDropdown}
                                      >
                                          <ha-icon icon="mdi:close"></ha-icon
                                      ></ha-icon-button>
                                      <ha-icon-button
                                          .label=${customLocalize(
                                              "editor.card.dropdown.dropdown-picker.edit"
                                          )}
                                          class="edit-icon"
                                          .index=${index}
                                          @click=${this._editDropdown}
                                      >
                                          <ha-icon icon="mdi:pencil"></ha-icon>
                                      </ha-icon-button>
                                  </div>
                              `
                          )
                )}
            </div>
            <div class="button" @click=${this._openCardPicker}>
                ${customLocalize("editor.card.dropdown.dropdown-picker.add")}
                <ha-icon icon="mdi:plus"></ha-icon>
            </div>
        `;
    }

    protected updated(changedProps: PropertyValues): void {
        super.updated(changedProps);

        const attachedChanged = changedProps.has("_attached");
        const dropdownsChanged = changedProps.has("dropdowns");

        if (!dropdownsChanged && !attachedChanged) {
            return;
        }

        if (attachedChanged && !this._attached) {
            // Tear down sortable, if available
            this._sortable?.destroy();
            this._sortable = undefined;
            return;
        }

        if (!this._sortable && this.dropdowns) {
            this._createSortable();
            return;
        }

        if (dropdownsChanged) {
            this._handleDropdownsChanged();
        }
    }

    private async _handleDropdownsChanged() {
        this._renderEmptySortable = true;
        await this.updateComplete;
        const container = this.shadowRoot!.querySelector(".dropdowns")!;
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

        this._sortable = new Sortable(this.shadowRoot!.querySelector(".dropdowns"), {
            animation: 150,
            fallbackClass: "sortable-fallback",
            handle: ".handle",
            onEnd: async (evt: SortableEvent) => this._dropdownMoved(evt),
        });
    }

    private _openCardPicker(): void {
        this._cardPicker = true;
    }

    private async _addDropdown(ev: any): Promise<void> {
        ev.stopPropagation();

        const config = ev.detail.config as LovelaceCardConfig;

        if (!config) {
            this._cardPicker = false;
            return;
        }

        const newConfigDropdowns = this.dropdowns!.concat(config);

        fireEvent(this, "dropdowns-changed", {
            dropdowns: newConfigDropdowns,
        });
        this._cardPicker = false;
    }

    private _dropdownMoved(ev: SortableEvent): void {
        if (ev.oldIndex === ev.newIndex) {
            return;
        }

        const newDropdowns = this.dropdowns!.concat();

        newDropdowns.splice(ev.newIndex!, 0, newDropdowns.splice(ev.oldIndex!, 1)[0]);

        fireEvent(this, "dropdowns-changed", { dropdowns: newDropdowns });
    }

    private _removeDropdown(ev: CustomEvent): void {
        const index = (ev.currentTarget as any).index;
        const newConfigDropdowns = this.dropdowns!.concat();

        newConfigDropdowns.splice(index, 1);

        fireEvent(this, "dropdowns-changed", {
            dropdowns: newConfigDropdowns,
        });
    }

    private _editDropdown(ev: CustomEvent): void {
        const index = (ev.currentTarget as any).index;
        fireEvent<any>(this, "edit-detail-element", {
            subElementConfig: {
                index,
                type: "card",
                elementConfig: this.dropdowns![index],
            },
        });
    }

    private _renderDropdownLabel(dropdownConf: LovelaceCardConfig): string {
        return dropdownConf.type
            .replace("custom:", "")
            .split("-")
            .map((name) => name[0].toUpperCase() + name.substr(1))
            .join(" ");
    }

    private _renderDropdownSecondary(dropdownConf: LovelaceCardConfig): string | undefined {
        const customLocalize = setupCustomlocalize(this.hass);
        if ("entity" in dropdownConf && dropdownConf.entity) {
            return `${this.getEntityName(dropdownConf.entity) ?? dropdownConf.entity}`;
        }
        if ("entities" in dropdownConf && dropdownConf.entities) {
            return `${this.getEntitiesType(dropdownConf.entities)}`;
        }
        if ("chip" in dropdownConf && dropdownConf.chip) {
            const label = customLocalize(
                `editor.chip.chip-picker.types.${dropdownConf.dropdown.type}`
            );
            return `${this._renderDropdownSecondary(dropdownConf.chip)} (via ${label})`;
        }
        return undefined;
    }

    private getEntityName(entity_id: string): string | undefined {
        if (!this.hass) return undefined;
        const entity = this.hass.states[entity_id];
        if (!entity) return undefined;
        return entity.attributes.friendly_name;
    }

    private getEntitiesType(entities: LovelaceCardConfig[]): string | undefined {
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
                .dropdown {
                    display: flex;
                    align-items: center;
                }

                ha-icon {
                    display: flex;
                }

                mushroom-select {
                    width: 100%;
                }

                .dropdown .handle {
                    padding-right: 8px;
                    cursor: move;
                }

                .dropdown .handle > * {
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
                .button {
                    height: 50px;
                    width: 100%;
                    cursor: pointer;
                    background-color: var(--mdc-select-fill-color, whitesmoke);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-left: 12px;
                    padding-right: 12px;
                }
            `,
        ];
    }
}

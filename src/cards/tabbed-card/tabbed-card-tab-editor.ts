import { css, CSSResultGroup, html, nothing, TemplateResult, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { guard } from "lit/directives/guard.js";
import type { SortableEvent } from "sortablejs";
import { fireEvent, LovelaceCardConfig, sortableStyles } from "../../ha";
import setupCustomlocalize from "../../localize";
import "../../shared/form/mushroom-select";
import { MushroomBaseElement } from "../../utils/base-element";
import { EditorTarget } from "../../utils/lovelace/editor/types";

let Sortable;

declare global {
    interface HASSDomEvents {
        "tabs-changed": {
            tabs: LovelaceCardConfig[];
        };
    }
}

const TAB_LIST = ["entity", "template"];

@customElement("mushroom-tabs-editor")
export class TabbedCardEditorTabs extends MushroomBaseElement {
    @property({ attribute: false }) protected tabs?: LovelaceCardConfig[];

    @property() protected label?: string;

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
        if (!this.tabs || !this.hass) {
            return nothing;
        }

        const customLocalize = setupCustomlocalize(this.hass);

        return html`
            <h3>
                ${this.label ||
                `${customLocalize("editor.card.tabbed.tab-picker.tabs")} (${this.hass!.localize(
                    "ui.panel.lovelace.editor.card.config.required"
                )})`}
            </h3>
            <div class="tabs">
                ${guard([this.tabs, this._renderEmptySortable], () =>
                    this._renderEmptySortable
                        ? ""
                        : this.tabs!.map(
                              (tabConf, index) => html`
                                  <div class="tab">
                                      <div class="handle">
                                          <ha-icon icon="mdi:drag"></ha-icon>
                                      </div>
                                      ${html`
                                          <div class="special-row">
                                              <div>
                                                  <span> ${this._renderTabLabel(tabConf)}</span>
                                                  <span class="secondary"
                                                      >${this._renderTabSecondary(tabConf)}</span
                                                  >
                                              </div>
                                          </div>
                                      `}
                                      <ha-icon-button
                                          .label=${customLocalize("editor.form.card-picker.clear")}
                                          class="remove-icon"
                                          .index=${index}
                                          @click=${this._removeTab}
                                      >
                                          <ha-icon icon="mdi:close"></ha-icon
                                      ></ha-icon-button>
                                      <ha-icon-button
                                          .label=${customLocalize("editor.form.card-picker.edit")}
                                          class="edit-icon"
                                          .index=${index}
                                          @click=${this._editTab}
                                      >
                                          <ha-icon icon="mdi:pencil"></ha-icon>
                                      </ha-icon-button>
                                  </div>
                              `
                          )
                )}
            </div>
            <mushroom-select
                .label=${customLocalize("editor.card.tabbed.tab-picker.add")}
                @selected=${this._addTab}
                @closed=${(e) => e.stopPropagation()}
                fixedMenuPosition
                naturalMenuWidth
            >
                ${TAB_LIST.map(
                    (chip) =>
                        html`
                            <mwc-list-item .value=${chip}>
                                ${customLocalize(`editor.chip.chip-picker.types.${chip}`)}
                            </mwc-list-item>
                        `
                )}
            </mushroom-select>
        `;
    }

    protected updated(changedProps: PropertyValues): void {
        super.updated(changedProps);

        const attachedChanged = changedProps.has("_attached");
        const tabsChanged = changedProps.has("tabs");

        if (!tabsChanged && !attachedChanged) {
            return;
        }

        if (attachedChanged && !this._attached) {
            // Tear down sortable, if available
            this._sortable?.destroy();
            this._sortable = undefined;
            return;
        }

        if (!this._sortable && this.tabs) {
            this._createSortable();
            return;
        }

        if (tabsChanged) {
            this._handleTabsChanged();
        }
    }

    private async _handleTabsChanged() {
        this._renderEmptySortable = true;
        await this.updateComplete;
        const container = this.shadowRoot!.querySelector(".tabs")!;
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

        this._sortable = new Sortable(this.shadowRoot!.querySelector(".tabs"), {
            animation: 150,
            fallbackClass: "sortable-fallback",
            handle: ".handle",
            onEnd: async (evt: SortableEvent) => this._tabMoved(evt),
        });
    }

    private async _addTab(ev: any): Promise<void> {
        ev.stopPropagation();
        const target = ev.target! as EditorTarget;
        const value = target.value as string;

        if (value === "") {
            return;
        }

        let finalTabsConfig = this.tabs || [];

        const elClass = (await customElements.get(`mushroom-${value}-card`)) as any;

        if (elClass && elClass.getStubConfig) {
            const newTabConfig = await elClass.getStubConfig(this.hass);
            newTabConfig.layout = "vertical";
            finalTabsConfig = finalTabsConfig.concat(newTabConfig)
        } 
        
        target.value = "";
        fireEvent(this, "tabs-changed", {
            tabs: finalTabsConfig,
        });
    }

    private _tabMoved(ev: SortableEvent): void {
        if (ev.oldIndex === ev.newIndex) {
            return;
        }

        const newTabs = this.tabs!.concat();

        newTabs.splice(ev.newIndex!, 0, newTabs.splice(ev.oldIndex!, 1)[0]);

        fireEvent(this, "tabs-changed", { tabs: newTabs });
    }

    private _removeTab(ev: CustomEvent): void {
        const index = (ev.currentTarget as any).index;
        const newConfigTabs = this.tabs!.concat();

        newConfigTabs.splice(index, 1);

        fireEvent(this, "tabs-changed", {
            tabs: newConfigTabs,
        });
    }

    private _editTab(ev: CustomEvent): void {
        const index = (ev.currentTarget as any).index;
        fireEvent<any>(this, "edit-detail-element", {
            subElementConfig: {
                index,
                type: "tab",
                elementConfig: this.tabs![index],
            },
        });
    }

    private _renderTabLabel(tabConf: LovelaceCardConfig): string {
        return this.getEntityName(tabConf.entity);
    }

    private _renderTabSecondary(tabConf: LovelaceCardConfig): string | undefined {
        return this.getEntityName(tabConf.entity) == tabConf.entity ? undefined : tabConf.entity;
    }

    private getEntityName(entity_id: string): string {
        if (!this.hass) return entity_id;
        const entity = this.hass.states[entity_id];
        if (!entity) return "Entity Not Found";
        return entity.attributes.friendly_name || entity_id;
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
                .tab {
                    display: flex;
                    align-items: center;
                }

                ha-icon {
                    display: flex;
                }

                mushroom-select {
                    width: 100%;
                }

                .tab .handle {
                    padding-right: 8px;
                    cursor: move;
                }

                .tab .handle > * {
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

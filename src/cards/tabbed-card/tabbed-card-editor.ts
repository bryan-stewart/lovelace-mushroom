import { css, CSSResultGroup, html, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { assert } from "superstruct";
import { fireEvent, HASSDomEvent, LovelaceCardConfig, LovelaceCardEditor } from "../../ha";
import { MushroomBaseElement } from "../../utils/base-element";
import { loadHaComponents } from "../../utils/loader";
import { CardEditorOptions, EditorTarget, EditSubElementEvent, SubElementEditorConfig } from "../../utils/lovelace/editor/types";
import { TABBED_CARD_EDITOR_NAME } from "./const";
import { TabbedCardConfig, tabbedCardConfigStruct } from "./tabbed-card-config";
import setupCustomlocalize from "../../localize";
import "../../utils/lovelace/sub-element-editor";
import "../../utils/lovelace/feature-element-editor";

const TAB_LIST = ["entity", "template"];

@customElement(TABBED_CARD_EDITOR_NAME)
export class TabbedCardEditor extends MushroomBaseElement implements LovelaceCardEditor {
    @state() private _config?: TabbedCardConfig;
    @state() private _options?: CardEditorOptions;

    @state() private _cardPicker: boolean = false;

    @state() private _subElementEditorConfig?: SubElementEditorConfig;

    @state() private _selectedTab: number = 0;

    connectedCallback() {
        super.connectedCallback();
        void loadHaComponents();
    }

    public setConfig(config: TabbedCardConfig): void {
        assert(config, tabbedCardConfigStruct);
        this._config = config;
        this._options = { dropdowns: config.dropdowns.map((d) => d.type) };
    }

    protected render(): TemplateResult {
        if (!this.hass || !this._config) {
            return html``;
        }

        const pages = [this._renderTabsTab, this._renderDropdownsTab];

        return html`
            <div class="card-config">
                <div class="toolbar">
                    <mwc-tab-bar
                        .activeIndex=${this._selectedTab}
                        @MDCTabBar:activated=${this._handleSwitchTab}
                    >
                        <mwc-tab .label=${"Tabs"}></mwc-tab>
                        <mwc-tab .label=${"Dropdowns"}></mwc-tab>
                    </mwc-tab-bar>
                </div>
                <div id="editor">
                    ${this._subElementEditorConfig
                        ? html`
                              <mushroom-sub-element-editor
                                  .hass=${this.hass}
                                  .config=${this._subElementEditorConfig}
                                  .options=${this._options}
                                  @go-back=${this._goBack}
                                  @config-changed=${this._handleSubElementChanged}
                              >
                              </mushroom-sub-element-editor>
                          `
                        : pages[this._selectedTab].bind(this)()}
                </div>
            </div>
        `;
    }

    protected _renderTabsTab() {
        if (!this._config) return html``;

        const customLocalize = setupCustomlocalize(this.hass);

        return html`
            <mushroom-feature-editor
                .hass=${this.hass}
                .lovelace=${this.lovelace}
                .features=${this._config!.tabs || []}
                .label="${customLocalize(
                    "editor.card.tabbed.tab-picker.tabs"
                )} (${this.hass!.localize("ui.panel.lovelace.editor.card.config.required")})"
                .type=${"tab"}
                @features-changed=${this._tabsChanged}
                @edit-detail-element=${this._editDetailElement}
            >
                <mushroom-select
                    slot="add"
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
            </mushroom-feature-editor>
        `;
    }

    protected _renderDropdownsTab() {
        if (!this._config) return html``;

        const customLocalize = setupCustomlocalize(this.hass);

        if (this._cardPicker) {
            return html`<hui-card-picker
                .lovelace=${this.lovelace}
                .hass=${this.hass}
                @config-changed=${this._addDropdown}
            ></hui-card-picker>`;
        }

        return html`
            <mushroom-feature-editor
                .hass=${this.hass}
                .lovelace=${this.lovelace}
                .features=${this._config!.dropdowns || []}
                .label="${customLocalize(
                    "editor.card.dropdown.dropdown-picker.dropdowns"
                )} (${this.hass!.localize("ui.panel.lovelace.editor.card.config.required")})"
                .type=${"dropdown"}
                @features-changed=${this._dropdownsChanged}
                @edit-detail-element=${this._editDetailElement}
            >
                <div slot="add" class="button" @click=${this._openCardPicker}>
                    ${customLocalize("editor.card.dropdown.dropdown-picker.add")}
                    <ha-icon icon="mdi:plus"></ha-icon>
                </div>
            </mushroom-feature-editor>
        `;
    }

    private async _addTab(ev: any): Promise<void> {
        ev.stopPropagation();
        const target = ev.target! as EditorTarget;
        const value = target.value as string;

        if (value === "") {
            return;
        }

        let finalTabsConfig = this._config?.tabs || [];

        const elClass = (await customElements.get(`mushroom-${value}-card`)) as any;

        if (elClass && elClass.getStubConfig) {
            const newTabConfig = await elClass.getStubConfig(this.hass);
            newTabConfig.layout = "vertical";
            finalTabsConfig = finalTabsConfig.concat(newTabConfig);
        }

        fireEvent(this, "config-changed", {
            config: { ...this._config, tabs: finalTabsConfig } as any,
        });
    }

    private _tabsChanged(ev): void {
        ev.stopPropagation();
        fireEvent(this, "config-changed", {
            config: { ...this._config, tabs: ev.detail.features } as any,
        });
    }

    private async _addDropdown(ev: any): Promise<void> {
        ev.stopPropagation();

        const config = ev.detail.config as LovelaceCardConfig;

        if (!config) {
            this._cardPicker = false;
            return;
        }

        const newConfigDropdowns = (this._config?.dropdowns || []).concat(config);

        fireEvent(this, "config-changed", {
            config: { ...this._config, dropdowns: newConfigDropdowns } as any,
        });
        this._cardPicker = false;
    }

    private _dropdownsChanged(ev): void {
        ev.stopPropagation();
        fireEvent(this, "config-changed", {
            config: { ...this._config, dropdowns: ev.detail.features } as any,
        });
    }

    private _openCardPicker(): void {
        this._cardPicker = true;
    }

    private _handleSwitchTab(ev: CustomEvent) {
        this._goBack();
        this._selectedTab = parseInt(ev.detail.index, 10);
    }

    private _handleSubElementChanged(ev: CustomEvent): void {
        ev.stopPropagation();
        if (!this._config || !this.hass) {
            return;
        }
        console.log(ev);

        const configValue = this._subElementEditorConfig?.type;
        const value = ev.detail.config;

        if (configValue === "dropdown") {
            const newConfigDropdowns = this._config!.dropdowns!.concat();
            if (!value) {
                newConfigDropdowns.splice(this._subElementEditorConfig!.index!, 1);
                this._goBack();
            } else {
                newConfigDropdowns[this._subElementEditorConfig!.index!] = value;
            }

            this._config = { ...this._config!, dropdowns: newConfigDropdowns };
        } else if (configValue === "tab") {
            const newConfigTabs = this._config!.tabs!.concat();
            if (!value) {
                newConfigTabs.splice(this._subElementEditorConfig!.index!, 1);
                this._goBack();
            } else {
                newConfigTabs[this._subElementEditorConfig!.index!] = value;
            }

            this._config = { ...this._config!, tabs: newConfigTabs };
        }

        this._subElementEditorConfig = {
            ...this._subElementEditorConfig!,
            elementConfig: value,
        };

        fireEvent(this, "config-changed", { config: this._config });
    }

    private _editDetailElement(ev: HASSDomEvent<EditSubElementEvent>): void {
        this._subElementEditorConfig = ev.detail.subElementConfig;
    }

    private _goBack(): void {
        this._subElementEditorConfig = undefined;
    }

    static get styles(): CSSResultGroup {
        return [
            super.styles,
            css`
                mwc-tab-bar {
                    border-bottom: 1px solid var(--divider-color);
                }
                #editor {
                    padding: 8px;
                    margin-top: 12px;
                }
                mushroom-select {
                    width: 100%;
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

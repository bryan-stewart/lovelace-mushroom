import { css, CSSResultGroup, html, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { assert } from "superstruct";
import { fireEvent, HASSDomEvent, LovelaceCardEditor } from "../../ha";
import { MushroomBaseElement } from "../../utils/base-element";
import { loadHaComponents } from "../../utils/loader";
import { CardEditorOptions, EditSubElementEvent, SubElementEditorConfig } from "../../utils/lovelace/editor/types";
import { TABBED_CARD_EDITOR_NAME } from "./const";
import { TabbedCardConfig, tabbedCardConfigStruct } from "./tabbed-card-config";
import "../../utils/lovelace/dropdowns-element-editor";
import "./tabbed-card-tab-editor";

@customElement(TABBED_CARD_EDITOR_NAME)
export class TabbedCardEditor extends MushroomBaseElement implements LovelaceCardEditor {
    @state() private _config?: TabbedCardConfig;
    @state() private _options?: CardEditorOptions;

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

        return html`
            <mushroom-tabs-editor
                .hass=${this.hass}
                .lovelace=${this.lovelace}
                .tabs=${this._config.tabs || []}
                @tabs-changed=${this._featuresChanged}
                @edit-detail-element=${this._editDetailElement}
            ></mushroom-tabs-editor>
        `;
    }

    protected _renderDropdownsTab() {
        if (!this._config) return html``;

        return html`
            <mushroom-dropdowns-editor
                .hass=${this.hass}
                .lovelace=${this.lovelace}
                .dropdowns=${this._config.dropdowns || []}
                @dropdowns-changed=${this._featuresChanged}
                @edit-detail-element=${this._editDetailElement}
            ></mushroom-dropdowns-editor>
        `;
    }

    private _featuresChanged(ev): void {
        ev.stopPropagation();
        const feature = ev.type.split("-")[0]
        const value = ev.detail[feature]
        fireEvent(this, "config-changed", {
            config: {
                ...this._config,
                [feature]: value,
            } as any,
        });
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

        const configValue = this._subElementEditorConfig?.type;
        const value = ev.detail.config;

        if (configValue === "card") {
            const newConfigDropdowns = this._config!.dropdowns!.concat();
            if (!value) {
                newConfigDropdowns.splice(this._subElementEditorConfig!.index!, 1);
                this._goBack();
            } else {
                newConfigDropdowns[this._subElementEditorConfig!.index!] = value;
            }

            this._config = { ...this._config!, dropdowns: newConfigDropdowns };
        } 
        if (configValue === "tab") {
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
            `,
        ];
    }
}

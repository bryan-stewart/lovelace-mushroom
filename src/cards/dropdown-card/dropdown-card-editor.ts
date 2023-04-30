import { css, CSSResultGroup, html, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import memoizeOne from "memoize-one";
import { assert } from "superstruct";
import { fireEvent, HASSDomEvent, LovelaceCardEditor } from "../../ha";
import setupCustomlocalize from "../../localize";
import { computeCustomActionsFormSchema } from "../../shared/config/actions-config";
import { APPEARANCE_FORM_SCHEMA } from "../../shared/config/appearance-config";
import { MushroomBaseElement } from "../../utils/base-element";
import { GENERIC_LABELS } from "../../utils/form/generic-fields";
import { HaFormSchema } from "../../utils/form/ha-form";
import { stateIcon } from "../../utils/icons/state-icon";
import { loadHaComponents } from "../../utils/loader";
import { EditSubElementEvent, SubElementEditorConfig } from "../../utils/lovelace/editor/types";
import { DROPDOWN_CARD_EDITOR_NAME } from "./const";
import { DropdownCardConfig, dropdownCardConfigStruct } from "./dropdown-card-config";
import "./dropdown-card-dropdowns-editor";

const computeSchema = memoizeOne((icon?: string, dropdowns?: any): HaFormSchema[] => [
    { name: "entity", selector: { entity: {} } },
    { name: "name", selector: { text: {} } },
    {
        type: "grid",
        name: "",
        schema: [
            { name: "icon", selector: { icon: { placeholder: icon } } },
            { name: "icon_color", selector: { mush_color: {} } },
        ],
    },
    ...APPEARANCE_FORM_SCHEMA,
    {
        type: "grid",
        name: "",
        schema: [
            { name: "hide_arrow", selector: { boolean: {} } },
        ],
    },
    ...computeCustomActionsFormSchema({ dropdowns }),
]);

@customElement(DROPDOWN_CARD_EDITOR_NAME)
export class DropdownCardEditor extends MushroomBaseElement implements LovelaceCardEditor {
    @state() private _config?: DropdownCardConfig;

    @state() private _subElementEditorConfig?: SubElementEditorConfig;

    @state() private _selectedTab: number = 0;

    connectedCallback() {
        super.connectedCallback();
        void loadHaComponents();
    }

    public setConfig(config: DropdownCardConfig): void {
        assert(config, dropdownCardConfigStruct);
        this._config = config;
    }

    private _computeLabel = (schema: HaFormSchema) => {
        const customLocalize = setupCustomlocalize(this.hass!);

        if (GENERIC_LABELS.includes(schema.name)) {
            return customLocalize(`editor.card.generic.${schema.name}`);
        }
        return this.hass!.localize(`ui.panel.lovelace.editor.card.generic.${schema.name}`);
    };

    protected render(): TemplateResult {
        if (!this.hass || !this._config) {
            return html``;
        }

        const pages = [this._renderMainTab, this._renderDropdownsTab];

        return html`
            <div class="card-config">
                <div class="toolbar">
                    <mwc-tab-bar
                        .activeIndex=${this._selectedTab}
                        @MDCTabBar:activated=${this._handleSwitchTab}
                    >
                        <mwc-tab .label=${"Main"}></mwc-tab>
                        <mwc-tab .label=${"Dropdowns"}></mwc-tab>
                    </mwc-tab-bar>
                </div>
                <div id="editor">
                    ${this._subElementEditorConfig
                        ? html`
                              <mushroom-sub-element-editor
                                  .hass=${this.hass}
                                  .config=${this._subElementEditorConfig}
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

    protected _renderMainTab() {
        const entityState = this._config?.entity
            ? this.hass.states[this._config.entity]
            : undefined;
        const entityIcon = entityState ? stateIcon(entityState) : undefined;
        const icon = this._config?.icon || entityIcon;
        const dropdowns =
            this._config?.dropdowns?.map((d) =>
                d.type
                    .replace("custom:", "")
                    .split("-")
                    .map((name) => name[0].toUpperCase() + name.substr(1))
                    .join(" ")
            ) || [];
        const schema = computeSchema(icon, dropdowns);

        return html`
            <ha-form
                .hass=${this.hass}
                .data=${this._config}
                .schema=${schema}
                .computeLabel=${this._computeLabel}
                @value-changed=${this._valueChanged}
            ></ha-form>
        `;
    }

    protected _renderDropdownsTab() {
        if (!this._config) return html``;

        return html`
            <mushroom-dropdown-card-dropdowns-editor
                .hass=${this.hass}
                .lovelace=${this.lovelace}
                .dropdowns=${this._config.dropdowns || []}
                @dropdowns-changed=${this._dropdownsChanged}
                @edit-detail-element=${this._editDetailElement}
            ></mushroom-dropdown-card-dropdowns-editor>
        `;
    }

    private _valueChanged(ev: CustomEvent): void {
        fireEvent(this, "config-changed", { config: ev.detail.value });
    }
    private _chipsChanged(ev): void {
        ev.stopPropagation();
        fireEvent(this, "config-changed", {
            config: { ...this._config, chips: ev.detail.config } as any,
        });
    }
    private _dropdownsChanged(ev): void {
        ev.stopPropagation();
        fireEvent(this, "config-changed", {
            config: { ...this._config, dropdowns: ev.detail.dropdowns } as any,
        });
    }

    private _rerender() {
        this.requestUpdate();
    }

    private _handleSwitchTab(ev: CustomEvent) {
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
        } else if (configValue) {
            if (value === "") {
                this._config = { ...this._config };
                delete this._config[configValue!];
            } else {
                this._config = {
                    ...this._config,
                    [configValue]: value,
                };
            }
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

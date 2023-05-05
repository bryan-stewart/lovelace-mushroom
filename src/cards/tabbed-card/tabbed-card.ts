import { css, CSSResultGroup, html, nothing, PropertyValues, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import {
    ActionHandlerEvent,
    computeRTL,
    HomeAssistant,
    LovelaceCard,
    LovelaceCardConfig,
    LovelaceCardEditor,
} from "../../ha";
import "../../shared/badge-icon";
import "../../shared/card";
import "../../shared/shape-avatar";
import "../../shared/shape-icon";
import "../../shared/state-info";
import "../../shared/state-item";
import { computeAppearance } from "../../utils/appearance";
import { MushroomBaseCard } from "../../utils/base-card";
import { cardStyle } from "../../utils/card-styles";
import { registerCustomCard } from "../../utils/custom-cards";
import { createCardElement } from "../../utils/lovelace/card/card-element";
import { TABBED_CARD_EDITOR_NAME, TABBED_CARD_NAME } from "./const";
import { TabbedCardConfig } from "./tabbed-card-config";

registerCustomCard({
    type: TABBED_CARD_NAME,
    name: "Mushroom Tabbed Card",
    description: "Card with dropdowns",
});

const ALLOWED_TABS = ["custom:mushroom-entity-card", "custom:mushroom-template-card"];

@customElement(TABBED_CARD_NAME)
export class TabbedCard extends MushroomBaseCard implements LovelaceCard {
    public static async getConfigElement(): Promise<LovelaceCardEditor> {
        await import("./tabbed-card-editor");
        return document.createElement(TABBED_CARD_EDITOR_NAME) as LovelaceCardEditor;
    }

    public static async getStubConfig(hass: HomeAssistant): Promise<TabbedCardConfig> {
        const entities = Object.keys(hass.states);
        return {
            type: `custom:${TABBED_CARD_NAME}`,
            tabs: [
                {
                    type: "custom:mushroom-entity-card",
                    entity: entities[0],
                    layout: "vertical",
                    tap_action: {
                        action: "dropdown",
                        dropdown: "1",
                    },
                },
                {
                    type: "custom:mushroom-entity-card",
                    entity: entities[1],
                    layout: "vertical",
                    tap_action: {
                        action: "dropdown",
                        dropdown: "2",
                    },
                },
            ],
            dropdowns: [
                {
                    type: "entities",
                    entities: entities.slice(2, 5),
                },
                {
                    type: "entities",
                    entities: entities.slice(5, 8),
                },
            ],
        };
    }

    @state() private _config?: TabbedCardConfig;
    @state() private _tabs?: TemplateResult[];
    @state() private _dropdown?: string;
    @state() private _openTab?: number;

    protected updated(changedProps: PropertyValues): void {
        super.updated(changedProps);

        if (changedProps.has("_config")) {
            this._createTabs();
        }
    }

    getCardSize(): number | Promise<number> {
        return 1;
    }

    setConfig(config: TabbedCardConfig): void {
        this._config = {
            tap_action: {
                action: "more-info",
            },
            hold_action: {
                action: "more-info",
            },
            ...config,
        };
    }

    private _handleDropdown(ev: ActionHandlerEvent) {
        const action = ev.detail.action;
        const tab = (ev as any).originalTarget.index;
        let dropdown = (ev.detail as any).dropdown;
        if (dropdown == "close" || (action == "tap" && this._openTab == tab)) {
            this._dropdown = undefined;
            this._openTab = undefined;
        } else if (dropdown) {
            dropdown = +dropdown - 1 + "";
            this._dropdown = this._dropdown == dropdown ? undefined : dropdown;
            this._openTab = this._dropdown ? tab : undefined;
        }
    }

    protected render(): TemplateResult {
        if (!this._config || !this.hass) {
            return html``;
        }

        const config = this._config;
        const appearance = computeAppearance(config);
        const rtl = computeRTL(this.hass);

        const dropdown =
            this._dropdown != undefined && config.dropdowns
                ? config.dropdowns[+this._dropdown]
                : undefined;

        return html`
            <ha-card class=${classMap({ "fill-container": appearance.fill_container })}>
                <mushroom-card .appearance=${appearance} ?rtl=${rtl}>
                    <div>
                        <div class="state-container" @dropdown-changed=${this._handleDropdown}>
                            ${this.renderTabs()}
                        </div>
                        ${!dropdown
                            ? nothing
                            : html`
                                  <div class="dropdown-container">${this.renderCard(dropdown)}</div>
                              `}
                    </div>
                </mushroom-card>
            </ha-card>
        `;
    }

    private _createTabs() {
        const createTab = (tabConfig, index: number): TemplateResult => {
            if (!tabConfig || !tabConfig.type || !this.hass) {
                return html``;
            }

            let tab;
            if (ALLOWED_TABS.includes(tabConfig.type)) {
                tab = createCardElement(tabConfig);
                if (tab) {
                    tab.hass = this.hass;
                    tab.index = index;
                }
            }

            return html`${tab}`;
        };

        if (!this._config?.tabs) return;
        this._tabs = this._config.tabs.map((t, i) => createTab(t, i));
    }

    private renderTabs(): TemplateResult {
        if (!this._tabs) return html``;

        return html`${this._tabs.map((tab, index, array) => {
            const classes = {
                "tab-container": true,
                "open-tab": index == this._openTab,
                open: typeof this._openTab == "number" && index != this._openTab,
                left: index + 1 == this._openTab,
                right: index - 1 == this._openTab,
                last: index + 1 == array.length,
            };

            return html`<div class="${classMap(classes)}">${tab}</div>`;
        })}`;
    }

    private renderCard(cardConfig: LovelaceCardConfig): TemplateResult {
        const element = createCardElement(cardConfig);
        if (!element) {
            return html``;
        }
        if (this.hass) {
            element.hass = this.hass;
        }
        return html`${element}`;
    }

    static get styles(): CSSResultGroup {
        return [
            super.styles,
            cardStyle,
            css`
                ha-card {
                    overflow: hidden;
                    padding: unset;
                }
                .state-container {
                    display: flex;
                    /* padding: 12px; */
                }
                .toggle {
                    display: flex;
                    flex-shrink: 1;
                    align-items: center;
                }
                .toggle.closed {
                    transform: rotate(180deg);
                }
                .toggle.hidden {
                    display: none;
                }
                .divider {
                    height: 0.5px;
                    background-color: #727272;
                    opacity: 0.25;
                }
                .dropdown-container {
                    --ha-card-border-width: 0;
                }
                .tab-container > * {
                    --ha-card-border-width: 0;
                }
                .tab-container {
                    flex: 1;
                    cursor: pointer;
                    user-select: none;
                    border-width: var(--ha-card-border-width, 1px);
                    border-color: var(--ha-card-border-color, var(--divider-color, #e0e0e0));
                    border-right-style: solid;
                }
                .tab-container.open {
                    border-bottom-style: solid;
                }
                .tab-container.open-tab {
                    border-right-style: unset;
                }
                .tab-container.left {
                    border-bottom-right-radius: var(--ha-card-border-radius, 12px);
                    border-right-style: solid;
                }
                .tab-container.right {
                    border-bottom-left-radius: var(--ha-card-border-radius, 12px);
                    border-left-style: solid;
                }
                .tab-container.last {
                    border-right-style: unset;
                }
            `,
        ];
    }
}

import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import {
    actionHandler,
    ActionHandlerEvent,
    computeRTL,
    handleAction,
    hasAction,
    HomeAssistant,
    isActive,
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
import { computeRgbColor } from "../../utils/colors";
import { registerCustomCard } from "../../utils/custom-cards";
import { stateIcon } from "../../utils/icons/state-icon";
import { computeEntityPicture } from "../../utils/info";
import { createCardElement } from "../../utils/lovelace/card/card-element";
import { DROPDOWN_CARD_EDITOR_NAME, DROPDOWN_CARD_NAME } from "./const";
import { DropdownCardConfig } from "./dropdown-card-config";

registerCustomCard({
    type: DROPDOWN_CARD_NAME,
    name: "Mushroom Dropdown Card",
    description: "Card with dropdowns",
});

@customElement(DROPDOWN_CARD_NAME)
export class DropdownCard extends MushroomBaseCard implements LovelaceCard {
    public static async getConfigElement(): Promise<LovelaceCardEditor> {
        await import("./dropdown-card-editor");
        return document.createElement(DROPDOWN_CARD_EDITOR_NAME) as LovelaceCardEditor;
    }

    public static async getStubConfig(hass: HomeAssistant): Promise<DropdownCardConfig> {
        const entities = Object.keys(hass.states);
        return {
            type: `custom:${DROPDOWN_CARD_NAME}`,
            entity: entities[0],
            tap_action: {
                action: 'dropdown',
                dropdown: '1'
            },
            dropdowns: [{
                type: 'entities',
                entities: entities.slice(1,4)
            }]
        };
    }

    @state() private _config?: DropdownCardConfig;
    @state() private _dropdown?: string;

    getCardSize(): number | Promise<number> {
        return 1;
    }

    setConfig(config: DropdownCardConfig): void {
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

    private _handleAction(ev: ActionHandlerEvent) {
        if (this._config![ev.detail.action + "_action"].action === "dropdown") {
            this._handleDropdown(ev);
        } else {
            handleAction(this, this.hass!, this._config!, ev.detail.action!);
        }
    }

    private _handleDropdown(ev: ActionHandlerEvent) {
        let action = ev.detail.action
        let dropdown =
            (ev.detail as any).dropdown || this._config![action + "_action"].dropdown;
        if (dropdown == "close" || (action == 'tap' && this._dropdown)) {
            this._dropdown = undefined;
        } else {
            dropdown = +dropdown - 1 + "";
            this._dropdown = this._dropdown == dropdown ? undefined : dropdown;
        }
    }

    protected render(): TemplateResult {
        if (!this._config || !this.hass || !this._config.entity) {
            return html``;
        }

        const config = this._config;
        const entityId = this._config.entity;
        const entity = this.hass.states[entityId];

        const name = config.name || entity.attributes.friendly_name || "";
        const icon = config.icon || stateIcon(entity);
        const appearance = computeAppearance(this._config);

        const picture = computeEntityPicture(entity, appearance.icon_type);

        const rtl = computeRTL(this.hass);

        const chips =
            this._config.chips && this._config.chips.chips.length
                ? {
                      ...this._config.chips,
                      color: this._config.chips.color || "lightblue",
                      chips: this._config.chips.chips.map((n) => ({
                          ...n,
                      })),
                  }
                : undefined;

        const dropdown =
            this._dropdown != undefined && config.dropdowns
                ? config.dropdowns[+this._dropdown]
                : undefined;

        return html`
            <ha-card class=${classMap({ "fill-container": appearance.fill_container })}>
                <mushroom-card .appearance=${appearance} ?rtl=${rtl}>
                    <div>
                        <div class="state-container">
                            <mushroom-state-item
                                ?rtl=${rtl}
                                .appearance=${appearance}
                                @action=${this._handleAction}
                                .actionHandler=${actionHandler({
                                    hasHold: hasAction(this._config.hold_action),
                                    hasDoubleClick: hasAction(this._config.double_tap_action),
                                })}
                            >
                                ${picture
                                    ? this.renderPicture(picture)
                                    : this.renderIcon(entity, icon)}
                                ${this.renderBadge(entity)}
                                ${this.renderStateInfo(entity, appearance, name)};
                            </mushroom-state-item>
                            <div
                                class="${classMap({
                                    toggle: true,
                                    closed: !this._dropdown,
                                    hidden: this._config.hide_arrow || false,
                                })}"
                            >
                                <ha-icon icon="mdi:chevron-up"></ha-icon>
                            </div>
                        </div>
                        ${!dropdown
                            ? ""
                            : html`
                                  <div class="divider"></div>
                                  <div class="dropdown-container">${this.renderCard(dropdown)}</div>
                              `}
                    </div>
                </mushroom-card>
            </ha-card>
        `;
    }

    renderIcon(entity: HassEntity, icon: string): TemplateResult {
        const active = isActive(entity);
        const iconStyle = {};
        const iconColor = this._config?.icon_color;
        if (iconColor) {
            const iconRgbColor = computeRgbColor(iconColor);
            iconStyle["--icon-color"] = `rgb(${iconRgbColor})`;
            iconStyle["--shape-color"] = `rgba(${iconRgbColor}, 0.2)`;
        }
        return html`
            <mushroom-shape-icon
                slot="icon"
                .disabled=${!active}
                .icon=${icon}
                style=${styleMap(iconStyle)}
            ></mushroom-shape-icon>
        `;
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
                    padding: 12px;
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
                mushroom-state-item {
                    flex-grow: 1;
                    cursor: pointer;
                    user-select: none;
                }
                mushroom-shape-icon {
                    --icon-color: rgb(var(--rgb-state-entity));
                    --shape-color: rgba(var(--rgb-state-entity), 0.2);
                }
            `,
        ];
    }
}

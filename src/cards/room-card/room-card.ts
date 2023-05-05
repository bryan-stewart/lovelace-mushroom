import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, nothing, PropertyValues, TemplateResult } from "lit";
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
import { ROOM_CARD_EDITOR_NAME, ROOM_CARD_NAME } from "./const";
import { RoomCardConfig } from "./room-card-config";

registerCustomCard({
    type: ROOM_CARD_NAME,
    name: "Mushroom Room Card",
    description: "Card for all entities",
});

@customElement(ROOM_CARD_NAME)
export class RoomCard extends MushroomBaseCard implements LovelaceCard {
    public static async getConfigElement(): Promise<LovelaceCardEditor> {
        await import("./room-card-editor");
        return document.createElement(ROOM_CARD_EDITOR_NAME) as LovelaceCardEditor;
    }

    public static async getStubConfig(hass: HomeAssistant): Promise<RoomCardConfig> {
        const entities = Object.keys(hass.states);
        return {
            type: `custom:${ROOM_CARD_NAME}`,
            entity: entities[0],
            tap_action: {
                action: 'dropdown',
                dropdown: 'close'
            },
            dropdowns: [
                {
                    type: "entities",
                    entities: entities.slice(2, 5),
                },
                {
                    type: "gauge",
                    entity: entities[5],
                },
            ],
            chips: {
                chips: [
                    {
                        type: "entity",
                        entity: entities[6],
                        tap_action: {
                            action: 'dropdown',
                            dropdown: '1'
                        }
                    },
                    {
                        type: "entity",
                        entity: entities[7],
                        tap_action: {
                            action: 'dropdown',
                            dropdown: '2'
                        }
                    },
                ],
                alignment: "end",
            },
        };
    }

    @state() private _config?: RoomCardConfig;
    @state() private _dropdown?: string;
    @state() private _chips?: TemplateResult;

    getCardSize(): number | Promise<number> {
        return 1;
    }

    setConfig(config: RoomCardConfig): void {
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

    protected updated(changedProps: PropertyValues): void {
        super.updated(changedProps);

        if (changedProps.has("_config")) {
            this._renderChips();
        }
    }

    private _handleAction(ev: ActionHandlerEvent) {
        if (this._config![ev.detail.action + "_action"].action === "dropdown") {
            this._handleDropdown(ev);
        } else {
            handleAction(this, this.hass!, this._config!, ev.detail.action!);
        }
    }

    private _handleDropdown(ev: ActionHandlerEvent) {
        let dropdown =
            (ev.detail as any).dropdown || this._config![ev.detail.action + "_action"].dropdown;
        if (dropdown == "close") {
            this._dropdown = undefined;
        } else {
            dropdown = +dropdown - 1 + "";
            this._dropdown = this._dropdown == dropdown ? undefined : dropdown;
        }
    }

    private _renderChips() {
        if (this._config?.chips?.chips?.length) {
            const config = {
                ...this._config.chips,
                color: this._config.chips.color || "lightblue",
                chips: this._config.chips.chips.map((n) => ({
                    ...n,
                })),
            };

            this._chips = html`
                <div class="chips-container" style="background-color: ${config.color}">
                    <mushroom-chips-card
                        .hass=${this.hass}
                        ._config=${config}
                        @dropdown-changed=${this._handleDropdown}
                    ></mushroom-chips-card>
                </div>
            `;
        } else {
            this._chips = undefined
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

        const dropdown =
            this._dropdown != undefined && config.dropdowns
                ? config.dropdowns[+this._dropdown]
                : undefined;

        return html`
            <ha-card class=${classMap({ "fill-container": appearance.fill_container })}>
                <mushroom-card .appearance=${appearance} ?rtl=${rtl}>
                    <div>
                        <div
                            class="state-container"
                            @action=${this._handleAction}
                            .actionHandler=${actionHandler({
                                hasHold: hasAction(this._config.hold_action),
                                hasDoubleClick: hasAction(this._config.double_tap_action),
                            })}
                        >
                            <mushroom-state-item ?rtl=${rtl} .appearance=${appearance}>
                                ${picture
                                    ? this.renderPicture(picture)
                                    : this.renderIcon(entity, icon)}
                                ${this.renderBadge(entity)}
                                ${this.renderStateInfo(entity, appearance, name)};
                            </mushroom-state-item>
                        </div>
                        ${!dropdown
                            ? ""
                            : html`
                                  <div class="divider"></div>
                                  <div class="dropdown-container">${this.renderCard(dropdown)}</div>
                              `}
                        ${this._chips}
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
                    padding: 12px;
                }
                .divider {
                    height: 0.5px;
                    background-color: #727272;
                    opacity: 0.25;
                }
                .dropdown-container {
                    --ha-card-border-width: 0;
                }
                .chips-container {
                    padding: 0 6px;
                    /* background-color: lightblue; */
                    /* --mush-chip-height: 28px; */
                    --mush-chip-background: none;
                    --mush-chip-border-width: 0;
                }
                mushroom-state-item {
                    cursor: pointer;
                }
                mushroom-shape-icon {
                    --icon-color: rgb(var(--rgb-state-entity));
                    --shape-color: rgba(var(--rgb-state-entity), 0.2);
                }
            `,
        ];
    }
}

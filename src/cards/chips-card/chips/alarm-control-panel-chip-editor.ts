import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import memoizeOne from "memoize-one";
import { fireEvent, HomeAssistant } from "../../../ha";
import setupCustomlocalize from "../../../localize";
import { computeActionsFormSchema } from "../../../shared/config/actions-config";
import { GENERIC_LABELS } from "../../../utils/form/generic-fields";
import { HaFormSchema } from "../../../utils/form/ha-form";
import { UiAction } from "../../../utils/form/ha-selector";
import { stateIcon } from "../../../utils/icons/state-icon";
import { computeChipEditorComponentName } from "../../../utils/lovelace/chip/chip-element";
import { AlarmControlPanelChipConfig } from "../../../utils/lovelace/chip/types";
import { LovelaceChipEditor } from "../../../utils/lovelace/types";
import { ALARM_CONTROl_PANEL_ENTITY_DOMAINS } from "../../alarm-control-panel-card/const";
import { ChipsCardOptions } from "../chips-card";
import { CardEditorOptions } from "../../../utils/lovelace/editor/types";

const actions: UiAction[] = ["more-info", "navigate", "url", "call-service", "none"];

const computeSchema = memoizeOne(({ icon, dropdowns }: CardEditorOptions): HaFormSchema[] => [
    { name: "entity", selector: { entity: { domain: ALARM_CONTROl_PANEL_ENTITY_DOMAINS } } },
    {
        type: "grid",
        name: "",
        schema: [
            { name: "name", selector: { text: {} } },
            { name: "content_info", selector: { mush_info: {} } },
        ],
    },
    { name: "icon", selector: { icon: { placeholder: icon } } },
    ...computeActionsFormSchema({ dropdowns }),
]);

@customElement(computeChipEditorComponentName("alarm-control-panel"))
export class AlarmControlPanelChipEditor extends LitElement implements LovelaceChipEditor {
    @property({ attribute: false }) public hass?: HomeAssistant;

    @property({ attribute: false }) public options?: ChipsCardOptions;

    @state() private _config?: AlarmControlPanelChipConfig;

    public setConfig(config: AlarmControlPanelChipConfig): void {
        this._config = config;
    }

    private _computeLabel = (schema: HaFormSchema) => {
        const customLocalize = setupCustomlocalize(this.hass!);

        if (GENERIC_LABELS.includes(schema.name)) {
            return customLocalize(`editor.card.generic.${schema.name}`);
        }
        return this.hass!.localize(`ui.panel.lovelace.editor.card.generic.${schema.name}`);
    };

    protected render() {
        if (!this.hass || !this._config) {
            return nothing;
        }

        const entityState = this._config.entity ? this.hass.states[this._config.entity] : undefined;
        const entityIcon = entityState ? stateIcon(entityState) : undefined;

        const schema = computeSchema({
            icon: this._config.icon || entityIcon,
            dropdowns: this.options?.dropdowns,
        });

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

    private _valueChanged(ev: CustomEvent): void {
        fireEvent(this, "config-changed", { config: ev.detail.value });
    }
}

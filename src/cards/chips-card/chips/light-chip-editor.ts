import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import memoizeOne from "memoize-one";
import { fireEvent, HomeAssistant } from "../../../ha";
import setupCustomlocalize from "../../../localize";
import {
    computeActionsFormSchema
} from "../../../shared/config/actions-config";
import { GENERIC_LABELS } from "../../../utils/form/generic-fields";
import { HaFormSchema } from "../../../utils/form/ha-form";
import { stateIcon } from "../../../utils/icons/state-icon";
import { computeChipEditorComponentName } from "../../../utils/lovelace/chip/chip-element";
import { LightChipConfig } from "../../../utils/lovelace/chip/types";
import { LovelaceChipEditor } from "../../../utils/lovelace/types";
import { LIGHT_ENTITY_DOMAINS } from "../../light-card/const";
import { LIGHT_LABELS } from "../../light-card/light-card-editor";
import { ChipsCardOptions } from "../chips-card";
import { CardEditorOptions } from "../../../utils/lovelace/editor/types";

const computeSchema = memoizeOne(({ icon, dropdowns }: CardEditorOptions): HaFormSchema[] => [
    { name: "entity", selector: { entity: { domain: LIGHT_ENTITY_DOMAINS } } },
    {
        type: "grid",
        name: "",
        schema: [
            { name: "name", selector: { text: {} } },
            { name: "content_info", selector: { mush_info: {} } },
        ],
    },
    {
        type: "grid",
        name: "",
        schema: [
            { name: "icon", selector: { icon: { placeholder: icon } } },
            { name: "use_light_color", selector: { boolean: {} } },
        ],
    },
    ...computeActionsFormSchema({ dropdowns }),
]);

@customElement(computeChipEditorComponentName("light"))
export class LightChipEditor extends LitElement implements LovelaceChipEditor {
    @property({ attribute: false }) public hass?: HomeAssistant;

    @property({ attribute: false }) public options?: ChipsCardOptions;

    @state() private _config?: LightChipConfig;

    public setConfig(config: LightChipConfig): void {
        this._config = config;
    }

    private _computeLabel = (schema: HaFormSchema) => {
        const customLocalize = setupCustomlocalize(this.hass!);

        if (GENERIC_LABELS.includes(schema.name)) {
            return customLocalize(`editor.card.generic.${schema.name}`);
        }
        if (LIGHT_LABELS.includes(schema.name)) {
            return customLocalize(`editor.card.light.${schema.name}`);
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

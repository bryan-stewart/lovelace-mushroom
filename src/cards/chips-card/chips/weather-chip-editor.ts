import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import memoizeOne from "memoize-one";
import { fireEvent, HomeAssistant } from "../../../ha";
import setupCustomlocalize from "../../../localize";
import { computeActionsFormSchema } from "../../../shared/config/actions-config";
import { GENERIC_LABELS } from "../../../utils/form/generic-fields";
import { HaFormSchema } from "../../../utils/form/ha-form";
import { UiAction } from "../../../utils/form/ha-selector";
import { computeChipEditorComponentName } from "../../../utils/lovelace/chip/chip-element";
import { WeatherChipConfig } from "../../../utils/lovelace/chip/types";
import { LovelaceChipEditor } from "../../../utils/lovelace/types";
import { ChipsCardOptions } from "../chips-card";
import { CardEditorOptions } from "../../../utils/lovelace/editor/types";

const WEATHER_ENTITY_DOMAINS = ["weather"];
const WEATHER_LABELS = ["show_conditions", "show_temperature"];

const actions: UiAction[] = ["more-info", "navigate", "url", "call-service", "none"];

const computeSchema = memoizeOne(({ dropdowns }: CardEditorOptions): HaFormSchema[] => [
    { name: "entity", selector: { entity: { domain: WEATHER_ENTITY_DOMAINS } } },
    {
        type: "grid",
        name: "",
        schema: [
            { name: "show_conditions", selector: { boolean: {} } },
            { name: "show_temperature", selector: { boolean: {} } },
        ],
    },
    ...computeActionsFormSchema({ actions, dropdowns }),
]);

@customElement(computeChipEditorComponentName("weather"))
export class WeatherChipEditor extends LitElement implements LovelaceChipEditor {
    @property({ attribute: false }) public hass?: HomeAssistant;

    @property({ attribute: false }) public options?: ChipsCardOptions;

    @state() private _config?: WeatherChipConfig;

    public setConfig(config: WeatherChipConfig): void {
        this._config = config;
    }

    private _computeLabel = (schema: HaFormSchema) => {
        const customLocalize = setupCustomlocalize(this.hass!);

        if (GENERIC_LABELS.includes(schema.name)) {
            return customLocalize(`editor.card.generic.${schema.name}`);
        }
        if (WEATHER_LABELS.includes(schema.name)) {
            return customLocalize(`editor.card.weather.${schema.name}`);
        }
        return this.hass!.localize(`ui.panel.lovelace.editor.card.generic.${schema.name}`);
    };

    protected render() {
        if (!this.hass || !this._config) {
            return nothing;
        }

        const schema = computeSchema({ dropdowns: this.options?.dropdowns });

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

import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import memoizeOne from "memoize-one";
import { fireEvent, HomeAssistant } from "../../../ha";
import setupCustomlocalize from "../../../localize";
import { computeActionsFormSchema } from "../../../shared/config/actions-config";
import { GENERIC_LABELS } from "../../../utils/form/generic-fields";
import { HaFormSchema } from "../../../utils/form/ha-form";
import { computeChipEditorComponentName } from "../../../utils/lovelace/chip/chip-element";
import { TemplateChipConfig } from "../../../utils/lovelace/chip/types";
import { LovelaceChipEditor } from "../../../utils/lovelace/types";
import { TEMPLATE_LABELS } from "../../template-card/template-card-editor";
import { ChipsCardOptions } from "../chips-card";
import { CardEditorOptions } from "../../../utils/lovelace/editor/types";

const computeSchema = memoizeOne(({ dropdowns }: CardEditorOptions): HaFormSchema[] => [
    { name: "entity", selector: { entity: {} } },
    {
        name: "icon",
        selector: { template: {} },
    },
    {
        name: "icon_color",
        selector: { template: {} },
    },
    {
        name: "picture",
        selector: { template: {} },
    },
    {
        name: "content",
        selector: { template: {} },
    },
    ...computeActionsFormSchema({ dropdowns }),
]);

@customElement(computeChipEditorComponentName("template"))
export class EntityChipEditor extends LitElement implements LovelaceChipEditor {
    @property({ attribute: false }) public hass?: HomeAssistant;

    @property({ attribute: false }) public options?: ChipsCardOptions;

    @state() private _config?: TemplateChipConfig;

    public setConfig(config: TemplateChipConfig): void {
        this._config = config;
    }

    private _computeLabel = (schema: HaFormSchema) => {
        const customLocalize = setupCustomlocalize(this.hass!);

        if (schema.name === "entity") {
            return `${this.hass!.localize(
                "ui.panel.lovelace.editor.card.generic.entity"
            )} (${customLocalize("editor.card.template.entity_extra")})`;
        }
        if (GENERIC_LABELS.includes(schema.name)) {
            return customLocalize(`editor.card.generic.${schema.name}`);
        }
        if (TEMPLATE_LABELS.includes(schema.name)) {
            return customLocalize(`editor.card.template.${schema.name}`);
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

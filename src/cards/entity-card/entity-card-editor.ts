import { html, nothing, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import memoizeOne from "memoize-one";
import { assert } from "superstruct";
import { fireEvent, LovelaceCardEditor } from "../../ha";
import setupCustomlocalize from "../../localize";
import { computeActionsFormSchema } from "../../shared/config/actions-config";
import { APPEARANCE_FORM_SCHEMA } from "../../shared/config/appearance-config";
import { MushroomBaseElement } from "../../utils/base-element";
import { GENERIC_LABELS } from "../../utils/form/generic-fields";
import { HaFormSchema } from "../../utils/form/ha-form";
import { stateIcon } from "../../utils/icons/state-icon";
import { loadHaComponents } from "../../utils/loader";
import { ENTITY_CARD_EDITOR_NAME } from "./const";
import { EntityCardConfig, entityCardConfigStruct } from "./entity-card-config";
import { CardEditorOptions } from "../../utils/lovelace/editor/types";

const computeSchema = memoizeOne(({ icon, dropdowns }: CardEditorOptions): HaFormSchema[] => [
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
    ...computeActionsFormSchema({ dropdowns }),
]);

@customElement(ENTITY_CARD_EDITOR_NAME)
export class EntityCardEditor extends MushroomBaseElement implements LovelaceCardEditor {
    @state() private options?: CardEditorOptions;

    @state() private _config?: EntityCardConfig;

    connectedCallback() {
        super.connectedCallback();
        void loadHaComponents();
    }

    public setConfig(config: EntityCardConfig): void {
        assert(config, entityCardConfigStruct);
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

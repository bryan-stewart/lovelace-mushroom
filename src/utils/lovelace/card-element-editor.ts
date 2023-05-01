import { customElement } from "lit/decorators.js";
import { LovelaceCardConfig, LovelaceCardEditor } from "../../ha";
import { computeCardComponentName } from "./card/card-element";
import { MushroomElementEditor } from "./element-editor";

@customElement("mushroom-card-element-editor")
export class MushroomCardElementEditor extends MushroomElementEditor<LovelaceCardConfig> {
    protected get configElementType(): string | undefined {
        return this.value?.type;
    }

    protected async getConfigElement(): Promise<LovelaceCardEditor | undefined> {
        const elClass = (await getCardElementClass(this.configElementType!)) as any;

        // Check if a GUI editor exists
        if (elClass && elClass.getConfigElement) {
            return elClass.getConfigElement();
        }

        return undefined;
    }
}

export const getCardElementClass = (type: string) =>
    customElements.get(computeCardComponentName(type));

import { customElement } from "lit/decorators.js";
import { computeChipComponentName } from "./chip/chip-element";
import { LovelaceChipConfig } from "./chip/types";
import { MushroomElementEditor } from "./element-editor";
import { LovelaceChipEditor } from "./types";

@customElement("mushroom-chip-element-editor")
export class MushroomChipElementEditor extends MushroomElementEditor<LovelaceChipConfig> {
    protected get configElementType(): string | undefined {
        return this.value?.type;
    }

    protected async getConfigElement(): Promise<LovelaceChipEditor | undefined> {
        const elClass = (await getChipElementClass(this.configElementType!)) as any;

        // Check if a GUI editor exists
        if (elClass && elClass.getConfigElement) {
            const configElement = await elClass.getConfigElement();
            if (this.options) {
                configElement.options = this.options;
            }
            return configElement;
        }

        return undefined;
    }
}

export const getChipElementClass = (type: string) =>
    customElements.get(computeChipComponentName(type));

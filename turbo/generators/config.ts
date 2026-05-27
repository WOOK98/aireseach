import { createPackageGenerator } from "./templates/package/generator";

import type { PlopTypes } from "@turbo/gen";

const generators = [createPackageGenerator];

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  generators.forEach((gen) => gen(plop));
}

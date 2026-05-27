import { blue } from "./colors/blue";
import { gray } from "./colors/gray";
import { green } from "./colors/green";
import { orange } from "./colors/orange";
import { red } from "./colors/red";
import { rose } from "./colors/rose";
import { stone } from "./colors/stone";
import { violet } from "./colors/violet";
import { yellow } from "./colors/yellow";

import type { ThemeColor, ThemeColors } from "../../types";

export const themes: Record<ThemeColor, ThemeColors> = {
  orange,
  blue,
  gray,
  green,
  red,
  rose,
  stone,
  violet,
  yellow,
};

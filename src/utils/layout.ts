import { literal, union } from "superstruct";

export type Layout = "vertical" | "horizontal" | "reverse" | "default";

export const layoutStruct = union([
    literal("horizontal"),
    literal("vertical"),
    literal("reverse"),
    literal("default"),
]);

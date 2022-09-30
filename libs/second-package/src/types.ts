import type { IstanbulPluginOptions } from "vite-plugin-istanbul";

export interface IstanbulOptions {
  cwd: string;
  include: string[];
  exclude: string[];
  extension: string[];
}

export interface AddonOptions {
  istanbul: Pick<
    IstanbulPluginOptions,
    "cwd" | "include" | "exclude" | "extension"
  >;
}

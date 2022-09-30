import istanbul from "vite-plugin-istanbul";
import type { Options } from "@storybook/core-common";

import { defaultExclude, defaultExtensions } from "./constants";
import type { AddonOptions } from "./types";

export const viteFinal = async (
  viteConfig: Record<string, any>,
  options: Options & AddonOptions
) => {
  viteConfig.plugins ||= [];
  viteConfig.plugins.push(
    istanbul({
      ...options.istanbul,
      include: Array.from(options.istanbul?.include || []),
      exclude: [
        options.configDir + "/**",
        ...defaultExclude,
        ...Array.from(options.istanbul?.exclude || []),
      ],
      extension: options.istanbul?.extension || defaultExtensions,
    })
  );

  return viteConfig;
};

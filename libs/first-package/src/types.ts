export interface IstanbulOptions {
  cwd: string;
  include: string | string[];
  exclude: string | string[];
  extension: string | string[];
}

export interface AddonOptions {
  istanbul: IstanbulOptions;
}

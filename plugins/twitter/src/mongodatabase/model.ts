export interface IUserConfig {
  readonly userid: string,
  readonly username: string,
  tweet: boolean,
  retweet: boolean,
  comment: boolean,
  text: boolean,
  screenshot: boolean,
  translation: boolean,
  extended: boolean,
  forwardMsg: boolean,
  css? :string,
  tag?: string,
  background?: string,
}

type TestEqual<T, U, Y=true, N=false> = (<G>() => G extends T ? 1 : 2) extends (<G>() => G extends U ? 1 : 2) ? Y : N;

export const InvalidUserConfig = ["userId", "username"] as const;

type MutableUserConfig = Omit<IUserConfig, (typeof InvalidUserConfig)[number]>;

type SwitchableUserConfig = {[Key in keyof MutableUserConfig]-?: MutableUserConfig[Key] extends boolean ? Key : never}[keyof MutableUserConfig];
// CHECK EQUALITY BELOW!!
export const SwitchableUserConfigKeys = ["comment", "content", "forwardMsg", "retweet", "screenshot", "text", "translation", "tweet"] as const;
type TestSwitchableEquality = TestEqual<SwitchableUserConfig, (typeof SwitchableUserConfigKeys)[number]>;

type CustomizableUserConfig = {[Key in keyof MutableUserConfig]-?: MutableUserConfig[Key] extends boolean ? never : Key}[keyof MutableUserConfig];
// CHECK EQUALITY BELOW!!
export const CustomizableUserConfigKeys = ["background", "css", "tag"] as const;
type TestCustomizableEquality = TestEqual<CustomizableUserConfig, (typeof CustomizableUserConfigKeys)[number]>;

const immutableUserConfigProperties = ["userid", "username"] as const;
export type ImmutableUserConfigProperties = (typeof immutableUserConfigProperties)[number];

export type UserConfigModifier = Partial<Omit<IUserConfig, ImmutableUserConfigProperties>>;

export const MAX_HISTORY_LENGTH = 200;

export interface IGroupConfig {
  readonly guildId: string,
  userConfigMap: {[userid: string]: IUserConfig},
  historyList: string[]
  currentIndex: number,
}

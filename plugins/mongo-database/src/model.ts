/**
 * This interface represents the user config for a twitter user
 */
export interface IUserConfig {
  readonly userid: string,
  readonly username: string,
  // receive streamed tweet based on type
  tweet: boolean,
  retweet: boolean,
  comment: boolean,
  // receive streamed tweet content
  text: boolean,
  screenshot: boolean,
  translation: boolean,
  extended: boolean,
  // not implemented
  forwardMsg: boolean,
  // custom translate content
  css?: string,
  tag?: string,
  background?: string,
}

// hard coded max length of history, ensures that the database will not become too huge
export const MAX_HISTORY_LENGTH = 200;

/**
 * This interface represents the group config for a group
 */
export interface IGroupConfig {
  readonly guildId: string,
  userConfigMap: { [userid: string]: IUserConfig },
  historyList: string[],
  // monotonically increase index
  currentIndex: number,
}

type TestEqual<T, U, Y=true, N=false> = (<G>() => G extends T ? 1 : 2) extends (<G>() => G extends U ? 1 : 2) ? Y : N;

export const InvalidUserConfig = ["userid", "username"] as const;

type MutableUserConfig = Omit<IUserConfig, (typeof InvalidUserConfig)[number]>;

type SwitchableUserConfig = {[Key in keyof MutableUserConfig]-?: MutableUserConfig[Key] extends boolean ? Key : never}[keyof MutableUserConfig];
// CHECK EQUALITY BELOW!!
export const SwitchableUserConfigKeys = ["comment", "extended", "forwardMsg", "retweet", "screenshot", "text", "translation", "tweet"] as const;
type TestSwitchableEquality = TestEqual<SwitchableUserConfig, (typeof SwitchableUserConfigKeys)[number]>;

type CustomizableUserConfig = {[Key in keyof MutableUserConfig]-?: MutableUserConfig[Key] extends boolean ? never : Key}[keyof MutableUserConfig];
// CHECK EQUALITY BELOW!!
export const CustomizableUserConfigKeys = ["background", "css", "tag"] as const;
type TestCustomizableEquality = TestEqual<CustomizableUserConfig, (typeof CustomizableUserConfigKeys)[number]>;

const immutableUserConfigProperties = ["userid", "username"] as const;
export type ImmutableUserConfigProperties = (typeof immutableUserConfigProperties)[number];

export type UserConfigModifier = Partial<Omit<IUserConfig, ImmutableUserConfigProperties>>;

/**
 * This interface represents a succeed execution
 */
export interface Ok<T> {
  state: true,
  content: T,
}

/**
 * This interface represents a failed execution
 */
export interface Err<T> {
  state: false,
  content: T,
}

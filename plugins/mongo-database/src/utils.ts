import { Err, IGroupConfig, IUserConfig, Ok } from "./model"

/**
 * Make a new group config for current group
 * @param guildId id of group
 * @returns a new group config object
 */
export function makeGroupConfig(guildId: string): IGroupConfig {
  return {
    guildId,
    userConfigMap: {},
    historyList: [],
    currentIndex: 0,
  }
}

/**
 * Make a new user config for current twitter user
 * @param userid twitter user id
 * @param username twitter user name
 * @returns a new user config object
 */
export function makeUserConfig(userid: string, username: string): IUserConfig {
  return {
    userid, username,
    tweet: true,
    retweet: true,
    comment: true,
    text: true,
    screenshot: true,
    translation: true,
    extended: true,
    forwardMsg: false,
  }
}

/**
 * Make a ok object wrapping the given content
 * @param content succeed result
 * @returns ok object containing the given content
 */
export function ok<T>(content: T): Ok<T> {
  return {
    state: true,
    content,
  }
}

/**
 * Make a err object wrapping the given content
 * @param content failed result
 * @returns err object containing the given content
 */
export function err<T>(content: T): Err<T> {
  return {
    state: false,
    content,
  }
}

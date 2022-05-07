import { IGroupConfig, IUserConfig } from "./model"

export function makeGroupConfig(guildId: string): IGroupConfig {
  return {
    guildId,
    userConfigMap: {},
    historyList: [],
    currentIndex: 0,
  }
}

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

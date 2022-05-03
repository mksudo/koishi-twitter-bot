import { ScreenshotOptions } from "puppeteer-core";

/**
 * Represents the text block on tweet page
 */
export interface ITweetText {
  type: "text",
  content: string,
}
/**
 * Represents the emoji block on tweet page
 */
export interface ITweetEmoji {
  type: "emoji",
  content: string,
}
/**
 * Represents the link block on tweet page
 */
export interface ITweetLink {
  type: "link",
  content: string,
}
/**
 * Represents the hashtag block on tweet page
 */
export interface ITweetHashtag {
  type: "hashtag",
  content: string,
}
// all tweet components
export type ITweetComponent = ITweetText | ITweetEmoji | ITweetLink | ITweetHashtag;
/**
 * Represents the photo entities on tweet page
 */
export interface ITweetPhoto {
  type: "photo",
  url: string,
}
/**
 * Represents the video entities on tweet page
 */
export interface ITweetVideo {
  type: "video",
  // no available actual video url
  posterUrl: string,
}
/**
 * Represents the quoted tweet entities on tweet page
 */
export interface IQuotedTweet {
  type: "tweet",
  tweet: ITweet,
}
/**
 * Represents the card entities on tweet page
 */
export interface ITweetCard {
  type: "card",
  link: string,
  media: ITweetPhoto,
  detail: ITweetComponent[],
}
/**
 * Represents the poll entities on tweet page
 */
export interface ITweetPoll {
  type: "poll",
  choices: ITweetComponent[][],
}
// tweet extended entities
export type ITweetEntity = ITweetPhoto | ITweetVideo | IQuotedTweet | ITweetCard | ITweetPoll;
/**
 * Represents the tweet page
 */
export interface ITweet {
  elements: ITweetComponent[],
  entities?: ITweetEntity[],
}
/**
 * Represents the verification information for twitter login
 */
export interface ITwitterLoginInfo {
  username: string,
  password: string,
  phone: string,
}

export interface IScreenshotPageResult {
  options: ScreenshotOptions,
  tweetList: ITweet[],
}

export interface IScreenshotResult {
  screenshotBase64: string,
  tweetList: ITweet[],
}

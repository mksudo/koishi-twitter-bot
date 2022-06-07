import twemoji from "twemoji";
import emojiRegex from "emoji-regex";
import { extractEntitiesWithIndices } from "twitter-text";
import { Err, ITweetEmoji, ITweetText, Ok } from "./model";
import { ITweetComponent } from "./model";


export function ok<T>(content: T): Ok<T> {
  return {
    state: true,
    content,
  }
}

export function err<T>(content: T): Err<T> {
  return {
    state: false,
    content,
  }
}

/**
 * Get a randomized delay in miliseconds within the given interval
 * @param min minimum delay in milisecond
 * @param max maximum delay in milisecond
 * @returns randomized delay time between minimum and maximum
 */
export function getRandomDelay(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Wait for a given amount of time
 * @param miliseconds time to wait for in milisecond
 */
export function waitForTime(miliseconds: number) {
  return new Promise(resolve => setTimeout(resolve, miliseconds));
}

/**
 * Represents the translation block for tweet or extended entity
 */
export type MinorTranslationBlock = {
  type: "main",
  content: ITweetComponent[],
} | {
  type: "entity",
  index: number | string,
  content: ITweetComponent[],
}

/**
 * Represents the translation block for tweet and extended entity
 */
export type MajorTranslationBlock = {
  index: number,
  content: MinorTranslationBlock[],
}

/**
 * Parse the given tweet component to string
 * @param tweetComponent the tweet component to be parsed to string
 * @returns the parsed string
 */
function tweetComponentToString(tweetComponent: ITweetComponent): string {
  switch (tweetComponent.type) {
    case "emoji":
      return twemoji.convert.fromCodePoint(tweetComponent.content);
    default:
      return tweetComponent.content;
  }
}

/**
 * Parse the given tweet components to string
 * @param tweetComponentList the list of tweet component to be parsed to string
 * @returns the parsed string
 */
export function tweetComponentListToString(tweetComponentList: ITweetComponent[]): string {
  return tweetComponentList.map(tweetComponent => tweetComponentToString(tweetComponent)).join("");
}

/**
 * Parse the given translation text to translation blocks to be inserted
 * @param text the translation text
 * @returns translation blocks seperated by articles in a tweet thread
 */
export function parseMajorTranslationBlock(text: string): MajorTranslationBlock[] {
  const majorIndexRegex = /\[(?<index>\d+)\]/gm;
  const result: MajorTranslationBlock[] = [];
  const majorBlockTranslation = text.split(majorIndexRegex);

  if (majorBlockTranslation[0])
    return [{ index: 1, content: parseMinorTranslationBlock(majorBlockTranslation[0]) }];
  for (let index = 1; index < majorBlockTranslation.length - 1; index += 2) {
    result.push({
      index: parseInt(majorBlockTranslation[index]),
      content: parseMinorTranslationBlock(majorBlockTranslation[index + 1])
    });
  }
  return result;
}

/**
 * Parse translation text to tweet entities components
 * @param text the translation text of one tweet article
 * @returns translation blocks seperated by main component and tweet entities
 */
export function parseMinorTranslationBlock(text: string): MinorTranslationBlock[] {
  const minorIndexRegex = /<(?<index>\d+.*\d*)>/gm;
  const result: MinorTranslationBlock[] = [];
  const minorBlockTranslation = text.split(minorIndexRegex);

  if (minorBlockTranslation[0]) result.push({ type: "main", content: parseTwitterEntities(minorBlockTranslation[0]) });
  for (let index = 1; index < minorBlockTranslation.length - 1; index += 2) {
    result.push({
      type: "entity",
      index: parseInt(minorBlockTranslation[index]).toString() == minorBlockTranslation[index] ?
        parseInt(minorBlockTranslation[index]) : minorBlockTranslation[index],
      content: parseTwitterEntities(minorBlockTranslation[index + 1])
    });
  }
  return result;
}

/**
 * Parse translation text and extract tweet entities
 * @param text the translation text to extract entities from
 * @returns tweet components
 */
export function parseTwitterEntities(text: string): ITweetComponent[] {
  const entityBlockIndex = extractEntitiesWithIndices(text);
  const result: ITweetComponent[] = [];

  let startIndex = 0;
  for (const entityBlock of entityBlockIndex) {
    if (entityBlock.indices[0] != startIndex)
      result.push(...parseSimpleText(text.substring(startIndex, entityBlock.indices[0])));
    if ("hashtag" in entityBlock)
      result.push({ type: "hashtag", content: text.substring(entityBlock.indices[0], entityBlock.indices[1]) });
    else if ("url" in entityBlock)
      result.push({ type: "link", content: text.substring(entityBlock.indices[0], entityBlock.indices[1]) });
    else if ("screenName" in entityBlock)
      result.push({ type: "mention", content: text.substring(entityBlock.indices[0], entityBlock.indices[1]) });
    else
      result.push(...parseSimpleText(text.substring(entityBlock.indices[0], entityBlock.indices[1])));
    startIndex = entityBlock.indices[1];
  }

  if (startIndex != text.length - 1)
    result.push(...parseSimpleText(text.substring(startIndex)));

  return result;
}

/**
 * Parse the translation text to seperate emoji and text
 * @param text the translation text consist of text and emoji
 * @returns parsed text and emoji blocks
 */
export function parseSimpleText(text: string): (ITweetText | ITweetEmoji)[] {
  const emojiBlockRegex = emojiRegex();
  const result: (ITweetText | ITweetEmoji)[] = [];
  const matchedEmojiList = [...text.matchAll(emojiBlockRegex)];

  let startIndex = 0;
  for (const matchedEmoji of matchedEmojiList) {
    if (matchedEmoji.index != startIndex)
      result.push({ type: "text", content: text.substring(startIndex, matchedEmoji.index) });
    result.push({ type: "emoji", content: twemoji.convert.toCodePoint(matchedEmoji[0])});
    startIndex = matchedEmoji.index + matchedEmoji[0].length;
  }

  if (startIndex != text.length - 1) result.push({ type: "text", content: text.substring(startIndex) });

  return result;
}

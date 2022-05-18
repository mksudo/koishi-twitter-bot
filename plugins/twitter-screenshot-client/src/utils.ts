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
 * Split a text according to the given regular expression and return the parsed list
 * @param text the text to be splited
 * @param regex the regular expression to split the text
 * @param parser parser to be called on every splitted part of the text
 * @returns the parsed result
 */
function splitText<T>(text: string, regex: RegExp, parser: (segment: string, step: number, matched?: RegExpMatchArray) => T): T[] {
  const result: T[] = [];

  let step = 0;
  let startIndex = 0;

  for (const matchedSegment of text.matchAll(regex)) {
    // parse preceeding text component
    if (matchedSegment.index != startIndex) {
      result.push(parser(text.substring(startIndex, matchedSegment.index), step, undefined));
    }

    step += 1;
    result.push(parser(matchedSegment[0], step, matchedSegment));

    startIndex = matchedSegment.index + matchedSegment[0].length;
  }

  // parse text block at the end
  if (startIndex != text.length - 1) {
    result.push(parser(text.substring(startIndex), step + 1, undefined));
  }

  return result;
}

/**
 * Parse the given text block to text component or emoji component, convert emoji to twemoji code point for webpage usage
 * @param text the text to be parsed
 * @returns the parsed result
 */
function parseEmojiToCodePoint(text: string): ITweetComponent[] {
  return splitText(text, emojiRegex(), (segment, _, matchedSegment): ITweetComponent => {
    if (matchedSegment) {
      return {
        type: "emoji",
        content: twemoji.convert.toCodePoint(segment),
      };
    }
    else {
      return {
        type: "text",
        content: segment,
      };
    }
  })
}

/**
 * Parse the translation block to main block for tweet and entity block for extended entities
 * @param text the text to be parsed
 * @returns the parsed minor translation block
 */
export function parseMinorTranslation(text: string): MinorTranslationBlock[] {
  const result: MinorTranslationBlock[] = [];
  const segments = text.split(/<(?<index>\d+.*\d*)>/gm);

  if (segments[0] != "") {
    result.push({
      type: "main",
      content: parseEmojiToCodePoint(segments[0]),
    });
  }

  // segments are matched by pairs: index, content
  for (let index = 1; index < segments.length - 1; index += 2) {
    result.push({
      type: "entity",
      index: parseInt(segments[index]).toString() == segments[index] ? parseInt(segments[index]) : segments[index],
      content: parseEmojiToCodePoint(segments[index + 1]),
    });
  }

  return result;
}

/**
 * Parse the given text to translation blocks for webpage usage
 * @param text the text to be parsed
 * @returns the parsed major translation block
 */
export function parseMajorTranslation(text: string): MajorTranslationBlock[] {
  const result: MajorTranslationBlock[] = [];
  const majorIndexRegex = /\[(?<index>\d+)\]/gm;
  const translation = text.split(majorIndexRegex);

  if (translation[0] != "") {
    return [{
      index: 1,
      content: parseMinorTranslation(translation[0]),
    }];
  }

  // segments are matched by pairs: index, content
  for (let index = 1; index < translation.length - 1; index += 2) {
    result.push({
      index: parseInt(translation[index]),
      content: parseMinorTranslation(translation[index + 1])
    });
  }

  return result;
}


export function parseMajorTranslationlock(text: string): MajorTranslationBlock[] {
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

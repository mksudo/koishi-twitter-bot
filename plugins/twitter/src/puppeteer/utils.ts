import twemoji from "twemoji";
import emojiRegex from "emoji-regex";
import { ITweetComponent } from "./model";


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
      result.push(parser(text.substring(startIndex, matchedSegment.index), step, matchedSegment));
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
  const segments = text.split(/(?<index><\d+.*\d*>)/gm);

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

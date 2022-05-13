import fs from "fs";
import twemoji from "twemoji";
import fetch from "node-fetch";
import { segment } from "koishi";
import { IScreenshotResult, ITweet, ITweetComponent } from "koishi-plugin-twitter-screenshot-client";
import { IUserConfig } from "koishi-plugin-mongo-database";
import BaiduTranslationClient from "koishi-plugin-baidu-translate";


export const NOOP = () => { };

/**
 * Download image from given url
 * @param url url of image
 * @param filePath file path the image should be downloaded to
 */
export async function downloadImage(url: string, filePath: string) {
  const response = await fetch(url);
  const data = await response.blob();

  await fs.promises.writeFile(filePath, data.stream());
}

/**
 * Save given content
 * @param content content to be saved
 * @param path path the content should be saved to
 */
export async function saveToFile(content: segment.Parsed, path: string) {
  if (content.type == "text") {
    await fs.promises.writeFile(path, content.data["content"]);
  } else if (content.type == "image") {
    await downloadImage(content.data["url"], path);
  } else {
    throw new Error("not implemented");
  }
}


/**
 * Parse tweet components to string
 * @param components components to be parsed to string
 * @returns parsed result as string
 */
function parseTweetComponentList(components: ITweetComponent[]) {
  let result = "";
  for (const component of components) {
    switch (component.type) {
      case "emoji":
        result += segment("text", { content: twemoji.convert.fromCodePoint(component.content) });
        break;
      default:
        result += segment("text", { content: component.content });
        break;
    }
  }

  return result;
}


/**
 * Parse given tweet to string
 * @param tweet tweet to be parsed to string
 * @param userConfig current user config
 * @returns parsed string
 */
async function parseTweetToSegments(tweet: ITweet, userConfig: IUserConfig, translator: BaiduTranslationClient): Promise<string> {
  const result: string[] = [];

  if (userConfig.text) {
    const text = parseTweetComponentList(tweet.elements);
    result.push(text);
    if (userConfig.translation) {
      const translateResult = await translator.translate(text);
      result.push(segment("text", { content: "[TRANSLATION]\n" }) + translateResult.content);
    }
  }

  if (userConfig.extended && tweet.entities) {
    for (const element of tweet.entities) {
      let currentBlock: string;
      switch (element.type) {
        case "photo":
          currentBlock = segment("text", { content: "[PHOTO]\n" });
          currentBlock += segment("image", { url: element.url });
          result.push(currentBlock);
          break;
        case "video":
          currentBlock = segment("text", { content: "[VIDEO]\n" });
          currentBlock += segment("image", { url: element.posterUrl });
          result.push(currentBlock);
          break;
        case "poll":
          currentBlock = segment("text", { content: "[POLL]\n" });
          currentBlock += segment("text", {
            content: element.choices
              .map((choice, index) => `[${index}]: ${parseTweetComponentList(choice)}`)
              .join("\n"),
          });
          result.push(currentBlock);
          break;
        case "card":
          currentBlock = segment("text", { content: "[CARD]\n" });
          currentBlock += segment("text", { content: `[LINK] ${element.link}\n` });
          currentBlock += segment("text", { content: "[MEDIA]\n" }) +
            segment("image", { url: element.media.url }) +
            segment("text", { content: "\n" });
          currentBlock += segment("text", { content: `[DETAIL]\n` }) +
            segment("text", { content: parseTweetComponentList(element.detail) });
          result.push(currentBlock);
          break;
        case "tweet":
          currentBlock = segment("text", { content: "[TWEET]\n" });
          currentBlock = await parseTweetToSegments(element.tweet, userConfig, translator);
          result.push(currentBlock);
          break;
      }
    }
  }

  return result.join("\n");
}

/**
 * Parse the given screenshot result to string
 * @param screenshotResult screenshot result of current page
 * @param userConfig current user config
 * @returns parsed string of screenshot result
 */
export async function parseScreenshotResultToSegments(screenshotResult: IScreenshotResult, userConfig: IUserConfig, translator: BaiduTranslationClient) {
  let result: string = "";

  if (userConfig.screenshot) {
    result = segment("image", { url: `base64://${screenshotResult.screenshotBase64}` });
  }

  if (screenshotResult.tweetList.length == 1) {
    return result + await parseTweetToSegments(screenshotResult.tweetList[0], userConfig, translator);
  } else {
    const textList = await Promise.all(screenshotResult.tweetList.map(async (tweet, index) => `[${index + 1}]: ${await parseTweetToSegments(tweet, userConfig, translator)}`))
    return textList.join("\n");
  }
}

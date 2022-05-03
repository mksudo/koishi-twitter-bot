import fs from "fs";
import twemoji from "twemoji";
import { segment } from "koishi";
import { IScreenshotResult, ITweet, ITweetComponent } from "./puppeteer";
import { IUserConfig } from "./mongodatabase";


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
    await downloadImage(content.data["content"], path);
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
function parseTweetToSegments(tweet: ITweet, userConfig: IUserConfig): string {
  const result: string[] = [];

  if (userConfig.text) {
    result.push(parseTweetComponentList(tweet.elements));
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
          currentBlock = parseTweetToSegments(element.tweet, userConfig);
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
export async function parseScreenshotResultToSegments(screenshotResult: IScreenshotResult, userConfig: IUserConfig) {
  const result: string[] = [];

  if (userConfig.screenshot) {
    result.push(segment("image", { url: `base64://${screenshotResult.screenshotBase64}` }));
  }

  if (screenshotResult.tweetList.length == 1) {
    return parseTweetToSegments(screenshotResult.tweetList[0], userConfig);
  } else {
    return screenshotResult.tweetList.map((tweet, index) => `[${index + 1}]: ${parseTweetToSegments(tweet, userConfig)}`).join("\n");
  }
}

import fs from "fs";
import twemoji from "twemoji";
import fetch from "node-fetch";
import { segment } from "koishi";
import { IScreenshotResult, ITweet, ITweetComponent, ITweetEntity } from "koishi-plugin-twitter-screenshot-client";
import { IUserConfig } from "koishi-plugin-mongo-database";
import BaiduTranslationClient from "koishi-plugin-baidu-translate";
import { IParsedNode } from "./model";


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

function parseTweetComponent(tweetComponent: ITweetComponent): IParsedNode {
  if (tweetComponent.type == "emoji")
    return { needTranslation: false, content: segment("text", { content: twemoji.convert.fromCodePoint(tweetComponent.content) }) };
  return { needTranslation: true, content: segment("text", { content: tweetComponent.content }) };
}

function parseTweetEntity(tweetComponent: ITweetEntity): IParsedNode {
  const node: IParsedNode = { needTranslation: false, content: [] };
  // tweet type entity should not be passed to this function
  switch (tweetComponent.type) {
    case "photo":
      (node.content as IParsedNode[]).push({ needTranslation: false, content: segment("text", { content: "PHOTO: \n" }) });
      (node.content as IParsedNode[]).push({ needTranslation: false, content: segment("image", { url: tweetComponent.url }) });
      return node;
    case "video":
      (node.content as IParsedNode[]).push({ needTranslation: false, content: segment("text", { content: "VIDEO: \n" }) });
      (node.content as IParsedNode[]).push({ needTranslation: false, content: segment("image", { url: tweetComponent.posterUrl }) });
      return node;
    case "poll":
      (node.content as IParsedNode[]).push({ needTranslation: true, content: segment("text", { content: "POLL: \n" }) });
      tweetComponent.choices.forEach((choice, index) => {
        (node.content as IParsedNode[]).push({ needTranslation: true, content: `${index}: `});
        (node.content as IParsedNode[]).push({ needTranslation: true, content: choice.map(component => parseTweetComponent(component)) });
        if (index != tweetComponent.choices.length - 1) (node.content as IParsedNode[]).push({ needTranslation: true, content: "\n" });
      });
      node.needTranslation = true;
      return node;
    case "card":
      (node.content as IParsedNode[]).push({ needTranslation: true, content: segment("text", { content: "CARD: \n" }) });
      (node.content as IParsedNode[]).push({ needTranslation: false, content: segment("text", { content: `LINK: ${tweetComponent.link}` }) });
      (node.content as IParsedNode[]).push({ needTranslation: false, content: segment("text", { content: "MEDIA: \n" }) });
      (node.content as IParsedNode[]).push({ needTranslation: false, content: segment("image", { url: tweetComponent.media.url }) });
      (node.content as IParsedNode[]).push({ needTranslation: true, content: segment("text", { content: "DETAIL: \n" }) });
      (node.content as IParsedNode[]).push({ needTranslation: true, content: tweetComponent.detail.map(component => parseTweetComponent(component)) });
      node.needTranslation = true;
      return node;
  }
}

function parseTweet(tweet: ITweet, userConfig: IUserConfig, index?: number) {
  const node: IParsedNode = { needTranslation: false, content: [] };

  if (index != undefined) (node.content as IParsedNode[]).push({ needTranslation: true, content: `${index + 1}: \n` });

  if (userConfig.text) {
    (node.content as IParsedNode[]).push({ needTranslation: true, content: tweet.elements.map(component => parseTweetComponent(component)) });
    (node.content as IParsedNode[]).push({ needTranslation: true, content: "\n" });
    node.needTranslation = true;
  }
  if (userConfig.extended && tweet.entities) {
    tweet.entities.forEach((entity, index) => {
      if (entity.type == "tweet") {
        (node.content as IParsedNode[]).push({ needTranslation: true, content: segment("text", { content: "TWEET: \n" }) });
        (node.content as IParsedNode[]).push(parseTweet(entity.tweet, userConfig));
      }
      else (node.content as IParsedNode[]).push(parseTweetEntity(entity));
      if (index != tweet.entities.length - 1) (node.content as IParsedNode[]).push({ needTranslation: true, content: "\n" });
    });
    node.needTranslation = true;
  }
  return node;
}

function getTranslationText(node: IParsedNode): string {
  if (node.needTranslation) {
    if (typeof node.content == "object")
      return node.content.map(node => getTranslationText(node)).join("");
    return node.content;
  }
}

export function getParsedText(node: IParsedNode): string {
  if (typeof node.content == "object")
    return node.content.map(node => getParsedText(node)).join("");
  return node.content;
}

export async function parseScreenshotResult(screenshotResult: IScreenshotResult, userConfig: IUserConfig, translator: BaiduTranslationClient) {
  const node: IParsedNode = { needTranslation: false, content: [] };

  if (userConfig.screenshot) {
    (node.content as IParsedNode[]).push({ needTranslation: false, content: segment("image", { url: `base64://${screenshotResult.screenshotBase64}` }) });
    (node.content as IParsedNode[]).push({ needTranslation: false, content: "\n" });
  }

  if (screenshotResult.tweetList.length == 1) {
    (node.content as IParsedNode[]).push(parseTweet(screenshotResult.tweetList[0], userConfig));
    (node.content as IParsedNode[]).push({ needTranslation: false, content: "\n" });
    node.needTranslation = true;
  } else {
    screenshotResult.tweetList.forEach((tweet, index) => {
      (node.content as IParsedNode[]).push(parseTweet(tweet, userConfig, index));
      (node.content as IParsedNode[]).push({ needTranslation: true, content: "\n" });
    })
    node.needTranslation = true;
  }

  if (userConfig.translation) {
    const translationText = getTranslationText(node);
    if (translationText.trim()) {
      const translateResult = await translator.translate(translationText);
      (node.content as IParsedNode[]).push({ needTranslation: false, content: "TRANSLATION: \n" });
      (node.content as IParsedNode[]).push({ needTranslation: false, content: translateResult.content });
    }
  }

  return node;
}

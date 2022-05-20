import fs from "fs";
import { Context, Logger, Schema, Service } from 'koishi';
import puppeteer, { Browser, Page, Viewport } from "puppeteer-core";
import { retryDecorator } from "ts-retry-promise";
import { IUserConfig } from "koishi-plugin-mongo-database";
import { IScreenshotResult, ITweet, ITweetComponent, ITweetEntity, IScreenshotPageResult } from './model';
import { err, getRandomDelay, MajorTranslationBlock, ok, parseMajorTranslationBlock, waitForTime } from './utils';

export * from "./model";

declare module "koishi" {
  namespace Context {
    interface Services {
      twitterScreenshotClient: TwitterScreenshotClient,
    }
  }
}

export const name = 'twitterScreenshotClient';
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.67 Safari/537.36";

const LOGGER = new Logger(name);
LOGGER.level = 3;

/**
 * This class implements the functionality to take screenshot of tweets and add translation to tweets
 */
class TwitterScreenshotClient extends Service {
  protected client: Browser;
  // lock page so that the order of pages will not get messed up
  protected occupied: boolean;

  constructor(ctx: Context, public config: TwitterScreenshotClient.Config) {
    super(ctx, name);
    this.occupied = false;
  }

  protected async start() {
    LOGGER.debug(`puppteer client starting with config ${JSON.stringify(this.config)}`);
    this.client = await puppeteer.launch({
      product: "chrome",
      executablePath: this.config.executablePath || require("chrome-finder")(),
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    LOGGER.debug(`puppteer client successfully started`);
  }

  protected async stop() {
    await this.client?.close().catch(LOGGER.warn);
    LOGGER.debug(`puppteer client stopped`);
  }

  /**
   * Open a new page in default browser context
   * @returns a new page
   */
  async getPage() {
    try {
      const page = await this.client.newPage();
      await page.setUserAgent(USER_AGENT);
      return page;
    } catch {
      await this.client?.close().catch(LOGGER.warn);
      await this.start();
      const page = await this.client.newPage();
      await page.setUserAgent(USER_AGENT);
      return page;
    }
  }

  /**
   * Wait until the current order lock is acquired
   */
  protected async occupy() {
    while (this.occupied) {
      await waitForTime(30);
    }
    this.occupied = true;
  }

  /**
   * Try to visit the given url on the given page, throw errors if goto failed
   * @param page the page to visit the url on
   * @param url the url to be visited
   */
  protected async gotoUrl(page: Page, url: string) {
    LOGGER.debug(`start goto ${url}`);
    const retryGoto = retryDecorator(page.goto.bind(page), { retries: 3, delay: 1000, timeout: "INFINITELY" });

    const result: puppeteer.HTTPResponse = await retryGoto(url, {
      waitUntil: "domcontentloaded",
    });

    if (result.ok()) {
      await page.waitForSelector("article");
      LOGGER.debug("goto succeed");
    } else {
      throw new Error(`goto failed with code ${result.status()}`);
    }

    LOGGER.debug(`end goto ${url}`);
  }

  /**
   * Set viewport of current page to include everything
   * @param page the page to set the view port
   */
  protected async setViewPort(page: Page) {
    const maxViewPort = await page.evaluate<() => Viewport>(() => {
      return {
        height: Math.max(document.body.scrollHeight, document.body.offsetHeight),
        width: Math.max(document.body.scrollWidth, document.body.offsetWidth)
      };
    });
    await page.setViewport(maxViewPort);
  }

  /**
   * Determines if current twitter is not logged in
   * @param page the page to determine if login is required
   * @returns if login is required
   */
  protected async needLogin(page: Page) {
    const loginButton = await page.$(`a[href="/login"]`);
    return loginButton !== null;
  }

  /**
   * Try to login to twitter based on provided user info
   * @param page the page to login to twitter
   */
  protected async twitterLogin(page: Page) {
    LOGGER.debug("start twitter login");

    const loginButton = await page.$(`a[href="/login"]`);
    await loginButton.click();
    await page.waitForNetworkIdle();

    LOGGER.debug("start typing user name");

    const usernameInput = await page.$("input");
    await usernameInput.type(this.config.twitterUserName, { delay: getRandomDelay(100, 300) });
    await page.waitForTimeout(getRandomDelay(1000, 2000));

    LOGGER.debug("end typing user name");

    let nextButton = (await page.$$("div[role=button]"))[2];
    await nextButton.click();
    await page.waitForNetworkIdle();

    LOGGER.debug("start typing user password");

    const passwordInput = (await page.$$("input"))[1];
    await passwordInput.type(this.config.twitterPassword, { delay: getRandomDelay(100, 300) });
    await page.waitForTimeout(getRandomDelay(1000, 2000));

    LOGGER.debug("end typing user password");

    nextButton = (await page.$$("div[role=button]"))[2];
    await nextButton.click();
    await page.waitForSelector("input");

    // handle possible phone verification on new login location
    // TODO: fix determine order issue
    const verificationInput = await page.$("input");

    if (verificationInput) {
      LOGGER.debug("verification required, start typing phone number");

      await verificationInput.type(this.config.twitterPhoneNumber, { delay: getRandomDelay(100, 300) });
      await page.waitForTimeout(getRandomDelay(1000, 2000));

      LOGGER.debug("end typing phone number");

      nextButton = (await page.$$("div[role=button]"))[1];
      await nextButton.click();
    }

    await page.waitForSelector("article");

    LOGGER.debug("end twitter login");
  }

  /**
   * Wait for all images on page to load
   * @param page the page to wait for loading
   */
  protected async waitForImageLoading(page: Page) {
    const retryWaitForImageLoading = retryDecorator(async () => {
      let loaded = false;
      const imageList = await page.$$("img");

      for (const image of imageList) {
        const completeAttribute = await image.getProperty("complete");
        loaded = await completeAttribute.jsonValue<boolean>();
        if (!loaded) break;
      }

      if (!loaded) throw new Error("images are still loading");
    }, {
      retries: 5,
      delay: 1000,
    });

    await retryWaitForImageLoading().catch(LOGGER.warn);
  }

  /**
   * Try to expand all collapsed content on page
   * @param page the page to expand all collapsed content
   */
  protected async expandCollapsedContent(page: Page) {
    const articleList = await page.$$("article");
    for (const article of articleList) {
      const presentation = await article.$("div[role=presentation]");
      if (presentation) {
        const changeSettinghref = await presentation.$(`a[href="/settings/content_you_see"]`);
        if (changeSettinghref) {
          const expandButton = await presentation.$("div[role=button]");
          await expandButton.click();
        }
      }
    }
  }

  /**
   * Try to make a new page and visit the given tweet url
   * @param twitterUrl url of tweet
   * @returns ok page or err message
   */
  async goto(twitterUrl: string) {
    const page = await this.getPage();
    try {
      await this.gotoUrl(page, twitterUrl);
      await this.occupy();

      LOGGER.debug(`client occupied for ${twitterUrl}`);

      await page.bringToFront();

      if (await this.needLogin(page)) {
        await this.twitterLogin(page);
        await this.gotoUrl(page, twitterUrl);
      }

      await this.setViewPort(page);
      await page.waitForTimeout(1000);

      LOGGER.debug("start expanding content");
      await this.expandCollapsedContent(page);
      LOGGER.debug("end expanding content");
      await page.waitForTimeout(1000);

      LOGGER.debug("start waiting for image");
      await this.waitForImageLoading(page);
      LOGGER.debug("end waiting for image");

      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });

      this.occupied = false;
      return ok(page);
    } catch (error) {
      this.occupied = false;
      return err(`${error}`);
    }
  }

  /**
   * Try to take a screenshot of the given tweet
   * @param page the page to take screenshot
   * @returns screenshot result
   */
  async screenshot(page: Page) {
    try {
      LOGGER.debug("start taking screenshot");

      const pageResult: IScreenshotPageResult = (await page.evaluate<() => Promise<IScreenshotPageResult>>(
        async () => {
          /**
           * Parse all tweet components in the given tweet field
           * @param componentField the direct parent element on the page of all tweet components
           * @returns the array of all parsed components, empty array if the given field is null
           */
          const parseComponentField: (componentField: Element) => ITweetComponent[] = (componentField) => {
            const result: ITweetComponent[] = [];
            if (!(componentField)) return result;
            for (const child of componentField.children) {
              switch (child.tagName) {
                case "IMG":
                  const emojiSrc = child.getAttribute("src");
                  if (emojiSrc) {
                    result.push({
                      type: "emoji",
                      content: emojiSrc.substring(emojiSrc.lastIndexOf("/") + 1),
                    });
                  }
                  break;
                case "SPAN":
                  const isHashtag = child.querySelector("a") !== null;
                  result.push({
                    type: isHashtag ? "hashtag" : "text",
                    content: child.textContent,
                  });
                  break;
                case "A":
                  result.push({
                    type: "link",
                    content: child.textContent,
                  });
                  break;
                default:
                  result.push({
                    type: "text",
                    content: child.textContent,
                  });
                  break;
              }
            }

            return result;
          };

          /**
           * Parse all tweet extended entities in the given tweet field
           * @param extendedField the direct parent element on the page of all tweet extended entities
           * @returns the array of all parsed extended entities, empty array if the given field is null
           */
          const parseExtendedField: (extendedField: Element) => ITweetEntity[] = (extendedField) => {
            const result: ITweetEntity[] = [];
            if (!(extendedField)) return result;

            const photoList = extendedField.querySelectorAll("div[data-testid=tweetPhoto]");
            const video = extendedField.querySelector("div[data-testid=videoPlayer]");
            const quotedTweet = extendedField.querySelector("div[role=link][tabindex]");
            const card = extendedField.matches(`div[data-testid="card.wrapper"]`) && extendedField || extendedField.querySelector(`div[data-testid="card.wrapper"]`);

            if (quotedTweet) {
              result.push({
                type: "tweet",
                tweet: {
                  elements: parseComponentField(quotedTweet.querySelector("div[lang]")),
                  entities: parseExtendedField(
                    quotedTweet.children[0]?.children?.length == 3 ? quotedTweet.children[0]?.children[2] : null
                  ),
                }
              });
            } else if (video) {
              result.push({
                type: "video",
                posterUrl: video.querySelector("video")?.poster || "",
              });
            } else if (card) {
              // polls are also wrapped in a card
              const isPoll = card.querySelector("div[data-testid=cardPoll]") !== null;
              if (isPoll) {
                // completed polls use different elements comparing to ongoing polls
                const isCompletedPoll = card.querySelector("div[role=radiogroup]") === null;
                const choiceComponentList = [];
                const choiceList = isCompletedPoll ? card.querySelectorAll("li") : card.querySelectorAll("div[role=radio]");

                for (const choice of choiceList) {
                  choiceComponentList.push(
                    parseComponentField(choice.querySelector("div[dir=auto]")?.children[0])
                  );
                }

                result.push({
                  type: "poll",
                  choices: choiceComponentList,
                });
              } else {
                // cards always have media and detail fields
                const media = card.querySelector("div[data-testid$=media]")
                const detail = card.querySelector("div[data-testid$=detail]")

                result.push({
                  type: "card",
                  link: media.querySelector("a")?.href || "",
                  media: {
                    type: "photo",
                    url: media.querySelector("img")?.src || "",
                  },
                  detail: parseComponentField(detail.children[card.children.length - 1]?.children[0])
                });
              }
            } else if (photoList.length) {
              for (const photo of photoList) {
                result.push({
                  type: "photo",
                  url: photo.querySelector("img")?.src || "",
                });
              }
            }

            return result;
          };

          const result: IScreenshotPageResult = {
            options: {
              encoding: "base64",
            },
            tweetList: [],
          }

          // this selector skips all invalid tweet (deleted, unavailable)
          const articleList = document.querySelectorAll(`article[data-testid="tweet"]`);

          for (const [index, article] of articleList.entries()) {
            const currTweet: ITweet = {
              elements: [],
            };

            const field = article.querySelector(":scope > div > div > div > :last-child");
            if (!(field)) continue;

            const currBoundingRect = article.getBoundingClientRect();

            if (!(result.options.clip)) {
              result.options.clip = {
                x: currBoundingRect.x,
                y: currBoundingRect.y,
                height: currBoundingRect.height,
                width: currBoundingRect.width,
              };
            }

            const isCommentTweet = field.childElementCount == 2;
            let componentField: Element;
            if (isCommentTweet) {
              componentField = field.children[1].querySelector("div[lang]");
            } else {
              componentField = field.children[0].querySelector("div[lang]") || field.children[1].querySelector("div[lang]");
            }

            currTweet.elements = parseComponentField(componentField);

            const extendedField = field.children[1].children.length === 0 ? field.children[2] : field.children[1];
            const hasExtendedField = extendedField.querySelector(`a[href="${window.location.href.substring(19)}"]`) === null && extendedField.innerHTML != "";

            if (hasExtendedField) {
              currTweet.entities = [];
              for (const child of extendedField.children[0]?.children) {
                currTweet.entities.push(...parseExtendedField(child));
              }
            }

            result.tweetList.push(currTweet);

            // stop iterating when the current tweet we have is the main tweet
            // or we cannot find the main tweet
            // ignore the case that the fist one is deleted
            if (!isCommentTweet || index == articleList.length - 1) {
              result.options.clip.height = currBoundingRect.y - result.options.clip.y + currBoundingRect.height;
              break;
            }
          }

          return result;
        }
      ))

      LOGGER.debug("acquire page lock");
      await this.occupy();
      LOGGER.debug("bring page to front");
      await page.bringToFront();

      LOGGER.debug("start puppeteer screenshot");
      const screenshotBase64 = await page.screenshot(pageResult.options) as string;
      this.occupied = false;

      LOGGER.debug("close current page, screenshot procedure ends and frees all resources");
      await page.close();
      const result: IScreenshotResult = {
        screenshotBase64,
        tweetList: pageResult.tweetList,
      }
      return ok(result);
    } catch (error) {
      this.occupied = false;
      return err(`${error}`);
    }
  }

  /**
   * Try to add translation to the given tweet based on user config
   * @param page the page to add translation on
   * @param text the translation
   * @param userConfig the user config of current tweet author
   */
  async translate(page: Page, text: string, userConfig: IUserConfig) {
    LOGGER.debug("translation procedure starts");
    const parsedTranslation = parseMajorTranslationBlock(text);
    LOGGER.debug(`translation block list: ${JSON.stringify(parsedTranslation)}`);
    const loadCustomContentPromises: Promise<string>[] = [];

    loadCustomContentPromises.push(userConfig.css ? fs.promises.readFile(userConfig.css, "utf-8") : Promise.resolve(undefined));
    loadCustomContentPromises.push(userConfig.tag ? fs.promises.readFile(userConfig.tag, "base64") : Promise.resolve(undefined));
    loadCustomContentPromises.push(userConfig.background ? fs.promises.readFile(userConfig.background, "base64") : Promise.resolve(undefined));

    LOGGER.debug("start loading user custom contents");
    // read all custom contents
    const [userCSS,userTag, userBackground] = (await Promise.allSettled(loadCustomContentPromises))
      .map((settledResult) => settledResult.status == "fulfilled" ? settledResult.value : undefined);
    LOGGER.debug("user custom contents are loaded, start adding translations");

    await page.evaluate(async (translation: MajorTranslationBlock[], customized: { userCSS: string, userTag: string, userBackground: string }) => {

      /**
       * Insert the translation block on the given element
       * @param element the element to be add onto
       * @param translation the parsed translation components
       * @param replace whether we replace everything in the current field or not
       * @returns the element that contains all translation components
       */
      const addTranslationBlock = (element: Element, translation: ITweetComponent[], replace = false) => {
        const translationBlock = document.createElement("div");
        translationBlock.className = "translation";

        for (const block of translation) {
          switch (block.type) {
            case "text":
              const textElement = document.createElement("span");
              // hard coded, if no custom setting, use twitter css class for text
              textElement.className = customized.userCSS ? "text" : "css-901oao css-16my406 r-poiln3 r-bcqeeo r-qvutc0";
              textElement.innerText = block.content;
              translationBlock.appendChild(textElement);
              break;
            case "emoji":
              const emojiElement = document.createElement("img");
              // hard coded, if no custom setting, use twitter css class for emoji
              emojiElement.className = customized.userCSS ? "emoji" : "r-4qtqp9 r-dflpy8 r-sjv1od r-zw8f10 r-10akycc r-h9hxbl";
              emojiElement.src = `https://abs-0.twimg.com/emoji/v2/svg/${block.content}.svg`;
              translationBlock.appendChild(emojiElement);
              break;
            case "link":
              const linkElement = document.createElement("a");
              // hard coded, if no custom setting, use twitter css class for link
              linkElement.className = customized.userCSS ? "link" : "css-4rbku5 css-18t94o4 css-901oao css-16my406 r-1cvl2hr r-1loqt21 r-poiln3 r-bcqeeo r-qvutc0";
              linkElement.innerText = block.content;
              translationBlock.appendChild(linkElement);
              break;
            case "mention":
            case "hashtag":
              const hashtagSpanElement = document.createElement("span");
              hashtagSpanElement.className = "r-18u37iz";
              const hashtagElement = document.createElement("a");
              // hard coded, if no custom setting, use twitter css class for link
              hashtagElement.className = customized.userCSS ? block.type : "css-4rbku5 css-18t94o4 css-901oao css-16my406 r-1cvl2hr r-1loqt21 r-poiln3 r-bcqeeo r-qvutc0";
              hashtagElement.innerText = block.content;
              hashtagSpanElement.appendChild(hashtagElement);
              translationBlock.appendChild(hashtagSpanElement);
              break;
          }
        }

        if (replace)
          for (const child of translationBlock.children) element.appendChild(child);
        else
          element.parentElement.appendChild(translationBlock);
        return translationBlock
      };

      /**
       * Add custom css content to current page
       */
      const addCSS = () => {
        const styleElement = document.createElement("style");
        styleElement.innerHTML = customized.userCSS;
        document.body.appendChild(styleElement);
      };

      /**
       * If no css content is provided, add default style on tag to avoid huge image
       */
      const addDefaultCSS = () => {
        const styleElement = document.createElement("style");
        const size = "1.6em";
        styleElement.innerHTML = `
        .translation {
          font-size: ${size};
        }
        .tag {
          height: ${size};
        }
        `;
        document.body.appendChild(styleElement);
      };

      /**
       * Add tag picture to the translation block
       * @param translationBlock the element that contains all translation components
       */
      const addTag = (translationBlock: HTMLDivElement) => {
        const tagElement = document.createElement("img");
        tagElement.src = `data:image/png;base64,${customized.userTag}`;
        tagElement.className = "tag";

        const tagContainer = document.createElement("div");
        tagContainer.appendChild(tagElement);

        translationBlock.prepend(tagContainer);
      };

      /**
       * Add background to current page
       */
      const addBackground = () => {
        const section = document.querySelector("section");
        section.style.backgroundImage = `url(data:image/png;base64,${customized.userBackground})`;
        section.style.backgroundRepeat = 'no-repeat';
        section.style.backgroundSize = '100% auto';
      }

      const articles = document.querySelectorAll("article");

      for (const translationBlock of translation) {
        const index = translationBlock.index - 1;

        const article = articles[index];

        if (!(article)) continue;

        const field = article.querySelector(":scope > div > div > div > :last-child");
        if (!(field)) continue;

        const isCommentTweet = field.childElementCount === 2;
        let componentField: Element;
        if (isCommentTweet) {
          componentField = field.children[1].querySelector("div[lang]");
        } else {
          componentField = field.children[0].querySelector("div[lang]") || field.children[1].querySelector("div[lang]");
        }

        const extendedField = field.children[1].children.length === 0 ? field.children[2] : field.children[1];
        const hasExtendedField = extendedField.querySelector(`a[href="${window.location.href.substring(19)}"]`) === null && extendedField.innerHTML != "";

        for (const minorBlock of translationBlock.content) {
          if (minorBlock.type == "main" && componentField) {
            const translationElement = addTranslationBlock(componentField, minorBlock.content);
            // only main tweet needs tag
            if (!isCommentTweet && customized.userTag) addTag(translationElement);
          } else if (minorBlock.type == "entity" && hasExtendedField) {
            const entityIndex = (typeof (minorBlock.index) == "string" ? parseInt(minorBlock.index.substring(0, minorBlock.index.indexOf("."))) : minorBlock.index) - 1;

            const entity = extendedField.firstElementChild.children[entityIndex];

            if (entity.querySelector("div[role=link][tabindex]")) {
              // quoted tweet
              const componentField = entity.querySelector("div[lang]");
              if (componentField) addTranslationBlock(componentField, minorBlock.content);
            } else if (entity.querySelector("div[data-testid='card.wrapper']")) {
              // card, regular card or poll

              const isPoll = entity.querySelector("div[data-testid=cardPoll]") !== null;
              if (isPoll) {
                const isCompletedPoll = entity.querySelector("div[role=radiogroup]") === null;
                const choices = isCompletedPoll ? entity.querySelectorAll("li") : entity.querySelectorAll("div[role=radio]");

                if (typeof (minorBlock.index) == "string") {
                  const choiceIndex = parseInt(minorBlock.index.substring(minorBlock.index.indexOf(".") + 1)) - 1;
                  if (choices[choiceIndex]) {
                    const contentBlock = choices[choiceIndex].querySelector("div[dir=auto]").children[0];
                    while (contentBlock.firstChild) contentBlock.removeChild(contentBlock.firstChild);

                    addTranslationBlock(contentBlock, minorBlock.content, true);
                  }
                }
              } else {
                const cardDescription = entity.querySelector("div[data-testid$=detail]").children;

                if (typeof (minorBlock.index) == "string") {
                  const descriptionIndex = parseInt(minorBlock.index.substring(minorBlock.index.indexOf(".") + 1)) - 1;

                  if (cardDescription[descriptionIndex]) {
                    const contentBlock = cardDescription[descriptionIndex].children[0];
                    while (contentBlock.firstChild) contentBlock.removeChild(contentBlock.firstChild);

                    addTranslationBlock(contentBlock, minorBlock.content, true);
                  }
                }
              }
            }
          }
        }
      }

      if (customized.userCSS) addCSS();
      else addDefaultCSS();
      if (customized.userBackground) addBackground();

    }, parsedTranslation, { userCSS, userTag, userBackground });
    LOGGER.debug("translation procedure ends");
  }
}

namespace TwitterScreenshotClient {
  export interface Config {
    executablePath: string,
    twitterUserName: string,
    twitterPassword: string,
    twitterPhoneNumber: string,
  }

  export const schema: Schema<Config> = Schema.object({
    executablePath: Schema.string().description("executable path for chrome"),
    twitterUserName: Schema.string().required().description("user name of twitter account"),
    twitterPassword: Schema.string().required().description("password for twitter account"),
    twitterPhoneNumber: Schema.string().required().description("phone number for twitter account"),
  })
}

export default TwitterScreenshotClient;

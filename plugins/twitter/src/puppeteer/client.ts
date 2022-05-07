import puppeteer, { Browser, Product, launch, Page, Viewport } from "puppeteer-core";
import fs from "fs";
import { err, ok, Result } from "../model";
import { NOOP } from "../utils";
import { IScreenshotPageResult, IScreenshotResult, ITweet, ITweetComponent, ITweetEntity, ITwitterLoginInfo } from "./model";
import { MajorTranslationBlock, parseMajorTranslation } from "./utils";
import { Logger } from "koishi";
import { IUserConfig } from "../mongodatabase";


/**
 * Get a randomized delay in miliseconds within the given interval
 * @param min minimum delay in milisecond
 * @param max maximum delay in milisecond
 * @returns randomized delay time between minimum and maximum
 */
function getRandomDelay(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Wait for a given amount of time
 * @param miliseconds time to wait for in milisecond
 */
async function waitForTime(miliseconds: number) {
  await new Promise(resolve => setTimeout(resolve, miliseconds));
}

/**
 * Run the given function for a given amount of times until success, or return the error occurred
 * @param promise the function to retry
 * @param count retry times, default to 3
 * @param gap include a delay between every retry or not
 * @param gapTime the time to delay in milisecond
 * @returns result of promise if usccess, or the error occured
 */
async function retryPromise<T>(promise: Promise<T>, count: number = 3, gap: boolean = false, gapTime: number = 1000)
  : Promise<Result<true, T> | Result<false, string>> {
  try {
    const result = await promise;
    return ok(result)
  } catch (error) {
    if (count < 1) {
      return err(`${err}`);
    } else if (gap) {
      await waitForTime(gapTime);
    }
    return await retryPromise(promise, count - 1, gap, gapTime);
  }
}

/**
 * The class that holds the puppeteer client and implements the screenshot and translate functionality
 */
export class PuppeteerClient {
  client: Browser;
  // lock so that pages don't randomly trying to bring themselves to front, which
  // may interrupt the current ongoing evaluate function
  protected occupied: boolean;

  constructor(protected options: Parameters<typeof launch>[0], protected loginInfo: ITwitterLoginInfo, protected logger: Logger) {
    this.occupied = false;
  }

  /**
   * Load the puppeteer client
   */
  async load() {
    this.logger.debug(`puppteer client launch, options: ${JSON.stringify(this.options)}, loginInfo: ${JSON.stringify(this.loginInfo)}`);
    this.client = await puppeteer.launch(this.options);
    this.logger.debug(`puppeteer client successfully launched`);
  }

  /**
   * Properly free the client
   */
  async unload() {
    if (this.client) {
      this.logger.debug(`free puppeteer client`);
      await this.client.close().catch(NOOP);
      this.client = undefined;
      this.logger.debug(`puppeteer client freed`);
    }
  }

  /**
   * Get a new page from browser, recreate a client if error occured
   * @returns a new page in default browser context
   */
  async getPage() {
    try {
      return await this.client.newPage();
    } catch(err) {
      await this.client.close().catch(NOOP);
      this.client = await puppeteer.launch(this.options);
      return await this.client.newPage();
    }
  }

  /**
   * Acquire the current lock
   */
  protected async occupyClient() {
    while (this.occupied) {
      // retry every 30 miliseconds to acquire the lock
      await waitForTime(30);
    }
    this.occupied = true;
  }

  /**
   * Go to the given website on the given page
   * @param page the page to go to the given url
   * @param url the url of the website to be visited
   * @returns the page
   */
  private async gotoUrl(page: Page, url: string) {
    // retry 3 times to go to the given website
    this.logger.debug(`start gotoUrl for ${url}`);
    const result = await retryPromise(page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    }));
    this.logger.debug(`retry finished, result is ${result.status ? "ok" : "err"}`);

    // failed with error thrown during the process
    if (result.status == false) throw new Error(`${result.content}`);
    // succeeded but something went wrong on the website
    if (!result.content.ok()) throw new Error(`goto failed with http response ${result.content.status()}`);

    this.logger.debug("goto succeeded, start waiting for selector article");
    // wait for article to appear on the page, maybe unnecessary
    await page.waitForSelector("article");

    this.logger.debug("wait for selector ended");

    return page;
  }

  /**
   * Adjust the given page to the appropriate view port size
   * @param page the page to set view port
   */
  private async setViewPort(page: Page) {
    const maxViewPort = await page.evaluate<() => Viewport>(() => {
      return {
        height: Math.max(document.body.scrollHeight, document.body.offsetHeight),
        width: Math.max(document.body.scrollWidth, document.body.offsetWidth)
      };
    });
    await page.setViewport(maxViewPort);
  }

  /**
   * Determine if twitter is visited within properly login
   * @param page the page to determine if we need to login
   * @returns whether we need to login or not
   */
  private async needLogin(page: Page) {
    const loginButton = await page.$(`a[href="/login"]`);
    return loginButton !== null;
  }

  /**
   * Login to twitter
   * @param page the page to login
   * @returns the page
   */
  private async twitterLogin(page: Page) {
    this.logger.debug("start twitter login");
    const loginButton = await page.$(`a[href="/login"]`);
    await loginButton.click();

    await page.waitForSelector("input");

    this.logger.debug("login page loaded, start login procedure");

    this.logger.debug(`start typing user name`);

    const usernameInput = await page.$("input");
    await usernameInput.type(this.loginInfo.username, { delay: getRandomDelay(100, 300) });
    await waitForTime(getRandomDelay(1000, 2000));

    this.logger.debug(`type user name completed, next ...`);

    let nextButton = (await page.$$("div[role=button]"))[2];
    await nextButton.click();

    this.logger.debug(`next button clicked`);

    await page.waitForSelector("input");

    this.logger.debug(`page loaded, start typing password`);

    const passwordInput = (await page.$$("input"))[1];
    await passwordInput.type(this.loginInfo.password, { delay: getRandomDelay(100, 300) });
    await waitForTime(getRandomDelay(1000, 2000));

    this.logger.debug(`type password completed`);

    nextButton = (await page.$$("div[role=button]"))[2];
    await nextButton.click();

    this.logger.debug(`next button clicked`);

    // handle possible phone verification on new login location
    const verificationInput = await page.$("input");

    if (verificationInput) {
      this.logger.debug(`verification required, start typing phone number`);

      await verificationInput.type(this.loginInfo.phone, { delay: getRandomDelay(100, 300) });
      await waitForTime(getRandomDelay(1000, 2000));

      this.logger.debug(`type verification completed, next ...`);

      nextButton = (await page.$$("div[role=button]"))[1];
      await nextButton.click();

      this.logger.debug(`next button clicked`);
    }

    await page.waitForSelector("article");

    this.logger.debug("page loaded, login procedure ends");

    return page;
  }

  /**
   * Wait for all images on current website to load
   * @param page the page to wait for loading
   * @returns the page
   */
  private async waitForImageLoading(page: Page) {
    await retryPromise((async () => {
      let loaded = false;
      const imageList = await page.$$("img");

      for (const image of imageList) {
        const completeAttribute = await image.getProperty("complete");
        loaded = await completeAttribute.jsonValue<boolean>();
        if (!loaded) break;
      }

      if (loaded) return loaded;
      else throw new Error("images are still loading");
    })(), undefined, true);

    return page;
  }

  /**
   * Try to expand all hidden content on current twitter page
   * @param page the page to expand all hidden content
   */
  private async expandCollapsedContent(page: Page) {
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
   * Visit the given tweet on the given page and handle all loading process, throws error
   * @param page the page to visit the url
   * @param url url of the given website
   * @returns the page
   */
  async preparePage(page: Page, url: string) {
    this.logger.debug(`start prepare page for url ${url}`);
    await this.gotoUrl(page, url);
    this.logger.debug(`goto url ended, start acquiring page lock`);
    await this.occupyClient();
    this.logger.debug(`page lock acquired, bring page to front`);
    await page.bringToFront();

    if (await this.needLogin(page)) {
      this.logger.debug("need to login");
      await this.twitterLogin(page);
      this.logger.debug("goto url again");
      await this.gotoUrl(page, url);
    }

    this.logger.debug("set viewport for current tweet");
    // if set view port before, the page might be broken for unknown reason
    await this.setViewPort(page);
    await waitForTime(1000);

    this.logger.debug("start expand all collapsed components on current page");
    await this.expandCollapsedContent(page);
    this.logger.debug("expand collapsed components completed, start waiting for images to load");
    await this.waitForImageLoading(page);
    this.logger.debug("images are all loaded, free page lock");

    this.occupied = false;
    return page;
  }

  /**
   * Take a screenshot of the current tweet in base64 and parse all tweets to send back
   * @param page the page to take a screenshot
   * @returns the screenshot result in base64 format, and all tweets on the page
   */
  async screenshot(page: Page): Promise<IScreenshotResult> {
    this.logger.debug("start screenshot procudure");
    const result: IScreenshotPageResult = (await page.evaluate<() => Promise<IScreenshotPageResult>>(
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
          const card = extendedField.querySelector(`div[data-testid="card.wrapper"]`);

          for (const photo of photoList) {
            result.push({
              type: "photo",
              url: photo.querySelector("img")?.src || "",
            });
          }

          if (video) {
            result.push({
              type: "video",
              posterUrl: video.querySelector("video")?.poster || "",
            });
          }

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
          }

          if (card) {
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

          const isComment = field.childElementCount == 2;
          const componentField = isComment ? field.children[1].querySelector("div[lang]") : field.children[0].querySelector("div[lang]");

          currTweet.elements = parseComponentField(componentField);

          const extendedField = field.children[1].children.length === 0 ? field.children[2] : field.children[1];
          const hasExtendedField = extendedField.querySelector(`a[href="${window.location.href.substring(19)}"]`) === null;

          if (hasExtendedField) {
            currTweet.entities = parseExtendedField(extendedField);
          }

          result.tweetList.push(currTweet);

          // stop iterating when the current tweet we have is the main tweet
          // or we cannot find the main tweet
          // ignore the case that the fist one is deleted
          if (!isComment || index == articleList.length - 1) {
            result.options.clip.height = currBoundingRect.y - result.options.clip.y + currBoundingRect.height;
            break;
          }
        }

        return result;
      }
    )) || {
      options: {
        encoding: "base64",
      },
      tweetList: [],
    };

    this.logger.debug("acquire page lock");
    await this.occupyClient();
    this.logger.debug("bring page to front");
    await page.bringToFront();

    this.logger.debug("start puppeteer screenshot");
    const screenshotBase64 = (await page.screenshot(result.options).catch(() => "")) as string;
    this.occupied = false;

    this.logger.debug("close current page, screenshot procedure ends and frees all resources");
    await page.close();
    return {
      screenshotBase64,
      tweetList: result.tweetList,
    }
  }

  /**
   * Add translation to current page
   * @param page the page to add translation on
   * @param text the raw translation from user
   * @param userConfig this user config for current translating tweet
   */
  async translate(page: Page, text: string, userConfig: IUserConfig) {
    this.logger.debug("translation procedure starts");
    const parsedTranslation = parseMajorTranslation(text);
    const loadCustomContentPromises: Promise<string>[] = [];

    if (userConfig.css) loadCustomContentPromises.push(fs.promises.readFile(userConfig.css, "utf-8"));
    if (userConfig.tag) loadCustomContentPromises.push(fs.promises.readFile(userConfig.tag, "base64"));
    if (userConfig.background) loadCustomContentPromises.push(fs.promises.readFile(userConfig.background, "base64"));

    this.logger.debug("start loading user custom contents");
    // read all custom contents
    const [userCSS, userBackground, userTag] = (await Promise.allSettled(loadCustomContentPromises))
      .map((settledResult) => settledResult.status == "fulfilled" ? settledResult.value : undefined);
    this.logger.debug("user custom contents are loaded, start adding translations");

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
          if (block.type == "text") {
            const textElement = document.createElement("span");
            // hard coded, if no custom setting, use twitter css class for text
            textElement.className = customized.userCSS ? "text" : "css-901oao css-16my406 r-poiln3 r-bcqeeo r-qvutc0";
            textElement.innerText = block.content;
            translationBlock.appendChild(textElement);
          } else if (block.type == "emoji") {
            const emojiElement = document.createElement("img");
            // hard coded, if no custom setting, use twitter css class for emoji
            emojiElement.className = customized.userCSS ? "emoji" : "r-4qtqp9 r-dflpy8 r-sjv1od r-zw8f10 r-10akycc r-h9hxbl";
            emojiElement.src = `https://abs-0.twimg.com/emoji/v2/svg/${block.content}.svg`;
            translationBlock.appendChild(emojiElement);
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
        const componentField = isCommentTweet ? field.children[1].querySelector("div[lang]") : field.children[0].querySelector("div[lang]");

        const extendedField = field.children[1].children.length === 0 ? field.children[2] : field.children[1];
        const hasExtendedField = extendedField.querySelector(`a[href="${window.location.href.substring(19)}"]`) === null;

        for (const minorBlock of translationBlock.content) {
          if (minorBlock.type == "main" && componentField) {
            const translationElement = addTranslationBlock(componentField, minorBlock.content);
            // only main tweet needs tag
            if (!isCommentTweet) addTag(translationElement);
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
      if (customized.userBackground) addBackground();

    }, parsedTranslation, { userCSS, userTag, userBackground });
    this.logger.debug("translation procedure ends");
  }
}

import { App } from "koishi";
import { mkdir, writeFile, access, readdir, rm } from "fs/promises";
import mock from "@koishijs/plugin-mock";
import Puppeteer from "koishi-plugin-puppeteer";
import TwitterHandler from "koishi-plugin-twitter-handler";

const testScreenshotFolder = "./test/screenshots";

const app = new App();
app.plugin(mock);
app.plugin(Puppeteer, {
  // headless: false,
  args: ["--hide-scrollbars"],
  defaultViewport: {
    width: 1080,
    height: 3000,
  },
});
app.plugin(TwitterHandler, {
  name: "your twitter screen name",
  password: "your twitter password",
  phoneNumber: "your twitter verification phone number",
});

app.command("screenshot <url: string>").action(async (argv, url) => {
  const result = await app.twitterHandler.screenshot(url);
  if (result.screenshotContext.screenshot) {
    const filename = url.substring(url.lastIndexOf("/") + 1);

    await writeFile(
      `${testScreenshotFolder}/${filename}.png`,
      result.screenshotContext.screenshot,
      { encoding: "base64" }
    );
    await writeFile(
      `${testScreenshotFolder}/${filename}.json`,
      JSON.stringify(result.screenshotContext.tweets, undefined, 2),
      { encoding: "utf-8" }
    );
    return "succeeded";
  }
  return "failed";
});

const client = app.mock.client("123");

const screenshotTestUrls = [
  "https://twitter.com/darkness_seo_t2/status/1570061306547568640",
  "https://twitter.com/zoey_mini/status/1570133901150162944",
  "https://twitter.com/SXeyes_/status/1570023747004014593",
  "https://twitter.com/clearusui/status/1570008005852434432",
  "https://twitter.com/clearusui/status/1570043519380893698",
  "https://twitter.com/Kokonoe_Yukari/status/1570064531422072841",
  "https://twitter.com/NLstaff/status/1569923015756120065",
  "https://twitter.com/kanna_peche/status/1569607400231149569",
  "https://twitter.com/hakidame_eee/status/1570029623865638912",
  "https://twitter.com/BBCBreaking/status/1570084619403288578",
];

const concurrencyTestUrls = [
  "https://twitter.com/Hosimiya_Sio/status/1570381222991515660",
  "https://twitter.com/hosimiyamei/status/1570056371885998082",
  "https://twitter.com/clearusui/status/1570441039869247491",
  "https://twitter.com/mashiro_kqnon/status/1570356215867387905",
  "https://twitter.com/killuatrina/status/1570201280169275392",
  "https://twitter.com/mkrfinal/status/1570391641172869127",
  "https://twitter.com/knowneton/status/1570427343784628224",
  "https://twitter.com/cat_auras/status/1570289121309982721",
];

before(async () => {
  await access(testScreenshotFolder).catch(() => mkdir(testScreenshotFolder));
  const existingFiles = await readdir(testScreenshotFolder);

  await Promise.all(
    existingFiles.map((filename) => rm(`${testScreenshotFolder}/${filename}`))
  );

  return app.start();
});

describe("Twitter Handler", function () {
  this.timeout(60_000 * 10);

  describe("screenshot", function () {
    screenshotTestUrls.forEach((url) => {
      it(`screenshot for ${url}`, async function () {
        await client.shouldReply(`screenshot ${url}`, "succeeded");
      });
    });
  });

  describe("concurrecy", function () {
    it("concurrency test", async function () {
      await Promise.all(
        concurrencyTestUrls.map((url) =>
          client.shouldReply(`screenshot ${url}`, "succeeded")
        )
      );
    });
  });
});

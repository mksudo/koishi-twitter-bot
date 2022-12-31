import { App, Bot, segment } from "koishi";
import { mkdir, writeFile, access, readdir, rm } from "fs/promises";
import mock from "@koishijs/plugin-mock";
import Puppeteer from "koishi-plugin-puppeteer";
import TwitterHandler from "koishi-plugin-twitter-handler";

const testTranslateFolder = "./test/translates";

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

app
  .command("translate <url: string> <translation: text>")
  .action(async (argv, url, translation) => {
    const unescapedTranslation = segment.unescape(translation);

    const result = await app.twitterHandler.translate(
      url,
      unescapedTranslation
    );
    const filename = url.substring(url.lastIndexOf("/") + 1);
    if (result.screenshotContext.screenshot) {
      await writeFile(
        `${testTranslateFolder}/${filename}.png`,
        result.screenshotContext.screenshot,
        { encoding: "base64" }
      );
      return "succeeded";
    }
    return "failed";
  });

const client = app.mock.client("123");

const translationTestUrls = [
  // normal
  "https://twitter.com/silence3suzuka/status/1570372158286888960",
  // normal - with emoji
  "https://twitter.com/hanazono_serena/status/1570394941700046850",
  // normal - with extended entities
  "https://twitter.com/SXeyes_/status/1570023747004014593",
  // card
  "https://twitter.com/NLstaff/status/1570373943537860611",
  // poll - ongoing
  "https://twitter.com/JM_Sparkle/status/1570490197158264832",
  // poll - finished
  "https://twitter.com/clearusui/status/1570008005852434432",
  // quote
  "https://twitter.com/honmahimawari/status/1570422602463846400",
];

const translationContents = [
  "スピーディキック很强大。提升对面正面的位置，轻松走出方阵第二名。 能否再次看到兑换重奖中与中央马匹的对决？",

  `我刚到家😭👍
我想直播，但我厌倦了一直跳舞😭💦

也许从 23:30 开始直播！`,

  "好味大姐姐",

  `抱歉通知晚了。 http://netkeiba.com的#第二のストーリー 。 这是大树老爷子的第二次。
#タイキシャトル
#引退馬協会

与Taiki Shuttle度过的日子（2）你还好吗？
netkeiba.com https://news.sp.netkeiba.com/?pid=column_view&cid=51770&rf=column_top_new
?title netkeiba.com 全国最大的赛马情报网站
?description netkeiba.com是全国最大的赛马情报网站，拥有JRA所有比赛的出马表，推荐，预测，新闻……
`,

  `🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍
🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍
🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍
🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍
🍍🍍 🍍PINEAPPLE POLL🍍🍍🍍
🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍
🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍
🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍
🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍🍍
?choice1 菠萝菠萝菠萝菠萝菠萝菠萝菠萝菠萝
?choice2 菠萝菠萝菠萝菠萝菠萝菠萝菠萝菠萝
?choice4 菠萝菠萝菠萝菠萝菠萝菠萝菠萝菠萝
`,

  `嘿嘿嘿♡♡♡♡

如果是后方班加德鲁姆，
你觉得哪一个可爱？ ? ? ( * ͦơωơͦ)🌀❔
?choice1 宇宙最强的宇推くりあ
?choice2 Panjandrum nebula
`,

  `呜呜呜呜呜！ ！
多摩桑，奈兹桑！ ！ ！ ！ ！ ！ ！
?quote 即将发布的标题更新信息

“Monster Hunter Rise: Sunbreak”计划在发布后实施多次免费游戏更新。
下一个免费的标题更新，第 3 部分，正在准备 11 月下旬。

https://monsterhunter.com/rise-sunbreak/update/en/#roadmap-image
#怪物猎人崛起#MH Sunbreak
`,
];

before(async () => {
  await access(testTranslateFolder).catch(() => mkdir(testTranslateFolder));
  const existingFiles = await readdir(testTranslateFolder);

  await Promise.all(
    existingFiles.map((filename) => rm(`${testTranslateFolder}/${filename}`))
  );

  return app.start();
});

describe("Twitter Handler", function () {
  this.timeout(60_000 * 10);

  describe("translate", function () {
    translationTestUrls.forEach((url, index) => {
      it(`translate for ${url}`, async function () {
        await client.shouldReply(
          `translate ${url} ${translationContents[index]}`,
          "succeeded"
        );
      });
    });
  });
});

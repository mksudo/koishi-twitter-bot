import translate from "@vitalets/google-translate-api";
import { segment, Context } from "koishi";
import { ITwitterUser } from "koishi-plugin-twitter-database";
import { ITaskContext } from "koishi-plugin-twitter-handler";

export const buildText = async (
  ctx: Context,
  screenshotResult: ITaskContext,
  userConfig: ITwitterUser,
  text: string,
  entityText: string,
  locale: string
) => {
  let currText = "";
  if (userConfig.screenshot) {
    currText +=
      segment("image", {
        url: `base64://${screenshotResult.screenshotContext.screenshot}`,
      }) + "\n";
  }

  if (userConfig.text) {
    currText += text + "\n";
  }

  if (userConfig.translation) {
    const translation = await translate(text, {
      from: "auto",
      to: "zh-CN",
    });
    currText +=
      ctx.i18n.render("translation", [translation.text], locale) + "\n";
  }

  if (userConfig.extended) {
    currText += entityText + "\n";
  }

  return currText;
};

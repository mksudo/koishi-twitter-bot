import {Context, Logger, Schema, Service} from 'koishi';
import md5 from 'md5';
import fetch from 'node-fetch';
import { BaiduTranslateError, BaiduTranslateResponse } from './model';

declare module "koishi" {
  namespace Context {
    interface Services {
      baiduTranslate: BaiduTranslateClient,
    }
  }
}

export const name = 'baiduTranslate';

const LOGGER = new Logger(name);

// hard coded according to standard
const SALT_RANGE = [32768, 65536] as const;


/**
 * This class implements baidu translation api in a koishi service
 * for other plugins to use
 */
class BaiduTranslateClient extends Service {
  constructor(ctx: Context, public config: BaiduTranslateClient.Config) {
    super(ctx, name);
  }

  protected async start() {
    LOGGER.debug("service start");
  }

  protected async stop() {
    LOGGER.debug("service stop");
  }

  /**
   * Implementation of the baidu translate api
   *
   * @param text the text to be translated
   * @param from from language, default to auto
   * @param to to language, default to zh_cn
   * @returns translated text or error message depending on the response
   */
  async translate(text: string, from: string="auto", to: string="zh") {
    // standard implmentation https://fanyi-api.baidu.com/doc/21
    const salt = Math.floor(Math.random() * (SALT_RANGE[1] - SALT_RANGE[0] + 1) + SALT_RANGE[0]);
    const signedText = md5(`${this.config.appid}${text}${salt}${this.config.secret}`);
    const requestUrl = `${this.config.endpoint}?q=${encodeURIComponent(text)}&from=${from}to=${to}&appid=${this.config.appid}&salt=${salt}&sign=${signedText}`;

    const result = await fetch(requestUrl);
    const resultJSON = await result.json() as BaiduTranslateResponse | BaiduTranslateError;

    if ("error_code" in resultJSON) {
      return {
        state: false,
        content: `${resultJSON.error_code}: ${resultJSON.error_msg}`,
      };
    } else {
      return {
        state: true,
        content: resultJSON.trans_result.map(segment => segment.dst).join("\n"),
      };
    }
  }
}

namespace BaiduTranslateClient {
  export interface Config {
    endpoint: string,
    appid: string,
    secret: string,
  }

  export const schema: Schema<Config> = Schema.object({
    endpoint: Schema.string().required().description("endpoint of baidu translation app"),
    appid: Schema.string().required().description("appid of baidu translation app"),
    secret: Schema.string().required().description("secret of baidu translation app"),
  });
}

export default BaiduTranslateClient;

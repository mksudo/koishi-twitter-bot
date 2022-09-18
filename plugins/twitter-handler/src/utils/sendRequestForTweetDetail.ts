import { HTTPRequest, Protocol } from "puppeteer-core";
import axios, { AxiosError, AxiosResponse } from "axios";
import { TwitterApi } from "../models/twitterApi";

const cookieNames = [
  "ct0",
  "auth_token",
  "guest_id",
  "guest_id_ads",
  "guest_id_marketing",
  "personalization_id",
];

/**
 * Manuallly send tweet loading request based on hijacked request data
 *
 * @param request the hijacked tweet loading request
 * @param cookies the cookies of the webpage
 *
 * @returns the response from manually constructed request
 */
export const sendRequestForTweetDetail = async (
  request: HTTPRequest,
  cookies: Protocol.Network.Cookie[]
) => {
  const headers = await request.headers();
  const twitterCookies = cookies.filter((cookie) =>
    cookieNames.some((cookieName) => cookieName === cookie.name)
  );
  headers["cookie"] = twitterCookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const result = await axios
    .get<TwitterApi.APIResult>(request.url(), {
      headers: headers,
    })
    .catch<AxiosResponse<TwitterApi.APIResult>>((err: AxiosError) => {
      console.log(err.message);
      return undefined;
    });
  return result;
};

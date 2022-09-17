import { ITwitterUser } from "koishi-plugin-twitter-database";

export const getDummyUser = (): ITwitterUser => {
  return {
    registeredBy: "",
    id: "",
    name: "",
    tweet: true,
    retweet: true,
    comment: true,
    screenshot: true,
    text: true,
    translation: true,
    extended: true,
  };
};

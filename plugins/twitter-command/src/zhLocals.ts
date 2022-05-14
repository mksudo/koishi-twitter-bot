/**
 * This file is temporary because yaml-register bug is about to be fixed for koishi
 */

export const COMMAND_SCREENSHOT = {
  description: "为指定的tweet页面截图，存在别名scr",
  usage: "为指定的tweet页面截图并发送至当前聊天，可以在私聊和群聊中使用",
  examples: `
  screenshot https://twitter.com/Twitter/status/1509206476874784769
    获取https://twitter.com/Twitter/status/1509206476874784769的页面截图
  scr https://twitter.com/Twitter/status/1509206476874784769
    获取https://twitter.com/Twitter/status/1509206476874784769的页面截图
  `.trim(),
}

export const COMMAND_TRANSLATE = {
  description: "为指定的tweet页面或已保存的tweet嵌字，存在别名tr",
  usage: "为指定的tweet页面嵌字后截图发送至当前聊天，只能在群聊中使用，需要额外提供翻译内容，可以使用普通的emoji",
  examples: `
  translate https://twitter.com/Twitter/status/1509206476874784769
    向https://twitter.com/Twitter/status/1509206476874784769嵌字
  tr https://twitter.com/Twitter/status/1509206476874784769
    向https://twitter.com/Twitter/status/1509206476874784769嵌字
  translate 123
    向储存的第123号推文嵌字
  tr 123
    向储存的第123号推文嵌字

  bot会请求翻译文本，请等到那时再发送翻译文本

  翻译文本块例子
  正常推文：
    我是嵌入推文的翻译
  正常推文，存在特殊元素（嵌入推文，投票，卡片，图片，视频等）：
    我是嵌入推文的翻译
    <1> 我是嵌入嵌入推文的翻译
    <2.1> 我是嵌入卡片标题的翻译
    <2.2> 我是嵌入卡片内容的翻译
    <2.4> 我是嵌入卡片内容的翻译
    <3.1> 我是嵌入投票选项1的翻译
    <3.2>  我是嵌入投票选项2的翻译
    <3.4>  我是嵌入投票选项4的翻译
  多行的评论推文：
    [1] 我是嵌入从上往下数第一个有效推文的翻译（若推文被删除，隐藏，或因其他原因在推文页面上无法正常显示，则为无效推文）
    [2] 我是嵌入从上往下数第二个有效推文的翻译
    [4] 我是嵌入从上往下数第四个有效推文的翻译
  多行的评论推文，存在特殊元素（嵌入推文，投票，卡片，图片，视频等）：
    [1] 我是嵌入从上往下数第一个有效推文的翻译
      <1> 我是嵌入嵌入推文的翻译
    [2] 我是嵌入从上往下数第二个有效推文的翻译
      <1> 我是嵌入嵌入推文的翻译
    [4] 我是嵌入从上往下数第四个有效推文的翻译
      <1> 我是嵌入嵌入推文的翻译
  `.trim(),
}

export const COMMAND_CHECK = {
  description: "获取当前群内对于推特用户的设置",
  usage: "获取指定推特用户的设置，或所有推特用户的设置，只能在群聊中使用",
  examples: `
  check Twitter
    获取用户Twitter的设置
  check *
    获取当前群所有用户的设置
  `.trim(),
}

export const COMMAND_SET = {
  description: "更改多个推特用户的设置",
  usage: "更改当前订阅的一个或多个推特用户的设置，只能在群聊中使用",
  examples: `
  set mkZH0740 tweet
    为mkZH0740开启tweet选项
  set mkZH0740 tweet--off
    为mkZH0740关闭tweet选项
  set mkZH0740 tweet retweet
    为mkZH0740开启tweet和retweet选项
  set mkZH0740 tweet retweet--off
    为mkZH0740关闭tweet和retweet选项
  set mkZH0740 tag background
    为mkZH0740设置嵌字标签和页面背景
  set * tweet
    为所有用户开启tweet选项
  set * tag background
    为所有用户设置嵌字标签和页面背景

  用户设置例子：
  用户设置在数据库中的格式为：
  {
    readonly userid: string,
      无法设置的内容，记录用户id
    readonly username: string,
      无法设置的内容，记录用户screen_name
    tweet: boolean,
      可以设置的内容，控制是否在群内接收来自该用户的普通推文
    retweet: boolean,
      可以设置的内容，控制是否在群内接收来自该用户的转推
    comment: boolean,
      可以设置的内容，控制是否在群内接收来自该用户的评论
    text: boolean,
      可以设置的内容，控制是否在群内接收该用户推文的文字内容
    screenshot: boolean,
      可以设置的内容，控制是否在群内接收该用户推文的截图（只会除去截图，其余内容照常发送）
    translation: boolean,
      可以设置的内容，控制是否在群内接收该用户推文文字内容的翻译
    extended: boolean,
      可以设置的内容，控制是否在群内接收该用户推文特殊元素的内容
    forwardMsg: boolean,
      可以设置的内容，但当前尚未实现
    css ?: string,
      可以设置的内容，记录自定义页面css的位置
    tag ?: string,
      可以设置的内容，记录自定义嵌字标签的位置
    background ?: string,
      可以设置的内容，记录自定义页面背景的位置
  }

  其中css未设置时将会使用推特页面的样式，自定义时请注意设置emoji类的样式
  `.trim(),
  options: {
    off: "将所有选项关闭，不提供时默认为开启选项",
  },
}

export const COMMAND_USER = {
  description: "管理当前群注册的推特用户",
  usage: "通过该命令增加或减少当前群的订阅，只能在群聊中使用",
  examples: `
  user --add Twitter
    增加订阅用户Twitter
  user --delete Twitter
    减少订阅用户Twitter

  --add和--delete至少出现一个，同时出现时只会处理--add

  username并不是twitter用户的用户名，而是在用户名下方 @后面的字符
  例如：对于推文https://twitter.com/Twitter/status/1509951255388504066，username为Twitter
  `.trim(),
  options: {
    add: "增加订阅用户",
    delete: "减少订阅用户",
  },
}

export namespace TwitterApi {
  export namespace Entity {
    export interface ColorPalette {
      percentage: number;
      rgb: {
        red: number;
        green: number;
        blue: number;
      };
    }

    export interface Size {
      h: number;
      w: number;
      resize: string;
    }

    export interface Sizes {
      large: Size;
      medium: Size;
      small: Size;
      thumb: Size;
    }

    export interface FocusRect {
      x: number;
      y: number;
      w: number;
      h: number;
    }

    export interface Feature {
      faces: unknown[];
    }

    export interface Features {
      large: Feature;
      medium: Feature;
      small: Feature;
      orig: Feature;
    }

    export interface OriginalInfo {
      height: number;
      width: number;
      focus_rects?: FocusRect[];
    }

    export namespace SimpleEntity {
      export interface Media {
        display_url: string;
        expanded_url: string;
        id_str: string;
        indices: [number, number];
        media_url_https: string;
        type: string;
        url: string;
        features: Features;
        sizes: Sizes;
        original_info: OriginalInfo;
      }

      export interface UserMention {
        id_str: string;
        name: string;
        screen_name: string;
        indices: [number, number];
      }

      export interface Url {
        display_url: string;
        expanded_url: string;
        url: string;
        indices: [number, number];
      }

      export interface Hashtag {
        indices: [number, number];
        text: string;
      }

      export interface Symbol {
        indices: [number, number];
        text: string;
      }

      export interface Entities {
        media?: Media[];
        user_mentions: UserMention[];
        urls: Url[];
        hashtags: Hashtag[];
        symbols: Symbol[];
      }
    }

    export namespace ExtendedEntity {
      export interface Media extends SimpleEntity.Media {
        media_key: string;
        ext_media_color: {
          palette: ColorPalette[];
        };
        ext_media_availability: {
          status: string;
        };
        sensitive_media_warning?: {
          adult_content: boolean;
          other: boolean;
        };
      }

      export interface VideoVariant {
        bitrate: number;
        content_type: string;
        url: string;
      }

      export interface VideoInfo {
        aspect_ratio: [number, number];
        duration_millis: number;
        variants: VideoVariant[];
      }

      export interface Video extends Media {
        type: "video";
        additional_media_info: {
          monetizable: boolean;
        };
        mediaStats: {
          viewCount: number;
        };
        video_info: VideoInfo;
      }

      export interface Entities {
        media: (Media | Video)[];
      }
    }
  }

  export namespace User {
    export interface LegacyEntities {
      description: {
        urls: Entity.SimpleEntity.Url[];
      };
      url: {
        urls: Entity.SimpleEntity.Url[];
      };
    }

    export interface LegacyExtensions {
      mediaColor: {
        r: {
          ok: {
            palette: Entity.ColorPalette[];
          };
        };
      };
    }

    export interface Legacy {
      blocked_by: boolean;
      blocking: boolean;
      can_dm: boolean;
      can_media_tag: boolean;
      created_at: string;
      default_profile: boolean;
      default_profile_image: boolean;
      description: string;
      entities: LegacyEntities;
      fast_followers_count: number;
      favourites_count: number;
      follow_request_sent: boolean;
      followed_by: boolean;
      followers_count: number;
      following: boolean;
      friends_count: number;
      has_custom_timelines: boolean;
      is_translator: boolean;
      listed_count: number;
      location: string;
      media_count: number;
      muting: boolean;
      name: string;
      normal_followers_count: number;
      notifications: boolean;
      pinned_tweet_ids_str: string[];
      possibly_sensitive: boolean;
      profile_banner_extensions: LegacyExtensions;
      profile_banner_url: string;
      profile_image_extensions: LegacyExtensions;
      profile_image_url_https: string;
      profile_interstitial_type: string;
      protected: boolean;
      screen_name: string;
      statuses_count: number;
      translator_type: string;
      url: string;
      verified: boolean;
      want_retweets: boolean;
      withheld_in_countries: unknown[];
    }

    export interface ProfessionalCategory {
      id: number;
      name: string;
      icon_name: string;
    }

    export interface Professional {
      rest_id: string;
      professional_type: string;
      category: ProfessionalCategory[];
    }

    export interface UserResult {
      __typename: "User";
      id: string;
      rest_id: string;
      affiliates_highlighted_label: unknown;
      has_nft_avatar: boolean;
      legacy: Legacy;
      professional?: Professional;
      super_follow_eligible: boolean;
      super_followed_by: boolean;
      super_following: boolean;
    }
  }

  export namespace Card {
    export interface ImageValue {
      type: "IMAGE";
      image_value: {
        alt: string;
        height: number;
        width: number;
        url: string;
      };
    }

    export interface StringValue {
      type: "STRING";
      string_value: string;
    }

    export interface UserValue {
      type: "USER";
      scribe_key: string;
      user_value: {
        id_str: string;
        path: unknown[];
      };
    }

    export interface ImageColorValue {
      type: "IMAGE_COLOR";
      image_color_value: {
        palette: Entity.ColorPalette[];
      };
    }

    export type Value = ImageColorValue | ImageValue | UserValue | StringValue;

    export interface CardPlatform {
      platform: {
        audience: {
          name: string;
        };
        device: {
          name: string;
          version: string;
        };
      };
    }

    export interface Legacy {
      binding_values: {
        key: string;
        value: Value;
      }[];
      card_platform: CardPlatform;
      name: string;
      url: string;
      user_refs_results: {
        result: User.UserResult;
      }[];
    }

    export interface CardResult {
      rest_id: string;
      legacy: Legacy;
    }
  }

  export namespace Tweet {
    export interface Core {
      user_results: {
        result: User.UserResult;
      };
    }

    export interface EditControl {
      edit_tweet_ids: string[];
      editable_until_msecs: string;
      is_edit_eligible: boolean;
      edits_remaining: string;
    }

    export interface Legacy {
      created_at: string;
      conversation_id_str: string;
      display_text_range: [number, number];
      entities: Entity.SimpleEntity.Entities;
      extended_entities: Entity.ExtendedEntity.Entities;
      favorite_count: number;
      favorited: boolean;
      full_text: string;
      is_quote_status: boolean;
      lang: string;
      possibly_sensitive: boolean;
      possibly_sensitive_editable: boolean;
      quote_count: number;
      reply_count: number;
      retweet_count: number;
      retweeted: boolean;
      source: string;
      user_id_str: string;
      id_str: string;
    }

    export interface TweetResult {
      __typename: "Tweet";
      rest_id: string;
      core: Core;
      card?: Card.CardResult;
      quoted_status_result?: {
        result: TweetResult;
      };
      unified_card?: {
        card_fetch_state: string;
        experiment_signals: unknown;
      };
      unmention_info: unknown;
      edit_control: EditControl;
      legacy: Legacy;
      quick_promote_eligibility: {
        eligibility: string;
      };
    }

    export interface TweetTombstone {
      __typename: "TweetTombstone";
      tombstone: {
        __typename: "TextTombstone";
        text: {
          rtl: boolean;
          text: string;
        };
      };
    }
  }

  export namespace Timeline {
    export interface SocialContext {
      type: string;
      contextType: string;
      text: string;
    }

    export interface TimelineTweet {
      itemType: "TimelineTweet";
      __typename: "TimelineTweet";
      tweet_results: {
        result: Tweet.TweetResult | Tweet.TweetTombstone;
      };
      tweetDisplayType: "Tweet";
      hasModeratedReplies?: boolean;
      socialContext?: SocialContext;
    }

    export interface TimelineCursor {
      itemType: "TimelineTimelineCursor";
      __typename: "TimelineTimelineCursor";
      value: string;
      cursorType: string;
    }

    export interface TimelineItem {
      entryType: "TimelineTimelineItem";
      __typename: "TimelineTimelineItem";
      itemContent: TimelineTweet | TimelineCursor;
    }

    export interface ClientEventInfo {
      component?: string;
      details: {
        conversationDetails?: {
          conversationSection: string;
        };
        timelinesDetails?: {
          controllerData: string;
        };
      };
    }

    export interface TimelineModuleItem {
      entryId: string;
      item: {
        itemContent: TimelineTweet;
        clientEventInfo: ClientEventInfo;
      };
    }

    export interface TimelineModuleHeader {
      displayType: string;
      text: string;
      sticky: boolean;
    }

    export interface TimelineModule {
      entryType: "TimelineTimelineModule";
      __typename: "TimelineTimelineModule";
      header?: TimelineModuleHeader;
      items: TimelineModuleItem[];
      displayType: string;
      clientEventInfo: ClientEventInfo;
    }
  }

  export interface Entry {
    entryId: string;
    sortIndex: string;
    content: Timeline.TimelineItem | Timeline.TimelineModule;
  }

  export namespace Instruction {
    export interface AddEntryInstruction {
      type: "TimelineAddEntries";
      entries: Entry[];
    }

    export interface TerminateTimelineInstruction {
      type: "TimelineTerminateTimeline";
      direction: string;
    }

    export type Instructions =
      | AddEntryInstruction
      | TerminateTimelineInstruction;
  }

  export interface APIResult {
    data: {
      threaded_conversation_with_injections_v2: {
        instructions: Instruction.Instructions[];
      };
    };
  }
}

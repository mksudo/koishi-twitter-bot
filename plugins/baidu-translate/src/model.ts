/**
 * This interface represents a segment in baidu translate api response body
 * Segments are seperated by \n in original text
 */
export interface BaiduTranslateSegment {
  // original text segment
  src: string,
  // translated text segment
  dst: string,
}

/**
 * This interface represents the ok response from baidu translate api
 */
export interface BaiduTranslateResponse {
  // from language
  from: string,
  // to language
  to: string,
  // result, array of segments
  trans_result: BaiduTranslateSegment[],
}

/**
 * This interface represents the err response from baidu translate api
 */
export interface BaiduTranslateError {
  error_code: string,
  error_msg: string,
}

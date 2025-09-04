import axios, { AxiosResponse, AxiosRequestConfig } from "axios";
import logger from "../logger/logger";

const INITIAL_DELAY = 5000; // 5 seconds
const MAX_RETRY_DELAY = 5 * 60 * 1000; // 5 minutes

/**
 * Makes a delay for a given amount of time.
 * @param milliseconds - Time to delay in milliseconds.
 */
const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Request helper with exponential backoff retry strategy.
 */
const request = {
  /**
   * Sends a GET request to the given URL.
   * Retries on failure with exponential backoff up to 5 minutes.
   *
   * @param url - The endpoint URL.
   * @param config - Optional axios config (e.g., params, headers).
   * @param retryDelay - Initial retry delay. Defaults to 5 seconds.
   * @returns Response data.
   * @throws Error if retries exceed maximum delay.
   */
  GET: async <T = unknown>(
    url: string,
    config: AxiosRequestConfig = {},
    retryDelay: number = INITIAL_DELAY,
  ): Promise<T> => {
    try {
      console.info("GET", url, config);

      if (retryDelay !== INITIAL_DELAY) {
        logger.debug(`GET request to ${url} in ${retryDelay / 1000} seconds`);
        await sleep(retryDelay);
      }

      const response: AxiosResponse<T> = await axios.get(url, config);
      return response.data;
    } catch (e: any) {
      if (retryDelay <= MAX_RETRY_DELAY) {
        return await request.GET<T>(url, config, retryDelay * 2);
      }

      logger.error("GET request failed", {
        url,
        error: e?.message ?? e,
      });
      throw e;
    }
  },

  /**
   * Sends a POST request to the given URL.
   * Retries on failure with exponential backoff up to 5 minutes.
   *
   * @param url - The endpoint URL.
   * @param body - Request body.
   * @param config - Optional axios config (e.g., headers).
   * @param retryDelay - Initial retry delay. Defaults to 5 seconds.
   * @returns Response data.
   * @throws Error if retries exceed maximum delay.
   */
  POST: async <T = unknown>(
    url: string,
    body: unknown,
    config: AxiosRequestConfig = {},
    retryDelay: number = INITIAL_DELAY,
  ): Promise<T> => {
    try {
      console.info("POST", url, body);

      if (retryDelay !== INITIAL_DELAY) {
        logger.debug(`POST request to ${url} in ${retryDelay / 1000} seconds`);
        await sleep(retryDelay);
      }

      const response: AxiosResponse<T> = await axios.post(url, body, config);
      return response.data;
    } catch (e: any) {
      if (retryDelay <= MAX_RETRY_DELAY) {
        return await request.POST<T>(url, body, config, retryDelay * 2);
      }

      logger.error("POST request failed", {
        url,
        body,
        error: e?.message ?? e,
      });
      throw e;
    }
  },
};

export default request;

import {
  AppBskyFeedDefs,
  AppBskyFeedGetListFeed as GetListFeed,
} from '@atproto/api'
import {RootStoreModel} from 'state/index'
import {FeedAPI, FeedAPIResponse} from './types'

export class ListFeedAPI implements FeedAPI {
  cursor: string | undefined

  constructor(
    public rootStore: RootStoreModel,
    public params: GetListFeed.QueryParams,
  ) {}

  reset() {
    this.cursor = undefined
  }

  async peekLatest(): Promise<AppBskyFeedDefs.FeedViewPost> {
    const res = await this.rootStore.agent.app.bsky.feed.getListFeed({
      ...this.params,
      limit: 1,
    })
    return res.data.feed[0]
  }

  async fetchNext({limit}: {limit: number}): Promise<FeedAPIResponse> {
    const res = await this.rootStore.agent.app.bsky.feed.getListFeed({
      ...this.params,
      cursor: this.cursor,
      limit,
    })
    if (res.success) {
      this.cursor = res.data.cursor
      return {
        cursor: res.data.cursor,
        feed: res.data.feed,
      }
    }
    return {
      feed: [],
    }
  }
}

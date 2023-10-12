import {AppBskyFeedDefs, RichText} from '@atproto/api'
import {makeAutoObservable, runInAction} from 'mobx'
import {RootStoreModel} from 'state/models/root-store'
import {sanitizeDisplayName} from 'lib/strings/display-names'
import {sanitizeHandle} from 'lib/strings/handles'
import {updateDataOptimistically} from 'lib/async/revertible'
import {track} from 'lib/analytics/analytics'

export class CustomFeedModel {
  // data
  _reactKey: string
  data: AppBskyFeedDefs.GeneratorView
  descriptionRT: RichText | null = null
  isOnline: boolean
  isValid: boolean

  constructor(
    public rootStore: RootStoreModel,
    view: AppBskyFeedDefs.GeneratorView,
    isOnline?: boolean,
    isValid?: boolean,
  ) {
    this._reactKey = view.uri
    this.data = view
    if (this.data.description) {
      this.descriptionRT = new RichText({
        text: this.data.description,
        facets: (this.data.descriptionFacets || [])?.slice(),
      })
    }
    this.isOnline = isOnline ?? true
    this.isValid = isValid ?? true
    makeAutoObservable(
      this,
      {
        rootStore: false,
      },
      {autoBind: true},
    )
  }

  // local actions
  // =

  get uri() {
    return this.data.uri
  }

  get displayName() {
    if (this.data.displayName) {
      return sanitizeDisplayName(this.data.displayName)
    }
    return `Feed by ${sanitizeHandle(this.data.creator.handle, '@')}`
  }

  get isSaved() {
    return this.rootStore.preferences.savedFeeds.includes(this.uri)
  }

  get isLiked() {
    return this.data.viewer?.like
  }

  get isOwner() {
    return this.data.creator.did === this.rootStore.me.did
  }

  // public apis
  // =

  async save() {
    try {
      await this.rootStore.preferences.addSavedFeed(this.uri)
    } catch (error) {
      this.rootStore.log.error('Failed to save feed', error)
    } finally {
      track('CustomFeed:Save')
    }
  }

  async pin() {
    try {
      await this.rootStore.preferences.addPinnedFeed(this.uri)
    } catch (error) {
      this.rootStore.log.error('Failed to pin feed', error)
    } finally {
      track('CustomFeed:Pin', {
        name: this.data.displayName,
        uri: this.uri,
      })
    }
  }

  async unsave() {
    try {
      await this.rootStore.preferences.removeSavedFeed(this.uri)
    } catch (error) {
      this.rootStore.log.error('Failed to unsave feed', error)
    } finally {
      track('CustomFeed:Unsave')
    }
  }

  async like() {
    try {
      await updateDataOptimistically(
        this.data,
        () => {
          this.data.viewer = this.data.viewer || {}
          this.data.viewer.like = 'pending'
          this.data.likeCount = (this.data.likeCount || 0) + 1
        },
        () => this.rootStore.agent.like(this.data.uri, this.data.cid),
        res => {
          this.data.viewer = this.data.viewer || {}
          this.data.viewer.like = res.uri
        },
      )
    } catch (e: any) {
      this.rootStore.log.error('Failed to like feed', e)
    } finally {
      track('CustomFeed:Like')
    }
  }

  async unlike() {
    if (!this.data.viewer?.like) {
      return
    }
    try {
      const likeUri = this.data.viewer.like
      await updateDataOptimistically(
        this.data,
        () => {
          this.data.viewer = this.data.viewer || {}
          this.data.viewer.like = undefined
          this.data.likeCount = (this.data.likeCount || 1) - 1
        },
        () => this.rootStore.agent.deleteLike(likeUri),
      )
    } catch (e: any) {
      this.rootStore.log.error('Failed to unlike feed', e)
    } finally {
      track('CustomFeed:Unlike')
    }
  }

  async reload() {
    const res = await this.rootStore.agent.app.bsky.feed.getFeedGenerator({
      feed: this.data.uri,
    })
    runInAction(() => {
      this.data = res.data.view
      if (this.data.description) {
        this.descriptionRT = new RichText({
          text: this.data.description,
          facets: (this.data.descriptionFacets || [])?.slice(),
        })
      }
      this.isOnline = res.data.isOnline
      this.isValid = res.data.isValid
    })
  }

  serialize() {
    return JSON.stringify(this.data)
  }
}

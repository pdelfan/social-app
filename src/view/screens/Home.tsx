import React from 'react'
import {FlatList, View, useWindowDimensions} from 'react-native'
import {useFocusEffect, useIsFocused} from '@react-navigation/native'
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome'
import {FontAwesomeIconStyle} from '@fortawesome/react-native-fontawesome'
import {observer} from 'mobx-react-lite'
import useAppState from 'react-native-appstate-hook'
import isEqual from 'lodash.isequal'
import {NativeStackScreenProps, HomeTabNavigatorParams} from 'lib/routes/types'
import {PostsFeedModel} from 'state/models/feeds/posts'
import {withAuthRequired} from 'view/com/auth/withAuthRequired'
import {TextLink} from 'view/com/util/Link'
import {Feed} from '../com/posts/Feed'
import {FollowingEmptyState} from 'view/com/posts/FollowingEmptyState'
import {FollowingEndOfFeed} from 'view/com/posts/FollowingEndOfFeed'
import {CustomFeedEmptyState} from 'view/com/posts/CustomFeedEmptyState'
import {LoadLatestBtn} from '../com/util/load-latest/LoadLatestBtn'
import {FeedsTabBar} from '../com/pager/FeedsTabBar'
import {Pager, PagerRef, RenderTabBarFnProps} from 'view/com/pager/Pager'
import {FAB} from '../com/util/fab/FAB'
import {useStores} from 'state/index'
import {usePalette} from 'lib/hooks/usePalette'
import {s, colors} from 'lib/styles'
import {useOnMainScroll} from 'lib/hooks/useOnMainScroll'
import {useAnalytics} from 'lib/analytics/analytics'
import {useWebMediaQueries} from 'lib/hooks/useWebMediaQueries'
import {ComposeIcon2} from 'lib/icons'

const POLL_FREQ = 30e3 // 30sec

type Props = NativeStackScreenProps<HomeTabNavigatorParams, 'Home'>
export const HomeScreen = withAuthRequired(
  observer(function HomeScreenImpl({}: Props) {
    const store = useStores()
    const pagerRef = React.useRef<PagerRef>(null)
    const [selectedPage, setSelectedPage] = React.useState(0)
    const [customFeeds, setCustomFeeds] = React.useState<PostsFeedModel[]>([])
    const [requestedCustomFeeds, setRequestedCustomFeeds] = React.useState<
      string[]
    >([])

    React.useEffect(() => {
      const pinned = store.preferences.pinnedFeeds

      if (isEqual(pinned, requestedCustomFeeds)) {
        // no changes
        return
      }

      const feeds = []
      for (const uri of pinned) {
        if (uri.includes('app.bsky.feed.generator')) {
          const model = new PostsFeedModel(store, 'custom', {feed: uri})
          feeds.push(model)
        } else if (uri.includes('app.bsky.graph.list')) {
          const model = new PostsFeedModel(store, 'list', {list: uri})
          feeds.push(model)
        }
      }
      pagerRef.current?.setPage(0)
      setCustomFeeds(feeds)
      setRequestedCustomFeeds(pinned)
    }, [
      store,
      store.preferences.pinnedFeeds,
      customFeeds,
      setCustomFeeds,
      pagerRef,
      requestedCustomFeeds,
      setRequestedCustomFeeds,
    ])

    useFocusEffect(
      React.useCallback(() => {
        store.shell.setMinimalShellMode(false)
        store.shell.setIsDrawerSwipeDisabled(selectedPage > 0)
        return () => {
          store.shell.setIsDrawerSwipeDisabled(false)
        }
      }, [store, selectedPage]),
    )

    const onPageSelected = React.useCallback(
      (index: number) => {
        store.shell.setMinimalShellMode(false)
        setSelectedPage(index)
        store.shell.setIsDrawerSwipeDisabled(index > 0)
      },
      [store, setSelectedPage],
    )

    const onPressSelected = React.useCallback(() => {
      store.emitScreenSoftReset()
    }, [store])

    const renderTabBar = React.useCallback(
      (props: RenderTabBarFnProps) => {
        return (
          <FeedsTabBar
            {...props}
            testID="homeScreenFeedTabs"
            onPressSelected={onPressSelected}
          />
        )
      },
      [onPressSelected],
    )

    const renderFollowingEmptyState = React.useCallback(() => {
      return <FollowingEmptyState />
    }, [])

    const renderFollowingEndOfFeed = React.useCallback(() => {
      return <FollowingEndOfFeed />
    }, [])

    const renderCustomFeedEmptyState = React.useCallback(() => {
      return <CustomFeedEmptyState />
    }, [])

    return (
      <Pager
        ref={pagerRef}
        testID="homeScreen"
        onPageSelected={onPageSelected}
        renderTabBar={renderTabBar}
        tabBarPosition="top">
        <FeedPage
          key="1"
          testID="followingFeedPage"
          isPageFocused={selectedPage === 0}
          feed={store.me.mainFeed}
          renderEmptyState={renderFollowingEmptyState}
          renderEndOfFeed={renderFollowingEndOfFeed}
        />
        {customFeeds.map((f, index) => {
          return (
            <FeedPage
              key={f.reactKey}
              testID="customFeedPage"
              isPageFocused={selectedPage === 1 + index}
              feed={f}
              renderEmptyState={renderCustomFeedEmptyState}
            />
          )
        })}
      </Pager>
    )
  }),
)

const FeedPage = observer(function FeedPageImpl({
  testID,
  isPageFocused,
  feed,
  renderEmptyState,
  renderEndOfFeed,
}: {
  testID?: string
  feed: PostsFeedModel
  isPageFocused: boolean
  renderEmptyState: () => JSX.Element
  renderEndOfFeed?: () => JSX.Element
}) {
  const store = useStores()
  const pal = usePalette('default')
  const {isDesktop} = useWebMediaQueries()
  const [onMainScroll, isScrolledDown, resetMainScroll] = useOnMainScroll(store)
  const {screen, track} = useAnalytics()
  const headerOffset = useHeaderOffset()
  const scrollElRef = React.useRef<FlatList>(null)
  const {appState} = useAppState({
    onForeground: () => doPoll(true),
  })
  const isScreenFocused = useIsFocused()
  const hasNew = feed.hasNewLatest && !feed.isRefreshing

  React.useEffect(() => {
    // called on first load
    if (!feed.hasLoaded && isPageFocused) {
      feed.setup()
    }
  }, [isPageFocused, feed])

  const doPoll = React.useCallback(
    (knownActive = false) => {
      if (
        (!knownActive && appState !== 'active') ||
        !isScreenFocused ||
        !isPageFocused
      ) {
        return
      }
      if (feed.isLoading) {
        return
      }
      store.log.debug('HomeScreen: Polling for new posts')
      feed.checkForLatest()
    },
    [appState, isScreenFocused, isPageFocused, store, feed],
  )

  const scrollToTop = React.useCallback(() => {
    scrollElRef.current?.scrollToOffset({offset: -headerOffset})
    resetMainScroll()
  }, [headerOffset, resetMainScroll])

  const onSoftReset = React.useCallback(() => {
    if (isPageFocused) {
      scrollToTop()
      feed.refresh()
    }
  }, [isPageFocused, scrollToTop, feed])

  // fires when page within screen is activated/deactivated
  // - check for latest
  React.useEffect(() => {
    if (!isPageFocused || !isScreenFocused) {
      return
    }

    const softResetSub = store.onScreenSoftReset(onSoftReset)
    const feedCleanup = feed.registerListeners()
    const pollInterval = setInterval(doPoll, POLL_FREQ)

    screen('Feed')
    store.log.debug('HomeScreen: Updating feed')
    feed.checkForLatest()

    return () => {
      clearInterval(pollInterval)
      softResetSub.remove()
      feedCleanup()
    }
  }, [store, doPoll, onSoftReset, screen, feed, isPageFocused, isScreenFocused])

  const onPressCompose = React.useCallback(() => {
    track('HomeScreen:PressCompose')
    store.shell.openComposer({})
  }, [store, track])

  const onPressTryAgain = React.useCallback(() => {
    feed.refresh()
  }, [feed])

  const onPressLoadLatest = React.useCallback(() => {
    scrollToTop()
    feed.refresh()
  }, [feed, scrollToTop])

  const ListHeaderComponent = React.useCallback(() => {
    if (isDesktop) {
      return (
        <View
          style={[
            pal.view,
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 18,
              paddingVertical: 12,
            },
          ]}>
          <TextLink
            type="title-lg"
            href="/"
            style={[pal.text, {fontWeight: 'bold'}]}
            text={
              <>
                {store.session.isSandbox ? 'SANDBOX' : 'Bluesky'}{' '}
                {hasNew && (
                  <View
                    style={{
                      top: -8,
                      backgroundColor: colors.blue3,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                    }}
                  />
                )}
              </>
            }
            onPress={() => store.emitScreenSoftReset()}
          />
          <TextLink
            type="title-lg"
            href="/settings/home-feed"
            style={{fontWeight: 'bold'}}
            accessibilityLabel="Feed Preferences"
            accessibilityHint=""
            text={
              <FontAwesomeIcon
                icon="sliders"
                style={pal.textLight as FontAwesomeIconStyle}
              />
            }
          />
        </View>
      )
    }
    return <></>
  }, [isDesktop, pal, store, hasNew])

  return (
    <View testID={testID} style={s.h100pct}>
      <Feed
        testID={testID ? `${testID}-feed` : undefined}
        key="default"
        feed={feed}
        scrollElRef={scrollElRef}
        onPressTryAgain={onPressTryAgain}
        onScroll={onMainScroll}
        scrollEventThrottle={100}
        renderEmptyState={renderEmptyState}
        renderEndOfFeed={renderEndOfFeed}
        ListHeaderComponent={ListHeaderComponent}
        headerOffset={headerOffset}
      />
      {(isScrolledDown || hasNew) && (
        <LoadLatestBtn
          onPress={onPressLoadLatest}
          label="Load new posts"
          showIndicator={hasNew}
          minimalShellMode={store.shell.minimalShellMode}
        />
      )}
      <FAB
        testID="composeFAB"
        onPress={onPressCompose}
        icon={<ComposeIcon2 strokeWidth={1.5} size={29} style={s.white} />}
        accessibilityRole="button"
        accessibilityLabel="New post"
        accessibilityHint=""
      />
    </View>
  )
})

function useHeaderOffset() {
  const {isDesktop, isTablet} = useWebMediaQueries()
  const {fontScale} = useWindowDimensions()
  if (isDesktop) {
    return 0
  }
  if (isTablet) {
    return 50
  }
  // default text takes 44px, plus 34px of pad
  // scale the 44px by the font scale
  return 34 + 44 * fontScale
}

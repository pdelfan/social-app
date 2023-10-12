import React from 'react'
import {Animated, StyleSheet} from 'react-native'
import {observer} from 'mobx-react-lite'
import {TabBar} from 'view/com/pager/TabBar'
import {RenderTabBarFnProps} from 'view/com/pager/Pager'
import {useStores} from 'state/index'
import {useHomeTabs} from 'lib/hooks/useHomeTabs'
import {usePalette} from 'lib/hooks/usePalette'
import {useAnimatedValue} from 'lib/hooks/useAnimatedValue'
import {useWebMediaQueries} from 'lib/hooks/useWebMediaQueries'
import {FeedsTabBar as FeedsTabBarMobile} from './FeedsTabBarMobile'

export const FeedsTabBar = observer(function FeedsTabBarImpl(
  props: RenderTabBarFnProps & {testID?: string; onPressSelected: () => void},
) {
  const {isMobile, isTablet} = useWebMediaQueries()
  if (isMobile) {
    return <FeedsTabBarMobile {...props} />
  } else if (isTablet) {
    return <FeedsTabBarTablet {...props} />
  } else {
    return null
  }
})

const FeedsTabBarTablet = observer(function FeedsTabBarTabletImpl(
  props: RenderTabBarFnProps & {testID?: string; onPressSelected: () => void},
) {
  const store = useStores()
  const items = useHomeTabs(store.preferences.pinnedFeeds)
  const pal = usePalette('default')
  const interp = useAnimatedValue(0)

  React.useEffect(() => {
    Animated.timing(interp, {
      toValue: store.shell.minimalShellMode ? 1 : 0,
      duration: 100,
      useNativeDriver: true,
      isInteraction: false,
    }).start()
  }, [interp, store.shell.minimalShellMode])
  const transform = {
    transform: [
      {translateX: '-50%'},
      {translateY: Animated.multiply(interp, -100)},
    ],
  }

  return (
    // @ts-ignore the type signature for transform wrong here, translateX and translateY need to be in separate objects -prf
    <Animated.View style={[pal.view, styles.tabBar, transform]}>
      <TabBar
        key={items.join(',')}
        {...props}
        items={items}
        indicatorColor={pal.colors.link}
      />
    </Animated.View>
  )
})

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    zIndex: 1,
    left: '50%',
    width: 598,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
})

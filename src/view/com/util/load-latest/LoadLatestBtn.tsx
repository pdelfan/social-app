import React from 'react'
import {StyleSheet, TouchableOpacity, View} from 'react-native'
import {observer} from 'mobx-react-lite'
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {useStores} from 'state/index'
import {usePalette} from 'lib/hooks/usePalette'
import {useWebMediaQueries} from 'lib/hooks/useWebMediaQueries'
import {colors} from 'lib/styles'
import {HITSLOP_20} from 'lib/constants'
import {isWeb} from 'platform/detection'
import {clamp} from 'lib/numbers'

export const LoadLatestBtn = observer(function LoadLatestBtnImpl({
  onPress,
  label,
  showIndicator,
}: {
  onPress: () => void
  label: string
  showIndicator: boolean
  minimalShellMode?: boolean // NOTE not used on mobile -prf
}) {
  const store = useStores()
  const pal = usePalette('default')
  const {isDesktop, isTablet} = useWebMediaQueries()
  const safeAreaInsets = useSafeAreaInsets()
  const minMode = store.shell.minimalShellMode
  const bottom = isTablet
    ? 50
    : (minMode || isDesktop ? 16 : 60) +
      (isWeb ? 20 : clamp(safeAreaInsets.bottom, 15, 60))
  return (
    <TouchableOpacity
      style={[
        styles.loadLatest,
        isDesktop && styles.loadLatestDesktop,
        isTablet && styles.loadLatestTablet,
        pal.borderDark,
        pal.view,
        {bottom},
      ]}
      onPress={onPress}
      hitSlop={HITSLOP_20}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="">
      <FontAwesomeIcon icon="angle-up" color={pal.colors.text} size={19} />
      {showIndicator && <View style={[styles.indicator, pal.borderDark]} />}
    </TouchableOpacity>
  )
})

const styles = StyleSheet.create({
  loadLatest: {
    position: isWeb ? 'fixed' : 'absolute',
    left: 18,
    bottom: 44,
    borderWidth: 1,
    width: 52,
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadLatestTablet: {
    // @ts-ignore web only
    left: '50vw',
    // @ts-ignore web only -prf
    transform: 'translateX(-282px)',
  },
  loadLatestDesktop: {
    // @ts-ignore web only
    left: '50vw',
    // @ts-ignore web only -prf
    transform: 'translateX(-382px)',
  },
  indicator: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: colors.blue3,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
})

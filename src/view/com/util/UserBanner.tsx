import React, {useMemo} from 'react'
import {StyleSheet, View} from 'react-native'
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome'
import {ModerationUI} from '@atproto/api'
import {Image} from 'expo-image'
import {colors} from 'lib/styles'
import {openCamera, openCropper, openPicker} from '../../../lib/media/picker'
import {useStores} from 'state/index'
import {
  usePhotoLibraryPermission,
  useCameraPermission,
} from 'lib/hooks/usePermissions'
import {usePalette} from 'lib/hooks/usePalette'
import {isWeb, isAndroid} from 'platform/detection'
import {Image as RNImage} from 'react-native-image-crop-picker'
import {NativeDropdown, DropdownItem} from './forms/NativeDropdown'

export function UserBanner({
  banner,
  moderation,
  onSelectNewBanner,
}: {
  banner?: string | null
  moderation?: ModerationUI
  onSelectNewBanner?: (img: RNImage | null) => void
}) {
  const store = useStores()
  const pal = usePalette('default')
  const {requestCameraAccessIfNeeded} = useCameraPermission()
  const {requestPhotoAccessIfNeeded} = usePhotoLibraryPermission()

  const dropdownItems: DropdownItem[] = useMemo(
    () =>
      [
        !isWeb && {
          testID: 'changeBannerCameraBtn',
          label: 'Camera',
          icon: {
            ios: {
              name: 'camera',
            },
            android: 'ic_menu_camera',
            web: 'camera',
          },
          onPress: async () => {
            if (!(await requestCameraAccessIfNeeded())) {
              return
            }
            onSelectNewBanner?.(
              await openCamera(store, {
                width: 3000,
                height: 1000,
              }),
            )
          },
        },
        {
          testID: 'changeBannerLibraryBtn',
          label: 'Library',
          icon: {
            ios: {
              name: 'photo.on.rectangle.angled',
            },
            android: 'ic_menu_gallery',
            web: 'gallery',
          },
          onPress: async () => {
            if (!(await requestPhotoAccessIfNeeded())) {
              return
            }
            const items = await openPicker()
            if (!items[0]) {
              return
            }

            onSelectNewBanner?.(
              await openCropper(store, {
                mediaType: 'photo',
                path: items[0].path,
                width: 3000,
                height: 1000,
              }),
            )
          },
        },
        !!banner && {
          testID: 'changeBannerRemoveBtn',
          label: 'Remove',
          icon: {
            ios: {
              name: 'trash',
            },
            android: 'ic_delete',
            web: ['far', 'trash-can'],
          },
          onPress: () => {
            onSelectNewBanner?.(null)
          },
        },
      ].filter(Boolean) as DropdownItem[],
    [
      banner,
      onSelectNewBanner,
      requestCameraAccessIfNeeded,
      requestPhotoAccessIfNeeded,
      store,
    ],
  )

  // setUserBanner is only passed as prop on the EditProfile component
  return onSelectNewBanner ? (
    <NativeDropdown
      testID="changeBannerBtn"
      items={dropdownItems}
      accessibilityLabel="Image options"
      accessibilityHint="">
      {banner ? (
        <Image
          testID="userBannerImage"
          style={styles.bannerImage}
          source={{uri: banner}}
          accessible={true}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View
          testID="userBannerFallback"
          style={[styles.bannerImage, styles.defaultBanner]}
        />
      )}
      <View style={[styles.editButtonContainer, pal.btn]}>
        <FontAwesomeIcon
          icon="camera"
          size={12}
          style={{color: colors.white}}
          color={pal.text.color as string}
        />
      </View>
    </NativeDropdown>
  ) : banner &&
    !((moderation?.blur && isAndroid) /* android crashes with blur */) ? (
    <Image
      testID="userBannerImage"
      style={styles.bannerImage}
      resizeMode="cover"
      source={{uri: banner}}
      blurRadius={moderation?.blur ? 100 : 0}
      accessible={true}
      accessibilityIgnoresInvertColors
    />
  ) : (
    <View
      testID="userBannerFallback"
      style={[styles.bannerImage, styles.defaultBanner]}
    />
  )
}

const styles = StyleSheet.create({
  editButtonContainer: {
    position: 'absolute',
    width: 24,
    height: 24,
    bottom: 8,
    right: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray5,
  },
  bannerImage: {
    width: '100%',
    height: 150,
  },
  defaultBanner: {
    backgroundColor: '#0070ff',
  },
})

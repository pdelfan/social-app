import React, {useState, useCallback, useMemo} from 'react'
import * as Toast from '../util/Toast'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import {Image as RNImage} from 'react-native-image-crop-picker'
import {Text} from '../util/text/Text'
import {ErrorMessage} from '../util/error/ErrorMessage'
import {useStores} from 'state/index'
import {ListModel} from 'state/models/content/list'
import {s, colors, gradients} from 'lib/styles'
import {enforceLen} from 'lib/strings/helpers'
import {compressIfNeeded} from 'lib/media/manip'
import {UserAvatar} from '../util/UserAvatar'
import {usePalette} from 'lib/hooks/usePalette'
import {useTheme} from 'lib/ThemeContext'
import {useAnalytics} from 'lib/analytics/analytics'
import {useWebMediaQueries} from 'lib/hooks/useWebMediaQueries'
import {cleanError, isNetworkError} from 'lib/strings/errors'

const MAX_NAME = 64 // todo
const MAX_DESCRIPTION = 300 // todo

export const snapPoints = ['fullscreen']

export function Component({
  purpose,
  onSave,
  list,
}: {
  purpose?: string
  onSave?: (uri: string) => void
  list?: ListModel
}) {
  const store = useStores()
  const {isMobile} = useWebMediaQueries()
  const [error, setError] = useState<string>('')
  const pal = usePalette('default')
  const theme = useTheme()
  const {track} = useAnalytics()

  const activePurpose = useMemo(() => {
    if (list?.data?.purpose) {
      return list.data.purpose
    }
    if (purpose) {
      return purpose
    }
    return 'app.bsky.graph.defs#curatelist'
  }, [list, purpose])
  const isCurateList = activePurpose === 'app.bsky.graph.defs#curatelist'
  const purposeLabel = isCurateList ? 'User' : 'Moderation'

  const [isProcessing, setProcessing] = useState<boolean>(false)
  const [name, setName] = useState<string>(list?.data?.name || '')
  const [description, setDescription] = useState<string>(
    list?.data?.description || '',
  )
  const [avatar, setAvatar] = useState<string | undefined>(list?.data?.avatar)
  const [newAvatar, setNewAvatar] = useState<RNImage | undefined | null>()

  const onPressCancel = useCallback(() => {
    store.shell.closeModal()
  }, [store])

  const onSelectNewAvatar = useCallback(
    async (img: RNImage | null) => {
      if (!img) {
        setNewAvatar(null)
        setAvatar(undefined)
        return
      }
      track('CreateList:AvatarSelected')
      try {
        const finalImg = await compressIfNeeded(img, 1000000)
        setNewAvatar(finalImg)
        setAvatar(finalImg.path)
      } catch (e: any) {
        setError(cleanError(e))
      }
    },
    [track, setNewAvatar, setAvatar, setError],
  )

  const onPressSave = useCallback(async () => {
    if (isCurateList) {
      track('CreateList:SaveCurateList')
    } else {
      track('CreateList:SaveModList')
    }
    const nameTrimmed = name.trim()
    if (!nameTrimmed) {
      setError('Name is required')
      return
    }
    setProcessing(true)
    if (error) {
      setError('')
    }
    try {
      if (list) {
        await list.updateMetadata({
          name: nameTrimmed,
          description: description.trim(),
          avatar: newAvatar,
        })
        Toast.show(`${purposeLabel} list updated`)
        onSave?.(list.uri)
      } else {
        const res = await ListModel.createList(store, {
          purpose: activePurpose,
          name,
          description,
          avatar: newAvatar,
        })
        Toast.show(`${purposeLabel} list created`)
        onSave?.(res.uri)
      }
      store.shell.closeModal()
    } catch (e: any) {
      if (isNetworkError(e)) {
        setError(
          'Failed to create the list. Check your internet connection and try again.',
        )
      } else {
        setError(cleanError(e))
      }
    }
    setProcessing(false)
  }, [
    track,
    setProcessing,
    setError,
    error,
    onSave,
    store,
    activePurpose,
    isCurateList,
    purposeLabel,
    name,
    description,
    newAvatar,
    list,
  ])

  return (
    <KeyboardAvoidingView behavior="height">
      <ScrollView
        style={[
          pal.view,
          {
            paddingHorizontal: isMobile ? 16 : 0,
          },
        ]}
        testID="createOrEditListModal">
        <Text style={[styles.title, pal.text]}>
          {list ? 'Edit' : 'New'} {purposeLabel} List
        </Text>
        {error !== '' && (
          <View style={styles.errorContainer}>
            <ErrorMessage message={error} />
          </View>
        )}
        <Text style={[styles.label, pal.text]}>List Avatar</Text>
        <View style={[styles.avi, {borderColor: pal.colors.background}]}>
          <UserAvatar
            type="list"
            size={80}
            avatar={avatar}
            onSelectNewAvatar={onSelectNewAvatar}
          />
        </View>
        <View style={styles.form}>
          <View>
            <Text style={[styles.label, pal.text]} nativeID="list-name">
              List Name
            </Text>
            <TextInput
              testID="editNameInput"
              style={[styles.textInput, pal.border, pal.text]}
              placeholder={
                isCurateList ? 'e.g. Great Posters' : 'e.g. Spammers'
              }
              placeholderTextColor={colors.gray4}
              value={name}
              onChangeText={v => setName(enforceLen(v, MAX_NAME))}
              accessible={true}
              accessibilityLabel="Name"
              accessibilityHint=""
              accessibilityLabelledBy="list-name"
            />
          </View>
          <View style={s.pb10}>
            <Text style={[styles.label, pal.text]} nativeID="list-description">
              Description
            </Text>
            <TextInput
              testID="editDescriptionInput"
              style={[styles.textArea, pal.border, pal.text]}
              placeholder={
                isCurateList
                  ? 'e.g. The posters who never miss.'
                  : 'e.g. Users that repeatedly reply with ads.'
              }
              placeholderTextColor={colors.gray4}
              keyboardAppearance={theme.colorScheme}
              multiline
              value={description}
              onChangeText={v => setDescription(enforceLen(v, MAX_DESCRIPTION))}
              accessible={true}
              accessibilityLabel="Description"
              accessibilityHint=""
              accessibilityLabelledBy="list-description"
            />
          </View>
          {isProcessing ? (
            <View style={[styles.btn, s.mt10, {backgroundColor: colors.gray2}]}>
              <ActivityIndicator />
            </View>
          ) : (
            <TouchableOpacity
              testID="saveBtn"
              style={s.mt10}
              onPress={onPressSave}
              accessibilityRole="button"
              accessibilityLabel="Save"
              accessibilityHint="">
              <LinearGradient
                colors={[gradients.blueLight.start, gradients.blueLight.end]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={[styles.btn]}>
                <Text style={[s.white, s.bold]}>Save</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            testID="cancelBtn"
            style={s.mt5}
            onPress={onPressCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            accessibilityHint=""
            onAccessibilityEscape={onPressCancel}>
            <View style={[styles.btn]}>
              <Text style={[s.black, s.bold, pal.text]}>Cancel</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  title: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 24,
    marginBottom: 18,
  },
  label: {
    fontWeight: 'bold',
    paddingHorizontal: 4,
    paddingBottom: 4,
    marginTop: 20,
  },
  form: {
    paddingHorizontal: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingTop: 10,
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderRadius: 32,
    padding: 10,
    marginBottom: 10,
  },
  avi: {
    width: 84,
    height: 84,
    borderWidth: 2,
    borderRadius: 42,
    marginTop: 4,
  },
  errorContainer: {marginTop: 20},
})

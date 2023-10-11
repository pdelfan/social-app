import React from 'react'
import {View} from 'react-native'
import {useFocusEffect, useNavigation} from '@react-navigation/native'
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome'
import {AtUri} from '@atproto/api'
import {observer} from 'mobx-react-lite'
import {NativeStackScreenProps, CommonNavigatorParams} from 'lib/routes/types'
import {withAuthRequired} from 'view/com/auth/withAuthRequired'
import {useStores} from 'state/index'
import {ListsListModel} from 'state/models/lists/lists-list'
import {ListsList} from 'view/com/lists/ListsList'
import {Text} from 'view/com/util/text/Text'
import {Button} from 'view/com/util/forms/Button'
import {NavigationProp} from 'lib/routes/types'
import {usePalette} from 'lib/hooks/usePalette'
import {useWebMediaQueries} from 'lib/hooks/useWebMediaQueries'
import {SimpleViewHeader} from 'view/com/util/SimpleViewHeader'
import {s} from 'lib/styles'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'Lists'>
export const ListsScreen = withAuthRequired(
  observer(function ListsScreenImpl({}: Props) {
    const pal = usePalette('default')
    const store = useStores()
    const {isMobile} = useWebMediaQueries()
    const navigation = useNavigation<NavigationProp>()

    const listsLists: ListsListModel = React.useMemo(
      () => new ListsListModel(store, 'my-curatelists'),
      [store],
    )

    useFocusEffect(
      React.useCallback(() => {
        store.shell.setMinimalShellMode(false)
        listsLists.refresh()
      }, [store, listsLists]),
    )

    const onPressNewList = React.useCallback(() => {
      store.shell.openModal({
        name: 'create-or-edit-list',
        purpose: 'app.bsky.graph.defs#curatelist',
        onSave: (uri: string) => {
          try {
            const urip = new AtUri(uri)
            navigation.navigate('ProfileList', {
              name: urip.hostname,
              rkey: urip.rkey,
            })
          } catch {}
        },
      })
    }, [store, navigation])

    return (
      <View style={s.hContentRegion} testID="listsScreen">
        <SimpleViewHeader
          showBackButton={isMobile}
          style={
            !isMobile && [pal.border, {borderLeftWidth: 1, borderRightWidth: 1}]
          }>
          <View style={{flex: 1}}>
            <Text type="title-lg" style={[pal.text, {fontWeight: 'bold'}]}>
              User Lists
            </Text>
            <Text style={pal.textLight}>
              Public, shareable lists which can drive feeds.
            </Text>
          </View>
          <View>
            <Button
              type="default"
              onPress={onPressNewList}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}>
              <FontAwesomeIcon icon="plus" color={pal.colors.text} />
              <Text type="button" style={pal.text}>
                New
              </Text>
            </Button>
          </View>
        </SimpleViewHeader>
        <ListsList listsList={listsLists} />
      </View>
    )
  }),
)

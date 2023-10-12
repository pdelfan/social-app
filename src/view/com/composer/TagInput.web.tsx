import React from 'react'
import {
  TextInput,
  View,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  Platform,
  Pressable,
} from 'react-native'
import {
  FontAwesomeIcon,
  FontAwesomeIconStyle,
} from '@fortawesome/react-native-fontawesome'
import {Pin} from 'pind'

import {TagsAutocompleteModel} from 'state/models/ui/tags-autocomplete'
import {usePalette} from 'lib/hooks/usePalette'
import {EditableTag} from 'view/com/Tag'
import {Text} from 'view/com/util/text/Text'

function uniq(tags: string[]) {
  return Array.from(new Set(tags))
}

function sanitize(tagString: string) {
  return tagString.trim().replace(/^#/, '')
}

export function TagInput({
  max = 8,
  onChangeTags,
  tagsAutocompleteModel: model,
}: {
  max?: number
  onChangeTags: (tags: string[]) => void
  tagsAutocompleteModel: TagsAutocompleteModel
}) {
  const pal = usePalette('default')
  const dropdown = React.useRef<HTMLDivElement>(null)
  const input = React.useRef<HTMLInputElement>(null)
  const inputWidth = input.current
    ? input.current.getBoundingClientRect().width
    : 200

  const [value, setValue] = React.useState('')
  const [tags, setTags] = React.useState<string[]>([])
  const [dropdownIsOpen, setDropdownIsOpen] = React.useState(false)
  const [dropdownItems, setDropdownItems] = React.useState<
    {value: string; label: string}[]
  >([])
  const [selectedItemIndex, setSelectedItemIndex] = React.useState(0)

  const close = React.useCallback(() => {
    setDropdownIsOpen(false)
    model.setActive(false)
    setSelectedItemIndex(0)
    setDropdownItems([])
  }, [model, setDropdownIsOpen, setSelectedItemIndex, setDropdownItems])

  const addTags = React.useCallback(
    (_tags: string[]) => {
      setTags(_tags)
      onChangeTags(_tags)
    },
    [onChangeTags, setTags],
  )

  const removeTag = React.useCallback(
    (tag: string) => {
      addTags(tags.filter(t => t !== tag))
    },
    [tags, addTags],
  )

  const addTagAndReset = React.useCallback(
    (value: string) => {
      const tag = sanitize(value)

      // enforce max hashtag length
      if (tag.length > 0 && tag.length <= 64) {
        addTags(uniq([...tags, tag]).slice(0, max))
      }

      setValue('')
      input.current?.focus()
      close()
    },
    [max, tags, close, setValue, addTags],
  )

  const onSubmitEditing = React.useCallback(() => {
    const item = dropdownItems[selectedItemIndex]
    addTagAndReset(item?.value || value)
  }, [value, dropdownItems, selectedItemIndex, addTagAndReset])

  const onKeyPress = React.useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      const {key} = e.nativeEvent

      if (key === 'Backspace' && value === '') {
        addTags(tags.slice(0, -1))
      } else if (key === ' ') {
        e.preventDefault() // prevents an additional space on web
        addTagAndReset(value)
      }

      if (dropdownIsOpen) {
        if (key === 'Escape') {
          close()
        } else if (key === 'ArrowUp') {
          e.preventDefault()
          setSelectedItemIndex(
            (selectedItemIndex + dropdownItems.length - 1) %
              dropdownItems.length,
          )
        } else if (key === 'ArrowDown') {
          e.preventDefault()
          setSelectedItemIndex((selectedItemIndex + 1) % dropdownItems.length)
        }
      }
    },
    [
      value,
      tags,
      dropdownIsOpen,
      selectedItemIndex,
      dropdownItems.length,
      close,
      setSelectedItemIndex,
      addTags,
      addTagAndReset,
    ],
  )

  const onChangeText = React.useCallback(
    async (v: string) => {
      setValue(v)

      if (v.length > 0) {
        model.setActive(true)
        await model.search(v)

        setDropdownItems(
          model.suggestions.map(item => ({
            value: item,
            label: item,
          })),
        )

        setDropdownIsOpen(true)
      } else {
        close()
      }
    },
    [model, setValue, setDropdownIsOpen, close],
  )

  React.useEffect(() => {
    // outside click
    function onClick(e: MouseEvent) {
      const drop = dropdown.current
      const control = input.current

      if (
        !drop ||
        !control ||
        e.target === drop ||
        e.target === control ||
        drop.contains(e.target as Node) ||
        control.contains(e.target as Node)
      )
        return

      close()
    }

    document.addEventListener('click', onClick)

    return () => {
      document.removeEventListener('click', onClick)
    }
  }, [close])

  return (
    <View style={styles.outer}>
      {!tags.length && (
        <FontAwesomeIcon
          icon="tags"
          size={14}
          style={pal.textLight as FontAwesomeIconStyle}
        />
      )}

      {tags.map(tag => (
        <EditableTag key={tag} value={tag} onRemove={removeTag} />
      ))}

      {tags.length >= max ? null : (
        <TextInput
          ref={input as any}
          id="tags-autocomplete-input"
          role={'listbox' as any}
          aria-controls="tags-autocomplete-dropdown"
          aria-haspopup="listbox"
          aria-expanded={dropdownIsOpen}
          value={value}
          onKeyPress={onKeyPress}
          onSubmitEditing={onSubmitEditing}
          onChangeText={onChangeText}
          blurOnSubmit={false}
          style={[styles.input, pal.textLight]}
          placeholder="Enter a tag and press enter"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          accessible={true}
          accessibilityLabel="Add tags to your post"
          accessibilityHint={`Type a tag and press enter to add it. You can add up to ${max} tag.`}
        />
      )}

      <Pin
        pinned={Boolean(dropdownIsOpen && dropdownItems.length)}
        to={input}
        at="bottomLeft"
        from="topLeft"
        style={{width: inputWidth}}>
        <View
          ref={dropdown as any}
          style={[pal.view, pal.borderDark, styles.dropdown]}
          role={'listbox' as any}
          id="tags-autocomplete-dropdown">
          {dropdownItems.map((item, index) => {
            const isFirst = index === 0
            const isLast = index === dropdownItems.length - 1
            return (
              <Pressable
                accessibilityRole="button"
                key={item.value}
                onPress={() => addTagAndReset(item.value)}
                style={state => [
                  pal.border,
                  styles.dropdownItem,
                  {
                    backgroundColor: state.hovered
                      ? pal.viewLight.backgroundColor
                      : undefined,
                  },
                  selectedItemIndex === index ? pal.viewLight : undefined,
                  isFirst
                    ? styles.firstResult
                    : isLast
                    ? styles.lastResult
                    : undefined,
                ]}>
                <Text type="md" style={pal.textLight} numberOfLines={1}>
                  {item.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </Pin>
    </View>
  )
}

const styles = StyleSheet.create({
  outer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flexGrow: 1,
    minWidth: 100,
    fontSize: 15,
    lineHeight: Platform.select({
      web: 20,
      native: 18,
    }),
    paddingTop: 4,
    paddingBottom: 4,
  },
  dropdown: {
    width: '100%',
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'solid',
    padding: 4,
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  firstResult: {
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  lastResult: {
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
})
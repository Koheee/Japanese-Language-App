import { useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, shadows, spacing, typography } from '../theme/tokens';
import {
  createLessonQuickSwitchOptions,
  resolveLessonQuickSwitchSelection,
  type LessonQuickSwitchLesson,
} from './lessonQuickSwitcherModel';

const ROW_HEIGHT = 72;

interface LessonQuickSwitcherProps {
  currentLessonId: string;
  disabled?: boolean;
  lessons: LessonQuickSwitchLesson[];
  onSelect: (lessonId: string) => void;
}

export function LessonQuickSwitcher({
  currentLessonId,
  disabled = false,
  lessons,
  onSelect,
}: LessonQuickSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [triggerFocused, setTriggerFocused] = useState(false);
  const [focusedLessonId, setFocusedLessonId] = useState<string | null>(null);
  const triggerRef = useRef<View>(null);
  const insets = useSafeAreaInsets();
  const options = useMemo(
    () => createLessonQuickSwitchOptions(lessons, currentLessonId),
    [currentLessonId, lessons],
  );
  const currentOption = options.find((option) => option.selected);
  const currentIndex = options.findIndex((option) => option.selected);
  const triggerAccessibilityLabel = currentOption
    ? `Choose another lesson; current ${currentOption.accessibilityLabel}`
    : 'Choose a lesson';

  const restoreTriggerFocus = () => {
    requestAnimationFrame(() => {
      if (Platform.OS === 'web') {
        (triggerRef.current as unknown as { focus?: () => void } | null)?.focus?.();
        return;
      }
      const handle = findNodeHandle(triggerRef.current);
      if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
    });
  };

  const close = () => {
    setOpen(false);
    setFocusedLessonId(null);
    if (Platform.OS !== 'ios') restoreTriggerFocus();
  };

  const choose = (selectedLessonId: string) => {
    const decision = resolveLessonQuickSwitchSelection(
      options,
      currentLessonId,
      selectedLessonId,
    );
    close();
    if (decision.type === 'select') onSelect(decision.lessonId);
  };

  return (
    <>
      <Pressable
        accessibilityHint="Opens a list of Lessons 1 through 25"
        accessibilityLabel={triggerAccessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        disabled={disabled}
        onBlur={() => setTriggerFocused(false)}
        onFocus={() => setTriggerFocused(true)}
        onPress={() => setOpen(true)}
        ref={triggerRef}
        style={({ pressed }) => [
          styles.trigger,
          triggerFocused && styles.focused,
          disabled && styles.disabled,
          pressed && !disabled && styles.pressed,
        ]}
      >
        <View style={styles.triggerCopy}>
          <Text style={styles.eyebrow}>JUMP TO LESSON</Text>
          <Text numberOfLines={1} style={styles.triggerJapanese}>
            {currentOption
              ? `${currentOption.numberLabel} · ${currentOption.japaneseTitle}`
              : 'Choose a lesson'}
          </Text>
          {currentOption ? (
            <Text numberOfLines={1} style={styles.triggerEnglish}>{currentOption.title}</Text>
          ) : null}
        </View>
        <Text
          accessibilityElementsHidden
          aria-hidden={true}
          importantForAccessibility="no"
          style={styles.chevron}
        >
          ▾
        </Text>
      </Pressable>

      <Modal
        animationType="fade"
        onDismiss={Platform.OS === 'ios' ? restoreTriggerFocus : undefined}
        onRequestClose={close}
        statusBarTranslucent
        transparent
        visible={open}
      >
        <View
          accessibilityLabel="Choose a lesson"
          accessibilityViewIsModal
          aria-modal={true}
          onAccessibilityEscape={close}
          role="dialog"
          style={[
            styles.overlay,
            {
              paddingTop: Math.max(insets.top, spacing.lg),
              paddingBottom: Math.max(insets.bottom, spacing.lg),
            },
          ]}
        >
          <Pressable
            accessibilityLabel="Close lesson chooser"
            accessibilityRole="button"
            onPress={close}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleCopy}>
                <Text style={styles.sheetEyebrow}>LESSONS 01–25</Text>
                <Text style={styles.sheetTitle}>Choose a lesson</Text>
              </View>
              <Pressable
                accessibilityLabel="Close choose-a-lesson menu"
                accessibilityRole="button"
                onPress={close}
                style={({ pressed }) => [styles.close, pressed && styles.pressed]}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            <FlatList
              data={options}
              getItemLayout={(_, index) => ({
                index,
                length: ROW_HEIGHT,
                offset: ROW_HEIGHT * index,
              })}
              initialScrollIndex={Math.max(currentIndex, 0)}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  accessibilityHint={item.selected
                    ? 'Closes the lesson chooser'
                    : 'Opens this lesson in the current section'}
                  accessibilityLabel={item.accessibilityLabel}
                  accessibilityRole="button"
                  accessibilityState={{ selected: item.selected }}
                  aria-selected={item.selected}
                  onBlur={() => setFocusedLessonId((value) => value === item.id ? null : value)}
                  onFocus={() => setFocusedLessonId(item.id)}
                  onPress={() => choose(item.id)}
                  style={({ pressed }) => [
                    styles.row,
                    item.selected && styles.rowSelected,
                    focusedLessonId === item.id && styles.focused,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.number, item.selected && styles.numberSelected]}>
                    <Text style={[styles.numberText, item.selected && styles.numberTextSelected]}>
                      {item.numberLabel}
                    </Text>
                  </View>
                  <View style={styles.rowCopy}>
                    <Text numberOfLines={1} style={styles.rowJapanese}>{item.japaneseTitle}</Text>
                    <Text numberOfLines={1} style={styles.rowEnglish}>{item.title}</Text>
                  </View>
                  {item.selected ? (
                    <Text
                      accessibilityElementsHidden
                      aria-hidden={true}
                      importantForAccessibility="no"
                      style={styles.check}
                    >
                      ✓
                    </Text>
                  ) : null}
                </Pressable>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 72,
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.line,
  },
  triggerCopy: { flex: 1, gap: 2 },
  eyebrow: { color: colors.coral, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1.2 },
  triggerJapanese: { color: colors.ink, fontSize: typography.body, fontWeight: '800' },
  triggerEnglish: { color: colors.inkMuted, fontSize: typography.small },
  chevron: { color: colors.forest, fontSize: typography.heading, fontWeight: '900' },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(36, 48, 42, 0.52)',
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '82%',
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: colors.paper,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  sheetHeader: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sheetTitleCopy: { flex: 1, gap: 2 },
  sheetEyebrow: { color: colors.coral, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1.2 },
  sheetTitle: { color: colors.ink, fontSize: typography.title, fontWeight: '900' },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceStrong,
  },
  closeText: { color: colors.forest, fontSize: typography.title, lineHeight: 27, fontWeight: '700' },
  row: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line, borderWidth: 2, borderColor: 'transparent' },
  rowSelected: { backgroundColor: colors.forestSoft },
  number: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.surfaceStrong },
  numberSelected: { backgroundColor: colors.forest },
  numberText: { color: colors.ink, fontSize: typography.small, fontWeight: '900' },
  numberTextSelected: { color: colors.white },
  rowCopy: { flex: 1, gap: 2 },
  rowJapanese: { color: colors.ink, fontSize: typography.body, fontWeight: '800' },
  rowEnglish: { color: colors.inkMuted, fontSize: typography.small },
  check: { color: colors.forest, fontSize: typography.heading, fontWeight: '900' },
  focused: { borderColor: colors.gold },
  disabled: { opacity: 0.38 },
  pressed: { opacity: 0.78 },
});

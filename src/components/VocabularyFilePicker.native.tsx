import { PrimaryButton } from './PrimaryButton';
import type { VocabularyFilePickerProps } from './VocabularyFilePicker';

export function VocabularyFilePicker(_props: VocabularyFilePickerProps) {
  return (
    <PrimaryButton
      accessibilityHint="Import is available in the installed web app."
      accessibilityLabel="Import vocabulary backup unavailable"
      disabled
      label="Import"
      onPress={() => undefined}
      variant="secondary"
    />
  );
}

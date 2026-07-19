export interface VocabularyFilePickerProps {
  onReadStart(): boolean;
  onReadFinish(): void;
  onPick(bytes: Uint8Array, fileName: string): void;
  onError(message: string): void;
  disabled?: boolean;
}

export function VocabularyFilePicker(
  props: VocabularyFilePickerProps,
): React.ReactElement;

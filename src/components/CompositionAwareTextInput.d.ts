import { TextInputProps } from 'react-native';

export interface CompositionAwareTextInputProps extends Omit<
  TextInputProps,
  'value' | 'onChange' | 'onChangeText' | 'onEndEditing'
> {
  value: string;
  onDraftChange(value: string): void;
  onCommittedChange(value: string): void;
  onCompositionChange?(isComposing: boolean): void;
}

export function CompositionAwareTextInput(
  props: CompositionAwareTextInputProps,
): React.ReactElement;

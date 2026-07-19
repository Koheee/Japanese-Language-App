import { TextInput, TextInputProps } from 'react-native';

export interface CompositionAwareTextInputProps extends Omit<
  TextInputProps,
  'value' | 'onChange' | 'onChangeText' | 'onEndEditing'
> {
  value: string;
  onDraftChange(value: string): void;
  onCommittedChange(value: string): void;
  onCompositionChange?(isComposing: boolean): void;
}

export function CompositionAwareTextInput({
  value,
  onDraftChange,
  onCommittedChange,
  onCompositionChange,
  ...props
}: CompositionAwareTextInputProps) {
  return (
    <TextInput
      {...props}
      value={value}
      onChangeText={onDraftChange}
      onEndEditing={(event) => {
        onCommittedChange(event.nativeEvent.text);
        onCompositionChange?.(false);
      }}
    />
  );
}

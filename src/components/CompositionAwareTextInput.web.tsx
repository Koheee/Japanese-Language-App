import { ComponentType, ChangeEvent, CompositionEvent, FocusEvent, useRef } from 'react';
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

type WebChangeEvent = ChangeEvent<HTMLInputElement> & { nativeEvent: InputEvent };
type WebTextInputProps = Omit<TextInputProps, 'onBlur' | 'onChange'> & {
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  onChange?: (event: WebChangeEvent) => void;
  onCompositionStart?: (event: CompositionEvent<HTMLInputElement>) => void;
  onCompositionEnd?: (event: CompositionEvent<HTMLInputElement>) => void;
};

const WebTextInput = TextInput as unknown as ComponentType<WebTextInputProps>;

export function CompositionAwareTextInput({
  value,
  onDraftChange,
  onCommittedChange,
  onCompositionChange,
  onBlur,
  ...props
}: CompositionAwareTextInputProps) {
  const composingRef = useRef(false);

  return (
    <WebTextInput
      {...props}
      value={value}
      onChange={(event) => {
        const nextValue = event.currentTarget.value;
        onDraftChange(nextValue);
        if (!composingRef.current && !event.nativeEvent.isComposing) {
          onCommittedChange(nextValue);
        }
      }}
      onCompositionStart={() => {
        composingRef.current = true;
        onCompositionChange?.(true);
      }}
      onCompositionEnd={(event) => {
        composingRef.current = false;
        const nextValue = event.currentTarget.value;
        onDraftChange(nextValue);
        onCommittedChange(nextValue);
        onCompositionChange?.(false);
      }}
      onBlur={(event) => {
        if (!composingRef.current) onCommittedChange(event.currentTarget.value);
        onBlur?.(event as unknown as Parameters<NonNullable<TextInputProps['onBlur']>>[0]);
      }}
    />
  );
}

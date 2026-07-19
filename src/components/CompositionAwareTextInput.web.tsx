import { useEffect, useRef } from 'react';
import { TextInput, TextInputProps } from 'react-native';

import {
  CompositionCommitCallbacks,
  CompositionCommitController,
  attachCompositionListeners,
  createCompositionCommitController,
  isCompositionHost,
} from './compositionCommitController';

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
  onBlur,
  ...props
}: CompositionAwareTextInputProps) {
  const callbacksRef = useRef<CompositionCommitCallbacks>({
    onDraftChange,
    onCommittedChange,
    onCompositionChange,
  });
  callbacksRef.current = { onDraftChange, onCommittedChange, onCompositionChange };
  const controllerRef = useRef<CompositionCommitController | null>(null);
  const controller = controllerRef.current ??= createCompositionCommitController(
    value,
    () => callbacksRef.current,
  );
  controller.syncDraft(value);
  const hostRef = useRef<TextInput | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!isCompositionHost(host)) return undefined;
    return attachCompositionListeners(host, controller);
  }, [controller, props.multiline]);

  return (
    <TextInput
      {...props}
      ref={hostRef}
      value={value}
      onChange={(event) => {
        controller.change(event.nativeEvent.text);
      }}
      onBlur={(event) => {
        const host = hostRef.current;
        if (isCompositionHost(host)) controller.blur(host.value);
        onBlur?.(event);
      }}
    />
  );
}

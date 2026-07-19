import { ChangeEvent, CSSProperties, useEffect, useId, useRef, useState } from 'react';

import { readPickedVocabularyFile } from '../services/webFileTransferCore';
import { colors, radii, spacing, typography } from '../theme/tokens';
import type { VocabularyFilePickerProps } from './VocabularyFilePicker';

const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export function VocabularyFilePicker({
  onPick,
  onError,
  disabled = false,
}: VocabularyFilePickerProps) {
  const inputId = useId();
  const hintId = useId();
  const mountedRef = useRef(true);
  const [focused, setFocused] = useState(false);
  const [reading, setReading] = useState(false);
  const unavailable = disabled || reading;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0] ?? null;
    const fileName = file?.name ?? '';
    if (disabled) {
      input.value = '';
      return;
    }
    setReading(true);
    try {
      const result = await readPickedVocabularyFile(file);
      if (result.status === 'picked') onPick(result.bytes, fileName);
      if (result.status === 'error') onError(result.message);
    } finally {
      input.value = '';
      if (mountedRef.current) setReading(false);
    }
  };

  const buttonStyle: CSSProperties = {
    minHeight: 44,
    minWidth: 44,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `0 ${spacing.lg}px`,
    color: colors.forest,
    fontSize: typography.small,
    fontWeight: 800,
    backgroundColor: colors.forestSoft,
    border: `2px solid ${focused ? colors.gold : 'transparent'}`,
    borderRadius: radii.md,
    cursor: unavailable ? 'default' : 'pointer',
    opacity: unavailable ? 0.38 : 1,
    boxSizing: 'border-box',
  };

  return (
    <>
      <label aria-disabled={unavailable} htmlFor={inputId} style={buttonStyle}>
        {reading ? 'Reading...' : 'Import'}
      </label>
      <input
        accept="application/json,.json"
        aria-describedby={hintId}
        aria-label="Import vocabulary backup"
        disabled={unavailable}
        id={inputId}
        onBlur={() => setFocused(false)}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        style={visuallyHidden}
        type="file"
      />
      <span id={hintId} style={visuallyHidden}>Choose a JSON vocabulary backup from this device.</span>
    </>
  );
}

import type { StyleProp, TextStyle } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import type { HighlightSegment } from '../search/types';
import { colors } from '../theme/tokens';

interface Props {
  segments: readonly HighlightSegment[];
  style?: StyleProp<TextStyle>;
}

export function HighlightedText({ segments, style }: Props) {
  return (
    <Text style={style}>
      {segments.map((segment, index) => (
        <Text
          key={`${index}-${segment.text}`}
          style={segment.highlighted ? styles.highlighted : undefined}
        >
          {segment.text}
        </Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  highlighted: {
    backgroundColor: colors.goldSoft,
    color: colors.ink,
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
});


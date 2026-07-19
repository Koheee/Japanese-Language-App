import { referenceInfluences } from '../content/referenceInfluences';
import { colors, radii, spacing, typography } from '../theme/tokens';

export const referenceInfluencesCardPresentation = {
  heading: referenceInfluences.heading,
  paragraphs: [
    referenceInfluences.body,
    referenceInfluences.license,
    referenceInfluences.originality,
    referenceInfluences.nonEndorsement,
  ],
  links: referenceInfluences.links.map((link) => ({
    ...link,
    accessibilityRole: 'link' as const,
    accessibilityLabel: `${link.title}; opens an external site`,
  })),
  errorAccessibility: {
    accessibilityRole: 'alert' as const,
    accessibilityLiveRegion: 'assertive' as const,
  },
} as const;

export interface ReferenceActionVisualState {
  focused: boolean;
  pressed: boolean;
}

const referenceActionBaseStyle = {
  minHeight: 44,
  width: '100%',
  alignItems: 'flex-start',
  justifyContent: 'center',
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: radii.md,
  borderWidth: 2,
  borderColor: 'transparent',
  backgroundColor: colors.surfaceStrong,
} as const;

export const projectReferenceActionStyle = ({
  focused,
  pressed,
}: ReferenceActionVisualState) => ({
  ...referenceActionBaseStyle,
  borderColor: focused ? colors.forest : referenceActionBaseStyle.borderColor,
  backgroundColor: pressed ? colors.forestSoft : referenceActionBaseStyle.backgroundColor,
});

export const referenceActionTextStyle = {
  width: '100%',
  flexShrink: 1,
  color: colors.forest,
  fontSize: typography.small,
  fontWeight: '800',
  lineHeight: 20,
  textDecorationLine: 'underline',
} as const;

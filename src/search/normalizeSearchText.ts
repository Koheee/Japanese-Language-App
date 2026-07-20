interface SourceOffset {
  start: number;
  end: number;
}

export interface NormalizedSearchText {
  text: string;
  offsets: SourceOffset[];
}

const punctuationOrSymbol = /[\p{P}\p{S}]/u;
const whitespace = /\s/u;

const katakanaToHiragana = (character: string): string => {
  const codePoint = character.codePointAt(0);
  if (codePoint === undefined) return character;
  if (codePoint >= 0x30a1 && codePoint <= 0x30f6) {
    return String.fromCodePoint(codePoint - 0x60);
  }
  return character;
};

export function normalizeSearchTextWithOffsets(source: string): NormalizedSearchText {
  const units: string[] = [];
  const offsets: SourceOffset[] = [];
  let sourceIndex = 0;

  const append = (text: string, offset: SourceOffset) => {
    for (let index = 0; index < text.length; index += 1) {
      units.push(text.charAt(index));
      offsets.push(offset);
    }
  };

  for (const originalCharacter of source) {
    const originalEnd = sourceIndex + originalCharacter.length;
    const normalized = originalCharacter.normalize('NFKC').toLowerCase();
    for (const normalizedCharacter of normalized) {
      const converted = katakanaToHiragana(normalizedCharacter);
      const isSeparator = whitespace.test(converted) || punctuationOrSymbol.test(converted);
      if (isSeparator) {
        if (units.length > 0 && units.at(-1) !== ' ') {
          append(' ', { start: sourceIndex, end: originalEnd });
        }
      } else {
        append(converted, { start: sourceIndex, end: originalEnd });
      }
    }
    sourceIndex = originalEnd;
  }

  while (units.at(-1) === ' ') {
    units.pop();
    offsets.pop();
  }
  let start = 0;
  while (units[start] === ' ') start += 1;

  return {
    text: units.slice(start).join(''),
    offsets: offsets.slice(start),
  };
}

export const normalizeSearchText = (source: string): string => {
  const units: string[] = [];
  for (const character of source.normalize('NFKC').toLowerCase()) {
    const converted = katakanaToHiragana(character);
    const isSeparator = whitespace.test(converted) || punctuationOrSymbol.test(converted);
    if (isSeparator) {
      if (units.length > 0 && units.at(-1) !== ' ') units.push(' ');
    } else {
      units.push(converted);
    }
  }
  while (units.at(-1) === ' ') units.pop();
  return units.join('');
};

export function findOriginalMatchRange(source: string, normalizedQuery: string) {
  const normalized = normalizeSearchTextWithOffsets(source);
  const normalizedStart = normalized.text.indexOf(normalizedQuery);
  if (normalizedStart < 0 || normalizedQuery.length === 0) return null;
  const first = normalized.offsets[normalizedStart];
  const last = normalized.offsets[normalizedStart + normalizedQuery.length - 1];
  if (!first || !last) return null;
  return { start: first.start, end: last.end, normalizedStart };
}

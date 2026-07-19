import manifest from './grammarReferences.json';
import type { FurtherReading } from '../models/content';
import { FROZEN_GRAMMAR_IDS } from './lessons/grammarInventory';
import type { GrammarId } from './lessons/grammarInventory';

export const grammarReferences = manifest as Readonly<Record<GrammarId, readonly FurtherReading[]>>;

if (Object.keys(grammarReferences).join('\n') !== FROZEN_GRAMMAR_IDS.join('\n')) {
  throw new Error('Grammar reference manifest keys do not match the frozen grammar inventory.');
}

export const getGrammarReferences = (grammarId: string): readonly FurtherReading[] => {
  const references = grammarReferences[grammarId as GrammarId];
  if (!references) throw new Error(`Missing grammar reference manifest entry: ${grammarId}`);
  return references;
};

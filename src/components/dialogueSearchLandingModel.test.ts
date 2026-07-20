import { describe, expect, it } from 'vitest';

import { resolveDialogueGrammarLanding } from './dialogueGrammarNotesModel';

describe('dialogue grammar-note search landing', () => {
  it('opens only a valid requested grammar note', () => {
    expect(resolveDialogueGrammarLanding('l01-topic-desu', ['l01-topic-desu'])).toBe('l01-topic-desu');
    expect(resolveDialogueGrammarLanding('missing', ['l01-topic-desu'])).toBeNull();
    expect(resolveDialogueGrammarLanding(undefined, ['l01-topic-desu'])).toBeNull();
  });
});


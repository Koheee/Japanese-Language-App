import { describe, expect, it } from 'vitest';

import { applyGrammarSearchLanding, createGrammarCardState } from './grammarCardPresentation';

describe('grammar card search landing', () => {
  it('opens only the collapsed subsection containing the match', () => {
    expect(applyGrammarSearchLanding(createGrammarCardState(), 'insight')).toMatchObject({ insightExpanded: true });
    expect(applyGrammarSearchLanding(createGrammarCardState(), 'deeper')).toMatchObject({ deeperExpanded: true });
    expect(applyGrammarSearchLanding(createGrammarCardState(), 'examples')).toEqual(createGrammarCardState());
  });
});


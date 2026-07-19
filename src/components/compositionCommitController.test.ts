import { describe, expect, it } from 'vitest';

import {
  attachCompositionListeners,
  createCompositionCommitController,
} from './compositionCommitController';

describe('composition commit controller', () => {
  it('separates composition drafts from deduplicated committed values', () => {
    const drafts: string[] = [];
    const commits: string[] = [];
    const compositionStates: boolean[] = [];
    const controller = createCompositionCommitController('', () => ({
      onDraftChange: (value) => drafts.push(value),
      onCommittedChange: (value) => commits.push(value),
      onCompositionChange: (isComposing) => compositionStates.push(isComposing),
    }));

    controller.compositionStart();
    controller.change('n');
    controller.syncDraft('n');
    controller.change('に');

    expect(compositionStates).toEqual([true]);
    expect(drafts).toEqual(['n', 'に']);
    expect(commits).toEqual([]);

    controller.compositionEnd('に');
    controller.change('に');
    controller.blur('に');
    controller.compositionEnd('に');

    expect(compositionStates).toEqual([true, false]);
    expect(drafts).toEqual(['n', 'に']);
    expect(commits).toEqual(['に']);

    controller.change('normal');
    controller.change('normal');
    controller.blur('normal');
    controller.compositionEnd('normal');

    expect(drafts).toEqual(['n', 'に', 'normal']);
    expect(commits).toEqual(['に', 'normal']);
  });

  it('uses fresh callbacks and removes host composition listeners', () => {
    const firstStates: boolean[] = [];
    const latestStates: boolean[] = [];
    const commits: string[] = [];
    let callbacks = {
      onDraftChange: () => undefined,
      onCommittedChange: (value: string) => commits.push(value),
      onCompositionChange: (isComposing: boolean) => firstStates.push(isComposing),
    };
    const controller = createCompositionCommitController('', () => callbacks);
    const host = Object.assign(new EventTarget(), { value: '' });
    const cleanup = attachCompositionListeners(host, controller);

    host.dispatchEvent(new Event('compositionstart'));
    callbacks = {
      ...callbacks,
      onCompositionChange: (isComposing) => latestStates.push(isComposing),
    };
    host.value = '語';
    controller.change('語');
    host.dispatchEvent(new Event('compositionend'));

    expect(firstStates).toEqual([true]);
    expect(latestStates).toEqual([false]);
    expect(commits).toEqual(['語']);

    cleanup();
    host.value = '後';
    host.dispatchEvent(new Event('compositionstart'));
    host.dispatchEvent(new Event('compositionend'));

    expect(firstStates).toEqual([true]);
    expect(latestStates).toEqual([false]);
    expect(commits).toEqual(['語']);
  });
});

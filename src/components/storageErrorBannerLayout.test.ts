import { describe, expect, it } from 'vitest';

import { getStorageErrorNavigatorOffset } from './storageErrorBannerLayout';

describe('getStorageErrorNavigatorOffset', () => {
  it('offsets navigation by the measured banner body without a second safe inset', () => {
    const safeAreaTop = 47;
    const portraitBodyHeight = 52;
    const landscapeBodyHeight = 38;

    expect(getStorageErrorNavigatorOffset(true, portraitBodyHeight)).toBe(portraitBodyHeight);
    expect(getStorageErrorNavigatorOffset(true, portraitBodyHeight)).not.toBe(
      safeAreaTop + portraitBodyHeight,
    );
    expect(getStorageErrorNavigatorOffset(true, landscapeBodyHeight)).toBe(landscapeBodyHeight);
    expect(getStorageErrorNavigatorOffset(false, landscapeBodyHeight)).toBe(0);
  });
});

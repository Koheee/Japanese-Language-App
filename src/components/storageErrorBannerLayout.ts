export const getStorageErrorNavigatorOffset = (
  isVisible: boolean,
  measuredBodyHeight: number,
) => isVisible ? Math.max(0, measuredBodyHeight) : 0;

const SIZE_ORDER = [
  'xxs',
  'xs',
  's',
  'm',
  'l',
  'xl',
  'xxl',
  'xxxl',
  'xxxxl',
  'os',
];
const sizeOrderMap = new Map(SIZE_ORDER.map((s, i) => [s, i]));

export const sortSizes = (entries: any[]) => {
  return entries.sort((a, b) => {
    const aVal = typeof a === 'string' ? a : a.size || a.option1Value || a[0];
    const bVal = typeof b === 'string' ? b : b.size || b.option1Value || b[0];
    const aNum = parseFloat(aVal);
    const bNum = parseFloat(bVal);
    const isANum = !isNaN(aNum);
    const isBNum = !isNaN(bNum);

    if (isANum && isBNum) return aNum - bNum;
    if (!isANum && !isBNum) {
      const aIndex = sizeOrderMap.get(String(aVal).toLowerCase()) ?? 999;
      const bIndex = sizeOrderMap.get(String(bVal).toLowerCase()) ?? 999;
      return aIndex - bIndex;
    }
    return isANum ? 1 : -1; // label first, number after
  });
};

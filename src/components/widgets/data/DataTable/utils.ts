/**
 * Returns Tailwind classes for frozen (sticky) columns.
 * Only applies when the table is in scrollable mode.
 */
export const getFrozenColumnClasses = (
  isScrollable: boolean,
  frozen: "left" | "right" | undefined,
  isHeader: boolean,
  leftOffset?: string,
): string => {
  if (!isScrollable || !frozen) return "";
  const zIndex = isHeader ? "z-20" : "z-10";
  if (frozen === "left")
    return `sticky ${leftOffset ?? "left-0"} ${zIndex} bg-card shadow-[2px_0_4px_-1px_rgba(0,0,0,0.1)]`;
  if (frozen === "right")
    return `sticky right-0 ${zIndex} bg-card shadow-[-2px_0_4px_-1px_rgba(0,0,0,0.1)]`;
  return "";
};

export const getActionsColumnClasses = (
  isScrollable: boolean,
  isHeader: boolean,
): string => {
  if (!isScrollable) return "";
  return `sticky right-0 ${isHeader ? "z-20" : "z-10"} bg-card shadow-[-2px_0_4px_-1px_rgba(0,0,0,0.1)]`;
};

export const getCheckboxColumnClasses = (
  isScrollable: boolean,
  isHeader: boolean,
): string => {
  if (!isScrollable) return "";
  return `sticky left-0 ${isHeader ? "z-20" : "z-10"} bg-card`;
};

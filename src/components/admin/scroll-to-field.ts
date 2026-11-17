/** Scroll only the nearest scrolling container (e.g. a modal body) so `element` sits near its top.
 * Unlike scrollIntoView, this never shifts the modal frame or the page behind it. */
export function scrollToField(element: HTMLElement | null) {
  if (!element) return;
  let container = element.parentElement;
  while (container && !(container.scrollHeight > container.clientHeight && /auto|scroll/.test(getComputedStyle(container).overflowY))) container = container.parentElement;
  if (!container) return;
  const offset = element.getBoundingClientRect().top - container.getBoundingClientRect().top;
  container.scrollTo({ top: container.scrollTop + offset - 16, behavior: "smooth" });
}

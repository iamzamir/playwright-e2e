import type { Page } from '@playwright/test';

/**
 * DOM Cleaner utility.
 *
 * Produces compact, token-efficient representations of a live page so that AI
 * assistants (POM authoring, self-healing) can reason over the structure
 * without ingesting a raw multi-hundred-KB DOM.
 *
 * - `getAccessibilityTree` returns Playwright's ARIA snapshot of the page body.
 * - `getCleanDom` returns a stripped HTML string that keeps only the attributes
 *   our locator hierarchy relies on (`getByRole` > `getByTestId` > `getByLabel`
 *   > `getByPlaceholder`/`getByText`), drops invisible and non-UI nodes, and
 *   flattens redundant wrapper containers.
 */

/**
 * Capture a simplified accessibility snapshot of the page using the ARIA
 * snapshot API. Best for reasoning about roles and accessible names.
 */
export async function getAccessibilityTree(page: Page): Promise<string> {
  return await page.locator('body').ariaSnapshot();
}

/**
 * Return a highly-simplified HTML representation of the current page DOM.
 *
 * Strips scripts, styles, SVG path data, and invisible/empty layout
 * containers, keeping attributes relevant for building locators
 * (id, class, data-testid, name, placeholder, role, aria-*, etc.).
 */
export async function getCleanDom(page: Page): Promise<string> {
  return await page.evaluate(() => {
    interface CleanNode {
      type: 'element' | 'text';
      tagName?: string;
      attributes?: Record<string, string>;
      text?: string;
      children: CleanNode[];
    }

    function cleanNode(node: Node): CleanNode | null {
      // Handle text nodes.
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim() || '';
        return text ? { type: 'text', text, children: [] } : null;
      }

      // Skip non-element nodes (comments, document types, etc.).
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return null;
      }

      const el = node as HTMLElement;
      const tagName = el.tagName.toLowerCase();

      // Blacklist non-UI/overhead tags.
      const tagBlacklist = ['script', 'style', 'noscript', 'iframe', 'head', 'link', 'meta'];
      if (tagBlacklist.includes(tagName)) {
        return null;
      }

      // Check visibility (skip elements that are hidden/zero size).
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const isVisible = rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      if (!isVisible) {
        return null;
      }

      // Extract only the attributes we care about for creating locators.
      // Ordered to reflect our locator hierarchy: role/aria first, then
      // testid, then label/placeholder/name, then structural fallbacks.
      const attrs: Record<string, string> = {};
      const allowedAttrs = [
        'role', 'aria-label', 'aria-labelledby', 'aria-expanded', 'aria-selected',
        'data-testid', 'data-qa',
        'name', 'placeholder', 'type', 'value', 'disabled',
        'id', 'class', 'href'
      ];

      for (const attr of allowedAttrs) {
        if (!el.hasAttribute(attr)) {
          continue;
        }
        // Never capture user-entered values from text-bearing fields — they
        // can contain PII or secrets that would leak into failure artifacts.
        if (attr === 'value') {
          const inputType = (el.getAttribute('type') || 'text').toLowerCase();
          const isTextBearing = tagName === 'textarea' ||
            (tagName === 'input' && !['button', 'submit', 'reset', 'checkbox', 'radio'].includes(inputType));
          if (isTextBearing) {
            continue;
          }
        }
        attrs[attr] = el.getAttribute(attr) || '';
      }

      // Special case for SVG: strip paths, keep only structure and any
      // accessibility attributes.
      if (tagName === 'svg') {
        const role = el.getAttribute('role') || 'img';
        const ariaLabel = el.getAttribute('aria-label') || '';
        const className = el.getAttribute('class') || '';
        return {
          type: 'element',
          tagName: 'svg',
          attributes: {
            ...(role ? { role } : {}),
            ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
            ...(className ? { class: className } : {})
          },
          children: []
        };
      }

      // Recursively clean child nodes.
      const children: CleanNode[] = [];
      for (let i = 0; i < el.childNodes.length; i++) {
        const childVal = cleanNode(el.childNodes[i]);
        if (childVal) {
          children.push(childVal);
        }
      }

      // Filter out redundant containers to reduce token size. A div or span
      // with no relevant attributes, no text, and 0 or 1 children can be
      // flattened.
      const hasSemanticAttr = attrs.role || attrs['data-testid'] || attrs['data-qa'] || attrs.id || attrs.name || attrs.placeholder || attrs['aria-label'];

      if ((tagName === 'div' || tagName === 'span') && !hasSemanticAttr) {
        if (children.length === 0) {
          return null;
        }
        // If it only wraps a single element, bypass the wrapper.
        if (children.length === 1 && children[0].type === 'element') {
          return children[0];
        }
      }

      return {
        type: 'element',
        tagName,
        attributes: attrs,
        children
      };
    }

    function serializeToHtml(node: CleanNode): string {
      if (node.type === 'text') {
        return (node.text || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }

      const attrStr = Object.entries(node.attributes || {})
        .map(([k, v]) => ` ${k}="${v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}"`)
        .join('');

      const childrenStr = node.children
        .map(c => serializeToHtml(c))
        .join('');

      return `<${node.tagName}${attrStr}>${childrenStr}</${node.tagName}>`;
    }

    const cleaned = cleanNode(document.body);
    return cleaned ? serializeToHtml(cleaned) : '';
  });
}

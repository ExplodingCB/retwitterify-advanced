/* SPDX-License-Identifier: MPL-2.0 */
(() => {
  "use strict";
  const api = globalThis.ReTwitterify;
  const blocked = [
    "script", "style", "noscript", "code", "pre", "select",
    '[contenteditable]:not([contenteditable="false"])', '[role="textbox"]',
    '[translate="no"]', '[data-retwitterify-ignore]',
    '[aria-label="Close"]', '[data-testid="app-bar-close"]',
    '[data-testid="tweetText"]', '[data-testid="UserName"]', '[data-testid="User-Name"]',
    '[data-testid="UserDescription"]', '[data-testid="UserLocation"]', '[data-testid="UserUrl"]',
    '[data-testid="DMConversationEntry"]', '[data-testid="messageEntry"]', '[data-testid="dmMessage"]',
    '[data-testid="conversation"]', '[data-testid="card.wrapper"]', '[data-testid="trend"]',
    '[data-testid="list-name"]', '[data-testid="list-description"]', '[data-testid="communityName"]',
    '[data-testid="GrokDrawer"]', '[data-testid="grokConversation"]',
    '[data-testid="UserProfileHeader_Items"]', '[data-testid="UserCell"] [dir="auto"]'
  ].join(",");
  const uiContext = [
    "header", "nav", "footer", "button", "h1", "h2", "h3", "label",
    '[role="heading"]', '[role="button"]', '[role="tab"]', '[role="menuitem"]',
    '[role="dialog"]', '[role="tooltip"]', '[role="status"]', '[role="alert"]',
    '[data-testid="emptyState"]', '[data-testid="socialContext"]'
  ].join(",");
  const attributes = ["aria-label", "title", "placeholder", "alt"];
  const svgNS = "http://www.w3.org/2000/svg";
  const xPaths = ["M18.2442.25h3.308", "M18.9011.153h3.68", "M21.74221.75l-7.563", "M285.38207.711L462.9541.5"];
  // Places that only ever hold the site logo, whatever shape X draws there next.
  const logoSlots = [
    'a[aria-label="X"]', 'a[aria-label="Twitter"]', 'h1 a[href="/home"]', 'h1 a[href="/"]',
    '[role="banner"] h1', "#placeholder"
  ].join(",");

  function start(document, initialOptions, assetURL) {
    const win = document.defaultView;
    let options = api.settings(initialOptions);
    let timer = null;
    let removed = false;
    const pending = new Set();
    const journal = new Map();
    const ownNodes = new Set();
    const knownLogos = new WeakSet();
    const knownImages = new WeakSet();
    const stats = { passes: 0, writes: 0 };

    function read(node, key) {
      return key === "#text" ? node.data : node.getAttribute(key);
    }
    function rawWrite(node, key, value) {
      if (key === "#text") node.data = value;
      else if (value === null) node.removeAttribute(key);
      else node.setAttribute(key, value);
    }
    function write(node, key, value) {
      const current = read(node, key);
      if (current === value) return;
      let entries = journal.get(node);
      if (!entries) journal.set(node, entries = new Map());
      const previous = entries.get(key);
      entries.set(key, { original: previous && current === previous.applied ? previous.original : current, applied: value });
      rawWrite(node, key, value);
      stats.writes++;
    }
    function isBlocked(element) {
      if (!element || element.closest(blocked)) return true;
      // Profile and other account headings are user content, even when named X.
      const heading = element.closest('h1,h2,h3,[role="heading"]');
      if (heading && heading.querySelector('[data-testid="UserName"],[data-testid="User-Name"]')) return true;
      return false;
    }
    function isUI(element) {
      if (isBlocked(element)) return false;
      if (element.closest('article,[data-testid="tweet"]') &&
          !element.closest('button,[role="button"],[role="menuitem"],[data-testid="socialContext"]')) return false;
      if (element.closest(uiContext)) return true;
      const link = element.closest("a[href]");
      if (link) {
        const href = link.getAttribute("href");
        if (/^\/(?:home|explore|notifications|messages|compose|settings|search|i)(?:\/|\?|$)/.test(href)) return true;
      }
      // Whole, known site labels in otherwise unlabelled React spans.
      const text = element.textContent.trim();
      return /^(?:X|X Premium\+?|Premium\+?|Subscribe to Premium|Chat|History|X Pro|X for (?:Business|Professionals)|About X|Search X|Join X today\.?|New to X\??|Sign (?:in|up) (?:to|for) X|©\s*\d{4}\s+X Corp\.?|\d[\d,.KMk]* (?:posts?|reposts?)|(?:Post|Posts|Repost|Reposts|Quote|Quote post|Post your reply|Post your answer|What's happening\?))$/.test(text) ||
        /\b(?:on|to|from|with|about|of|for|using|Join) X(?:\b|[’'])/.test(text) ||
        /^X(?:[’']s| (?:Premium|Pro|Corp|Help|Ads|API|Analytics))\b/.test(text);
    }
    function processText(node) {
      const parent = node.parentElement;
      if (!parent || !node.data.trim() || parent.closest("input,textarea") || isBlocked(parent)) return;
      if (parent.tagName === "TITLE" && parent.parentElement === document.head) {
        write(node, "#text", api.replaceTitle(node.data, options));
      } else if (parent.closest('[data-testid="notification"]') && !parent.closest('a[href],button,[role="button"]')) {
        write(node, "#text", api.replaceActivity(node.data, options));
      } else if (isUI(parent)) {
        // Repost bylines include people's names alongside site-generated verbs.
        const social = parent.closest('[data-testid="socialContext"]');
        if (social) {
          if (!parent.closest('a[href]')) write(node, "#text", api.replaceUI(node.data, { ...options, brandText: false }));
        } else write(node, "#text", api.replaceUI(node.data, options));
      }
    }

    function isXLogo(svg) {
      if (isBlocked(svg) || svg.closest('article,[data-testid="tweet"],[data-testid="UserAvatar-Container"]')) return false;
      if (knownLogos.has(svg)) return true;
      const label = svg.getAttribute("aria-label") || "";
      const icon = svg.getAttribute("data-icon") || "";
      if (/^(?:X|X logo|Twitter|Twitter logo)$/i.test(label) || /(?:^|-)logo-(?:x|twitter)(?:-|$)/.test(icon)) return true;
      if (svg.closest(logoSlots)) return true;
      return Array.from(svg.querySelectorAll("path[d]")).some(path => {
        const d = path.getAttribute("d").replace(/[\s,]+/g, "");
        return xPaths.some(prefix => d.startsWith(prefix));
      });
    }
    function processLogo(svg) {
      if (!options.logos || !isXLogo(svg)) return;
      const paths = Array.from(svg.querySelectorAll("path")).filter(p => !p.closest("defs"));
      if (!paths.length) return;
      knownLogos.add(svg);
      write(svg, "viewBox", "310 330 370 320");
      write(svg, "aria-label", "Twitter");
      for (let index = 0; index < paths.length; index++) {
        const path = paths[index];
        write(path, "d", api.birdPath);
        // Inline style also handles the new landing page's dark-mode utility classes.
        const style = path.style;
        const next = document.createElementNS(svgNS, "path");
        next.setAttribute("style", style.cssText);
        next.style.setProperty("fill", "#1da1f2", "important");
        next.style.setProperty("stroke", "none", "important");
        if (index > 0) next.style.setProperty("display", "none", "important");
        write(path, "style", next.style.cssText);
      }
    }
    function processIcon(link) {
      if (!options.logos || link.tagName !== "LINK" || !link.closest("head")) return;
      const rel = link.rel.toLowerCase().split(/\s+/);
      if (!rel.some(value => ["icon", "apple-touch-icon", "mask-icon"].includes(value))) return;
      const mask = rel.includes("mask-icon");
      const touch = rel.includes("apple-touch-icon");
      write(link, "href", assetURL(mask ? "icons/bird.svg" : touch ? "icons/icon-192.png" : "icons/icon-32.png"));
      write(link, "type", mask ? "image/svg+xml" : "image/png");
      if (!mask) write(link, "sizes", touch ? "192x192" : "32x32");
      if (link.hasAttribute("color")) write(link, "color", "#1da1f2");
    }
    function processElement(element) {
      if (isBlocked(element)) return;
      if (element.localName === "svg") processLogo(element);
      if (element.tagName === "LINK") processIcon(element);
      if (element.tagName === "IMG" && options.logos && (/^(?:X|X logo)$/.test(element.alt) || knownImages.has(element)) &&
          !element.closest('article,[data-testid="tweet"]')) {
        knownImages.add(element);
        write(element, "src", assetURL("icons/bird.svg"));
        write(element, "srcset", null);
        write(element, "alt", "Twitter");
      }
      for (const attr of attributes) {
        if (!element.hasAttribute(attr)) continue;
        // Generic media alt text and aggregate tweet labels contain user content.
        if (attr === "alt" || element.matches('img,video,audio,article,[data-testid="tweet"]')) continue;
        if (isUI(element) || element.matches('input,textarea') || attr === "placeholder" ||
            (element.localName === "svg" && /^(?:X|X logo)$/.test(element.getAttribute(attr)))) {
          write(element, attr, api.replaceUI(element.getAttribute(attr), options));
        }
      }
    }
    function scan(root) {
      if (!root.isConnected) return;
      if (root.nodeType === win.Node.TEXT_NODE) return processText(root);
      if (root.nodeType !== win.Node.ELEMENT_NODE && root.nodeType !== win.Node.DOCUMENT_NODE) return;
      if (root.nodeType === win.Node.ELEMENT_NODE) {
        if (isBlocked(root)) return;
        processElement(root);
      }
      const walker = document.createTreeWalker(root, win.NodeFilter.SHOW_ELEMENT | win.NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          return node.nodeType === win.Node.ELEMENT_NODE && node.matches(blocked)
            ? win.NodeFilter.FILTER_REJECT : win.NodeFilter.FILTER_ACCEPT;
        }
      });
      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeType === win.Node.TEXT_NODE) processText(node);
        else processElement(node);
      }
    }
    function ensureFavicon() {
      if (!options.logos || !document.head || document.head.querySelector('link[rel~="icon"]')) return;
      const icon = document.createElement("link");
      icon.rel = "icon";
      icon.href = assetURL("icons/icon-32.png");
      icon.type = "image/png";
      ownNodes.add(icon);
      document.head.append(icon);
    }
    function observe() {
      observer.observe(document, {
        subtree: true, childList: true, characterData: true, attributes: true,
        attributeFilter: [...attributes, "href", "rel", "sizes", "type", "d", "viewBox", "src", "srcset", "style", "data-testid", "role", "contenteditable"]
      });
    }
    function flush() {
      timer = null;
      if (!options.enabled) return;
      // Disconnect during our writes so the observer never reacts to itself.
      observer.disconnect();
      stats.passes++;
      try {
        const roots = [...pending].filter(node => node.isConnected);
        pending.clear();
        const candidates = new Set(roots);
        for (const root of roots) {
          let ancestor = root.parentNode;
          while (ancestor && !candidates.has(ancestor)) ancestor = ancestor.parentNode;
          if (!ancestor) scan(root);
        }
        ensureFavicon();
        if (removed) {
          for (const node of journal.keys()) if (!node.isConnected) journal.delete(node);
          for (const node of ownNodes) if (!node.isConnected) ownNodes.delete(node);
          removed = false;
        }
      } finally { observe(); }
    }
    function enqueue(node) {
      // A changed SVG path or split text span needs its whole label reconsidered.
      const element = node.nodeType === win.Node.TEXT_NODE ? node.parentElement : node;
      const root = element?.closest?.("svg") || element || node;
      pending.add(root);
      if (timer === null) timer = win.setTimeout(flush, 16);
    }
    const observer = new win.MutationObserver(records => {
      for (const record of records) {
        if (record.type === "childList") {
          // Revisit small labels; for containers scan only newly inserted subtrees.
          const element = record.target.nodeType === win.Node.ELEMENT_NODE ? record.target : null;
          if (element?.matches('title,svg,path,button,a,span,[role="button"],[role="heading"]')) enqueue(element);
          else for (const node of record.addedNodes) enqueue(node);
          if (!record.addedNodes.length && timer === null) timer = win.setTimeout(flush, 16);
          if (record.removedNodes.length) removed = true;
        } else enqueue(record.target);
      }
    });
    function restore() {
      observer.disconnect();
      if (timer !== null) win.clearTimeout(timer);
      timer = null;
      pending.clear();
      for (const [node, entries] of journal) {
        if (!node.isConnected) continue;
        for (const [key, entry] of entries) {
          // Never overwrite a newer change made by the website.
          if (read(node, key) === entry.applied) rawWrite(node, key, entry.original);
        }
      }
      journal.clear();
      for (const node of ownNodes) node.remove();
      ownNodes.clear();
    }
    function update(nextOptions) {
      restore();
      options = api.settings(nextOptions);
      if (options.enabled) { pending.add(document); flush(); }
    }
    if (options.enabled) { pending.add(document); flush(); }
    return { update, stop: restore, stats };
  }
  api.start = start;
})();

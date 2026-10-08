/* SPDX-License-Identifier: MPL-2.0 */
(() => {
  "use strict";
  const defaults = Object.freeze({ enabled: true, brandText: true, logos: true, terminology: true });

  function settings(value = {}) {
    return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) =>
      [key, typeof value?.[key] === "boolean" ? value[key] : fallback]));
  }

  // Preserve displayed URLs, hashtags and handles as well as their destinations.
  const protectedTokens = /(https?:\/\/[^\s]+|www\.[^\s]+|\b(?:[\w-]+\.)+(?:com|org|net|co|io)\b[^\s]*|[@#][\p{L}\p{N}_]+)/gu;
  // Twitter always capitalized Tweet and Retweet: "Show 31 Tweets", "Undo Retweet".
  const terms = { post: "Tweet", posts: "Tweets", posted: "Tweeted", posting: "Tweeting", repost: "Retweet", reposts: "Retweets", reposted: "Retweeted", reposting: "Retweeting" };
  // Renamed items, matched only as a whole label: "Chat", "History" and
  // "Quote" are ordinary words elsewhere.
  const labels = { Chat: "Messages", History: "Bookmarks", Quote: "Quote Tweet", Quotes: "Quote Tweets" };
  const brand = "(?<![\\p{L}\\p{N}_./@#-])";
  const products = [
    [new RegExp(`${brand}X Corp(?:oration)?\\.?(?![\\p{L}\\p{N}_-])`, "gu"), "Twitter, Inc."],
    [new RegExp(`${brand}X Pro(?![\\p{L}\\p{N}_-])`, "gu"), "TweetDeck"],
    // Capitalized product names only, so "premium features" stays as written.
    [new RegExp(`${brand}(?:(?:X|Twitter)\\s+)?Premium Business(?![\\p{L}\\p{N}_-])`, "gu"), "Verified Organizations"],
    [new RegExp(`${brand}(?:(?:X|Twitter)\\s+)?Premium(?![\\p{L}\\p{N}_-])`, "gu"), "Twitter Blue"],
    [new RegExp(`${brand}X(?![\\p{L}\\p{N}_/-])`, "gu"), "Twitter"]
  ];

  function replaceUI(text, options = defaults) {
    if (!options.enabled || !text) return text;
    if (options.terminology) {
      const label = text.trim();
      if (Object.hasOwn(labels, label)) return text.replace(label, labels[label]);
    }
    return text.split(protectedTokens).map((part, index) => {
      if (index % 2) return part;
      if (options.brandText) {
        for (const [pattern, replacement] of products) part = part.replace(pattern, replacement);
      }
      if (options.terminology) {
        part = part.replace(/\b(?:reposts?|reposted|reposting|posts?|posted|posting)\b/gi, word => {
          const replacement = terms[word.toLowerCase()];
          return word === word.toUpperCase() ? replacement.toUpperCase() : replacement;
        });
      }
      return part;
    }).join("");
  }

  // Notification rows mix people's names with site wording, so only fixed
  // activity phrases change there: a name like "Post Malone" stays intact.
  function replaceActivity(text, options = defaults) {
    if (!options.enabled || !options.terminology || !text) return text;
    return text.replace(/\b(your|a|new|this|their) (re)?post(s)?\b|\breposted\b/gi,
      (match, owner, re, plural) => owner ? `${owner} ${re ? "Retweet" : "Tweet"}${plural || ""}` : "Retweeted");
  }

  // Titles can contain a person's entire tweet. Only touch the brand suffix,
  // the author's "on X" separator, or the site's known landing-page title.
  function replaceTitle(title, options = defaults) {
    if (!options.enabled) return title;
    let next = title;
    if (options.brandText) {
      if (/^(?:\(\d+\)\s*)?X\s*$/.test(title)) return title.replace(/X(?=\s*$)/, "Twitter");
      next = title.replace(/([/|–—-]\s*)X\s*$/, "$1Twitter");
      next = next.replace(/^(\(\d+\)\s*)?X(?=\. It[’']s what[’']s happening)/, "$1Twitter");
      const quotedTweet = next.match(/^((?:\(\d+\)\s*)?.+?) on X(?=:\s*["“])/);
      if (quotedTweet) return next.replace(quotedTweet[0], `${quotedTweet[1]} on Twitter`);
    }
    if (options.terminology) {
      next = next.replace(/^((?:\(\d+\)\s*)?)(Chat|History)(?=\s*[/|–—-]|$)/, (_, count, label) => count + labels[label]);
    }
    // Only known navigation titles are UI: a profile may itself be named X.
    if (/^(?:\(\d+\)\s*)?(?:Home|Explore|Notifications|Messages|Chat|Bookmarks|History|Premium|Search|Post|Posts|Settings|Sign in|Log in|Sign up)(?:\s*[/|–—-]|$)/.test(next)) return replaceUI(next, options);
    return next;
  }

  // Bird geometry from Xenoreaper/ReTwitterify (MPL-2.0), see THIRD_PARTY_NOTICES.
  const birdPath = "M630 425A195 195 0 0 1 331 600A142 142 0 0 0 428 570A70 70 0 0 1 370 523A70 70 0 0 0 401 521A70 70 0 0 1 344 455A70 70 0 0 0 372 460A70 70 0 0 1 354 370A195 195 0 0 0 495 442A67 67 0 0 1 611 380A117 117 0 0 0 654 363A65 65 0 0 1 623 401A117 117 0 0 0 662 390A65 65 0 0 1 630 425Z";

  globalThis.Birdify = { defaults, settings, replaceUI, replaceActivity, replaceTitle, birdPath };
})();

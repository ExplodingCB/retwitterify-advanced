import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL("../extension/rules.js", import.meta.url), "utf8"), context);
const api = context.Birdify;

test("restores brand names and familiar terminology with matching case", () => {
  for (const [before, after] of [
    ["X", "Twitter"], ["Sign in to X", "Sign in to Twitter"], ["X Premium+", "Twitter Blue+"], ["Premium", "Twitter Blue"],
    ["Subscribe to Premium", "Subscribe to Twitter Blue"], ["Chat", "Messages"], [" History ", " Bookmarks "],
    ["X’s rules", "Twitter’s rules"], ["© 2026 X Corp.", "© 2026 Twitter, Inc."],
    ["Post", "Tweet"], ["Posts and replies", "Tweets and replies"], ["Undo repost", "Undo Retweet"],
    ["You reposted", "You Retweeted"], ["POST YOUR REPLY", "TWEET YOUR REPLY"],
    ["Posting a post", "Tweeting a Tweet"], ["2,014 reposts", "2,014 Retweets"], ["Show 31 posts", "Show 31 Tweets"],
    ["Quote post", "Quote Tweet"], ["Quote", "Quote Tweet"], ["Quotes", "Quote Tweets"],
    ["X Pro", "TweetDeck"], ["Premium Business", "Verified Organizations"]
  ]) assert.equal(api.replaceUI(before), after, before);
});
test("does not corrupt handles, URLs, larger words or hashtags", () => {
  for (const text of ["premium features", "Chat with Grok", "Search history", "Quote of the day", "Pro tips", "#Premium", "@History"]) {
    assert.equal(api.replaceUI(text), text);
  }
  const text = "@X @posts #X #repost x.com https://x.com/X/posts www.x.com help.x.com Xbox SpaceX X-ray example Postgres postscript";
  assert.equal(api.replaceUI(text), text);
});
test("title changes preserve names, notification counts and quoted tweet content", () => {
  for (const [before, after] of [
    ["(3) Home / X", "(3) Home / Twitter"], ["X", "Twitter"],
    ["(5) X", "(5) Twitter"], ["X. It’s what’s happening / X", "Twitter. It’s what’s happening / Twitter"],
    ['Alice on X: "X is a post on X" / X', 'Alice on Twitter: "X is a post on X" / Twitter'],
    ["X (@X) / X", "X (@X) / Twitter"], ["X / X", "X / Twitter"],
    ["Posts / X", "Tweets / Twitter"],
    ["(2) Chat / X", "(2) Messages / Twitter"], ["History / X", "Bookmarks / Twitter"], ["Premium / X", "Twitter Blue / Twitter"],
    ["History of Rome / X", "History of Rome / Twitter"], ["My Xylophone", "My Xylophone"]
  ]) assert.equal(api.replaceTitle(before), after, before);
});
test("each option works independently and settings are validated", () => {
  assert.equal(api.replaceUI("X Post", api.settings({ enabled: false })), "X Post");
  assert.equal(api.replaceUI("X Post", api.settings({ brandText: false })), "X Tweet");
  assert.equal(api.replaceUI("X Post", api.settings({ terminology: false })), "Twitter Post");
  assert.equal(api.replaceTitle("Posts / X", api.settings({ brandText: false })), "Tweets / X");
  assert.equal(api.replaceUI("Chat", api.settings({ terminology: false })), "Chat");
  assert.equal(api.replaceUI("Premium", api.settings({ brandText: false })), "Premium");
  assert.equal(api.settings({ enabled: "false" }).enabled, true);
  assert.equal(api.settings(null).enabled, true);
});

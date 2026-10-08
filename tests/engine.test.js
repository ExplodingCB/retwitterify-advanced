import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const sources = ["rules.js", "engine.js"].map(name => readFileSync(new URL(`../extension/${name}`, import.meta.url), "utf8"));
const xPath = "M18.244 2.25h3.308l-7.227 8.26L22.827 21.75h-6.626l-5.19-6.786L5.064 21.75H1.754l7.73-8.835L1.254 2.25H8.03l4.713 6.203Zm-1.161 17.52h1.833L7.035 4.126H5.068Z";
function setup(t, html, settings) {
  const dom = new JSDOM(html, { url: "https://x.com/home", runScripts: "outside-only" });
  const { window } = dom;
  sources.forEach(source => window.eval(source));
  const asset = path => `chrome-extension://retwitterify/${path}`;
  const engine = window.ReTwitterify.start(window.document, settings, asset);
  t.after(() => { engine.stop(); window.close(); });
  return { window, document: window.document, engine, asset, api: window.ReTwitterify };
}
const settle = () => new Promise(resolve => setTimeout(resolve, 65));

test("headers, navigation, accessibility labels and placeholders change without replacing nodes", t => {
  const { document } = setup(t, `<title>Home / X</title><header><h1>X</h1><a href="/compose/post"><span>Post</span></a></header>
    <input placeholder="Search X" value="X posts"><textarea placeholder="Post your reply">X posts</textarea>
    <button aria-label="Repost" title="Repost">Repost</button><footer>© 2026 X Corp.</footer>`);
  assert.equal(document.title, "Home / Twitter");
  assert.equal(document.querySelector("h1").textContent, "Twitter");
  assert.equal(document.querySelector("a").textContent, "Tweet");
  assert.equal(document.querySelector("a").getAttribute("href"), "/compose/post");
  assert.equal(document.querySelector("button").getAttribute("aria-label"), "Retweet");
  assert.equal(document.querySelector("input").placeholder, "Search Twitter");
  assert.equal(document.querySelector("input").value, "X posts");
  assert.equal(document.querySelector("textarea").placeholder, "Tweet your reply");
  assert.equal(document.querySelector("textarea").value, "X posts");
  assert.equal(document.querySelector("footer").textContent, "© 2026 Twitter, Inc.");
});
test("keeps tweets, profiles, messages, cards and editable content intact", t => {
  const { document } = setup(t, `<main>
    <article data-testid="tweet" aria-label="X posted a post"><div data-testid="User-Name"><h2>X</h2></div><div data-testid="tweetText">I post on X <span>X</span></div><button>Repost</button></article>
    <div data-testid="UserDescription">I post on X</div><div data-testid="messageEntry"><button>X posts</button></div>
    <div data-testid="card.wrapper"><h2>X posts</h2></div><div data-testid="trend"><h2>X</h2></div>
    <div contenteditable="true" role="textbox">Post on X</div><pre>Post on X</pre>
    <button aria-label="Close">X</button><img alt="X posts" src="https://example.com/photo.png">
    </main>`);
  for (const id of ["User-Name", "tweetText", "UserDescription", "messageEntry", "card.wrapper", "trend"]) {
    assert.match(document.querySelector(`[data-testid="${id}"]`).textContent, /X/);
  }
  assert.equal(document.querySelector("article").getAttribute("aria-label"), "X posted a post");
  assert.equal(document.querySelector("article button").textContent, "Retweet");
  assert.equal(document.querySelector("[contenteditable]").textContent, "Post on X");
  assert.equal(document.querySelector("pre").textContent, "Post on X");
  assert.equal(document.querySelector('[aria-label="Close"]').textContent, "X");
  assert.equal(document.querySelector("img").alt, "X posts");
});
test("recognizes classic navigation paths and current layered login SVGs", t => {
  const { document, api } = setup(t, `<header><svg viewBox="0 0 24 24"><path d="${xPath}"></path></svg></header>
    <svg aria-label="X" role="img" viewBox="0 0 480 490"><defs><path d="M0 0"></path></defs>
    <path style="opacity: 0.9" d="M285.38 207.711L462.954 1.5"></path><path d="M285.38 207.711L462.954 1.5"></path></svg>
    <button aria-label="Close"><svg><path d="M1 1L20 20"></path></svg></button>`);
  const svgs = document.querySelectorAll("svg");
  assert.equal(svgs[0].querySelector("path").getAttribute("d"), api.birdPath);
  assert.equal(svgs[1].getAttribute("aria-label"), "Twitter");
  assert.equal(svgs[1].querySelector("defs path").getAttribute("d"), "M0 0");
  assert.equal(svgs[1].querySelectorAll(":scope > path")[1].style.display, "none");
  assert.equal(svgs[2].querySelector("path").getAttribute("d"), "M1 1L20 20");
});
test("updates inserted and edited UI, favicon and title after client-side navigation", async t => {
  const { document, engine, api, asset } = setup(t, `<title>Home / X</title><link rel="icon" href="/favicon.ico"><main></main>`);
  const button = document.createElement("button");
  button.append("Post");
  let clicks = 0;
  button.addEventListener("click", () => clicks++);
  document.querySelector("main").append(button);
  document.title = "(2) Notifications / X";
  const icon = document.querySelector('link[rel="icon"]');
  icon.href = "/new-icon.ico";
  await settle();
  assert.equal(button.textContent, "Tweet");
  button.click();
  assert.equal(clicks, 1);
  assert.equal(document.title, "(2) Notifications / Twitter");
  assert.equal(icon.href, asset("icons/icon-32.png"));
  button.firstChild.data = "Repost";
  await settle();
  assert.equal(button.textContent, "Retweet");
  const passes = engine.stats.passes;
  await settle();
  assert.equal(engine.stats.passes, passes, "no polling or observer feedback loop");
  engine.update(api.settings({ enabled: false }));
  assert.equal(button.textContent, "Repost");
  assert.equal(document.title, "(2) Notifications / X");
  assert.equal(icon.getAttribute("href"), "/new-icon.ico");
});
test("settings restore only extension-owned edits and can resume", t => {
  const { document, engine, api } = setup(t, `<title>Home / X</title><header><h1>X</h1><button>Post</button><svg viewBox="0 0 24 24"><path d="${xPath}"></path></svg></header>`);
  const heading = document.querySelector("h1");
  const path = document.querySelector("path");
  engine.update(api.settings({ logos: false, terminology: false }));
  assert.equal(heading.textContent, "Twitter");
  assert.equal(document.querySelector("button").textContent, "Post");
  assert.equal(path.getAttribute("d"), xPath);
  assert.equal(path.getAttribute("style"), null);
  assert.equal(document.querySelector('link[rel="icon"]'), null);
  heading.firstChild.data = "New heading";
  engine.update(api.settings({ enabled: false }));
  assert.equal(heading.textContent, "New heading");
  assert.equal(document.title, "Home / X");
  engine.update(api.defaults);
  assert.equal(document.querySelector("button").textContent, "Tweet");
});
test("handles pages created after document_start and logos rewritten by React", async t => {
  const { document, api } = setup(t, "");
  document.head.innerHTML = '<title>X</title>';
  document.body.innerHTML = `<header><h1><span>X</span></h1><svg viewBox="0 0 24 24"><path d="${xPath}"></path></svg></header>`;
  await settle();
  assert.equal(document.title, "Twitter");
  assert.equal(document.querySelector("h1").textContent, "Twitter");
  const path = document.querySelector("path");
  path.setAttribute("d", xPath);
  await settle();
  assert.equal(path.getAttribute("d"), api.birdPath);
});
test("batched additions preserve controls on lazily inserted tweets", async t => {
  const { document, engine } = setup(t, "<main></main>");
  const before = engine.stats.passes;
  const main = document.querySelector("main");
  for (let i = 0; i < 60; i++) {
    const article = document.createElement("article");
    article.innerHTML = '<div data-testid="tweetText">Post on X</div><button aria-label="Repost">Repost</button>';
    main.append(article);
  }
  await settle();
  assert.equal(engine.stats.passes, before + 1);
  assert.ok([...document.querySelectorAll("button")].every(button => button.textContent === "Retweet"));
  assert.ok([...document.querySelectorAll('[data-testid="tweetText"]')].every(text => text.textContent === "Post on X"));
});
test("repost bylines preserve author names and image logos survive source changes", async t => {
  const { document, asset } = setup(t, `<div data-testid="socialContext"><a href="/X">X</a> reposted</div><header><img alt="X" src="/logo.svg"></header>`);
  assert.equal(document.querySelector("a").textContent, "X");
  assert.equal(document.querySelector('[data-testid="socialContext"]').textContent, "X Retweeted");
  const logo = document.querySelector("img");
  assert.equal(logo.getAttribute("src"), asset("icons/bird.svg"));
  logo.src = "/new-logo.svg";
  await settle();
  assert.equal(logo.getAttribute("src"), asset("icons/bird.svg"));
});
test("repairs all favicon variants and recreates an icon removed by navigation", async t => {
  const { document, engine, api, asset } = setup(t, '<link rel="icon" href="a.ico"><link rel="apple-touch-icon" href="a.png"><link rel="mask-icon" color="black" href="a.svg">');
  assert.equal(document.querySelector('[rel="apple-touch-icon"]').href, asset("icons/icon-192.png"));
  assert.equal(document.querySelector('[rel="mask-icon"]').href, asset("icons/bird.svg"));
  document.querySelector('[rel="icon"]').remove();
  await settle();
  assert.equal(document.querySelector('[rel="icon"]').href, asset("icons/icon-32.png"));
  engine.update(api.settings({ enabled: false }));
  assert.equal(document.querySelector('[rel="icon"]'), null);
  assert.equal(document.querySelector('[rel="mask-icon"]').getAttribute("color"), "black");
});
test("replaces the logo in its usual places even when X redraws its shape", async t => {
  const unknown = "M1 2L3 4Z";
  const { document, api } = setup(t, `<header role="banner"><h1 role="heading"><a href="/home" aria-label="X" role="link"><div><svg viewBox="0 0 24 24" aria-hidden="true"><g><path d="${unknown}"></path></g></svg></div></a></h1>
    <nav aria-label="Primary"><a href="/i/premium_sign_up" aria-label="Premium"><svg viewBox="0 0 24 24"><path d="${unknown}"></path></svg><span>Premium</span></a>
    <a href="/i/chat" aria-label="Chat"><span>Chat</span></a><a href="/i/bookmarks" aria-label="History"><span>History</span></a></nav></header>
    <div id="placeholder"><svg viewBox="0 0 24 24"><path d="M21.742 21.75l-7.563-11.179 7.056-8.321h-2.456Z"></path></svg></div>
    <article data-testid="tweet"><a href="/X" aria-label="X"><svg><path d="${unknown}"></path></svg></a></article>`);
  const logo = document.querySelector("h1 path");
  assert.equal(logo.getAttribute("d"), api.birdPath);
  assert.equal(document.querySelector("h1 a").getAttribute("aria-label"), "Twitter");
  assert.equal(document.querySelector("#placeholder path").getAttribute("d"), api.birdPath);
  assert.equal(document.querySelector("nav path").getAttribute("d"), unknown);
  assert.equal(document.querySelector("article path").getAttribute("d"), unknown);
  const [premium, chat, history] = document.querySelectorAll("nav a");
  assert.equal(premium.getAttribute("aria-label"), "Twitter Blue");
  assert.equal(premium.textContent, "Twitter Blue");
  assert.equal(chat.textContent, "Messages");
  assert.equal(chat.getAttribute("aria-label"), "Messages");
  assert.equal(history.textContent, "Bookmarks");
  const late = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  late.innerHTML = `<path d="${unknown}"></path>`;
  document.querySelector("h1 a").replaceChildren(late);
  await settle();
  assert.equal(late.querySelector("path").getAttribute("d"), api.birdPath);
});
test("notification rows change activity wording but not names or quoted tweets", t => {
  const { document } = setup(t, `<article data-testid="notification"><a href="/postmalone"><span>Post Malone</span></a><span> and 2 others reposted your post</span>
    <span>New post notifications for </span><a href="/X">X</a><div data-testid="tweetText">your post on X</div><button aria-label="Repost">Repost</button></article>`);
  const spans = document.querySelectorAll("article > span");
  assert.equal(document.querySelector("a").textContent, "Post Malone");
  assert.equal(spans[0].textContent, " and 2 others Retweeted your Tweet");
  assert.equal(spans[1].textContent, "New Tweet notifications for ");
  assert.equal(document.querySelector('[data-testid="tweetText"]').textContent, "your post on X");
  assert.equal(document.querySelector("button").textContent, "Retweet");
});

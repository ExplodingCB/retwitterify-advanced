Bring back Twitter names, blue birds, Tweets and Retweets on the modern X website.

## What's new in 2.2.0

- ReTwitterify Advanced is now **Birdify**, with a new icon of its own. Firefox treats it as the same add-on, so existing installs update normally and keep their settings.
- Release files are now named `birdify-firefox-<version>.zip`, `birdify-chromium-<version>.zip` and `birdify-reviewer-source-<version>.zip`.

## What's new in 2.1.0

- The header bird replaces X's current navigation logo. The logo is now recognized by its place on the page, not only its exact SVG shape, so a redrawn X logo is still replaced.
- `Premium` and `X Premium` read `Twitter Blue`, in navigation, buttons and tab titles.
- The renamed `Chat` and `History` navigation items read `Messages` and `Bookmarks` again.
- Tweet and Retweet are capitalized the way Twitter wrote them (`Show 31 Tweets`, `Undo Retweet`), and `Quote` reads `Quote Tweet`.
- Notification rows read "Retweeted your Tweet" instead of "reposted your post". People's names in those rows are left alone.
- `X Corp.` reads `Twitter, Inc.`, `X Pro` reads `TweetDeck`, and `Premium Business` reads `Verified Organizations`.
- Adds 64 and 96 pixel icons for Firefox's add-on manager.

## Downloads

- **Firefox 142+:** download the Firefox ZIP, open `about:debugging#/runtime/this-firefox`, and choose **Load Temporary Add-on**. Select the ZIP or its extracted `manifest.json`, then refresh X.
- **Chrome, Edge, Brave and Opera:** extract the Chromium ZIP, open your browser's extensions page, enable **Developer mode**, and choose **Load unpacked**. Select the extracted folder, then refresh X.
- The reviewer-source ZIP contains the complete source and build instructions. `SHA256SUMS.txt` covers all three ZIP files.

Disable the original ReTwitterify extension before using this version. The popup has independent branding, bird-logo and Tweet/Retweet switches, plus a master pause switch.

## Status

Firefox users should install Birdify from addons.mozilla.org, which updates automatically once Mozilla approves a version. The ZIPs here are unsigned builds for testing; Firefox's temporary installation ends when the browser restarts.

The public login markup and a local browser fixture were checked. Automated tests cover text rules, dynamic DOM updates, settings, restoration, and preservation of recognized user-content fields. Live authenticated Firefox behavior still needs verification.

## License

MPL-2.0. Includes attribution to Xenoreaper/ReTwitterify for the adapted bird geometry.

Bring back Twitter names, blue birds, Tweets and Retweets on the modern X website.

## Downloads

- **Firefox 142+:** download the Firefox ZIP, open `about:debugging#/runtime/this-firefox`, and choose **Load Temporary Add-on**. Select the ZIP or its extracted `manifest.json`, then refresh X.
- **Chrome, Edge, Brave and Opera:** extract the Chromium ZIP, open your browser's extensions page, enable **Developer mode**, and choose **Load unpacked**. Select the extracted folder, then refresh X.
- The reviewer-source ZIP contains the complete source and build instructions. `SHA256SUMS.txt` covers all three ZIP files.

Disable the original ReTwitterify extension before using this version. The popup has independent branding, bird-logo and Tweet/Retweet switches, plus a master pause switch.

## Status

These are unsigned development builds. Firefox's temporary installation ends when the browser restarts. Mozilla signing and store publication are still pending.

The public login markup and a local browser fixture were checked. Automated tests cover text rules, dynamic DOM updates, settings, restoration, and preservation of recognized user-content fields. Live authenticated Firefox behavior still needs verification.

## License

MPL-2.0. Includes attribution to Xenoreaper/ReTwitterify for the adapted bird geometry.

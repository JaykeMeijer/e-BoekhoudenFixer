# e-BoekhoudenFixer

Greasemonkey/Tampermonkey script to make the e-Boekhouden more user friendly. By default it just shows all the entries for the entire month in one big list, which is very unclear. Furthermore, entering hours is a time-consuming, frustrating and error prone process. This script adds the following features in order to improve this:

- Entries grouped by day, and showing total of hours per day
- Allow a day to be minimized, hiding the entries of that day
- Shortcut buttons to show just current day, week and month
- Button per day to add entries for that day
- Allow timeframe selection box at the top to be minimized, as this takes up almost half of the page
- ~Automatically select '2. Investering' as activiteit, as we don't use the other anymore~

See the [issues](https://github.com/JaykeMeijer/e-BoekhoudenFixer/issues?q=is%3Aissue+is%3Aopen+label%3A%22new+feature%22) in the GitHub repository for upcoming features

## Installation

First, install GreaseMonkey for [FireFox](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/) or TamperMonkey for [FireFox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/), [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en) or [Safari](https://tampermonkey.net/?browser=safari).

Next, click [here](https://github.com/JaykeMeijer/e-BoekhoudenFixer/raw/master/eboekhouden.user.js).

The master branch of this repo has been tested on Firefox & Chrome on Windows, and FireFox on Linux. Chrome on Linux has been checked as well, but has some instabilities still.

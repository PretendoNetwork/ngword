# NgWord

Libraries for checking user input against Nintendo's word filter patterns ("NgWord").

Implementation based off https://bulbapedia.bulbagarden.net/wiki/List_of_censored_words.

> ***NOTE: NgWord uses a very overzealous set of regexes for input checking, meaning certain clean inputs like `of a giant` will be flagged here (as when stripped of spaces this contains the substring "fag"). This is not ideal for general word checking, and should only be used to mimic the client-side checks on the server. There are better systems for generic input checking.***

## Packages

See each package's README for installation and API documentation.

| Package      | Description                                                       |
| ------------ | ----------------------------------------------------------------- |
| `wordlist`   | Build tool that compiles NgWord `.txt` files into `patterns.json` |
| `typescript` | TypeScript/Node.js library                                        |
| `go`         | Go library                                                        |

# Vendored `foliate-js`

- **Repository**: https://github.com/johnfactotum/foliate-js
- **Commit Hash**: `78914aef4466eb960965702401634c2cb348e9b1`
- **Commit Date**: `2026-05-01 19:24:25 +0000`
- **Commit Message**: `Use original hrefs for external links and add isExternal in fb2.js (#129)`
- **License**: MIT License (John Factotum)

## Local Modifications
- `pdf.js`: Replaced `./vendor/pdfjs/pdf.mjs` import with a stub throwing an Indonesian error message (`Format PDF tidak didukung`), as PDF is explicitly out of scope and only EPUB/TXT are supported.


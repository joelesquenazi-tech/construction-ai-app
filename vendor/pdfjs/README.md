# PDF.js distribution 6.4.299

Source: https://www.npmjs.com/package/pdfjs-dist/v/6.4.299 (Mozilla PDF.js, Apache-2.0).

Vendored from `npm pack pdfjs-dist@6.4.299`: legacy/build/pdf.min.mjs and pdf.worker.min.mjs, standard_fonts/, wasm/ (excluding unused QuickJS scripting assets), LICENSE, and cmaps/LICENSE. cmaps.json contains the unchanged binary *.bcmap files encoded as base64 by filename. pdf-import.js provides the PDF.js BinaryDataFactory to read this packed local character-map resource.

PDF scripting/XFA is not enabled. Scripts are not evaluated by an embedded PDF viewer. Original files stay in IndexedDB; PNG previews are used by the existing sheet tools. No runtime CDN dependency is introduced.

Upstream font and codec licenses are retained beside their files. To update, regenerate cmaps.json from the pinned package and update the service-worker asset list/version, then run PDF import/offline tests.

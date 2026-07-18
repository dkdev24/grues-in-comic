# Grues in Comic

> Reimagining two historical Microsoft open-source projects as a browser-native comic adventure using AI-assisted software modernization.

## Overview

Grues in Comic is an experimental software modernization project that combines two historical open-source projects:
* **Zork I** (gameplay, parser, and world simulation)
* **Microsoft Comic Chat** (comic-style visual presentation)

The objective is not to reproduce the original runtime environments.
Instead, Grues in Comic extracts gameplay semantics from the original source code and reimplements them using a modern browser-native architecture powered by WebAssembly.

The project also serves as a reference implementation for AI-assisted modernization of legacy software.

---

## Vision

Grues in Comic aims to demonstrate how AI coding agents can assist with:
* understanding legacy source code
* extracting software semantics
* building intermediate representations (IR)
* modernizing historical software
* creating maintainable browser-native applications

Rather than building a Z-Machine emulator, Grues in Comic builds a new runtime inspired by the original gameplay.

---

## Architecture

```text
Historical Source Code
        │
        ▼
 Semantic Analysis
        │
        ▼
Intermediate Representation (IR)
        │
        ▼
 Grues in Comic Engine
        │
        ▼
 WebAssembly Runtime
        │
        ▼
 Browser Application
```

---

## Repository Structure

```text
grues-in-comic/

├── original-projects/
│   ├── zork/
│   └── comic-chat/
│
├── importers/
├── ir/
├── engine/
├── renderer/
├── wasm/
├── web/
├── assets/
├── docs/
├── wiki/
├── graph/
├── tests/
└── scripts/
```

---

## AI Knowledge System

Grues in Comic separates two different kinds of project knowledge.

### Structural Knowledge

Generated using Graphify. Examples:

* dependency graphs
* call graphs
* architecture graphs

### Semantic Knowledge

Maintained using OpenWiki-compatible documentation. Examples:

* gameplay rules
* parser behavior
* design rationale
* migration strategy

---

## Third-Party Projects

### Zork I

- Repository: https://github.com/historicalsource/zork1
- License: MIT

---

### Microsoft Comic Chat

- Repository: https://github.com/microsoft/comic-chat
- License: MIT

---

## License

Grues in Comic is released under the Apache License 2.0. Imported historical projects retain their original licenses.
See the LICENSE file and THIRD_PARTY.md for details.

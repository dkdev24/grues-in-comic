# wiki

Hand-authored semantic documentation: **why** the system is designed the way it is.

Structural documentation — what calls what, which module owns which file — is Graphify's
job and lives in each module's `graphify-out/`. Do not duplicate it here. The split is
specified in `docs/AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md`.

This directory is written by hand (by people or by AI). OpenWiki is **not** adopted; do
not generate pages here with tooling.

## Pages

| Page | Subject |
|---|---|
| [comic-chat-presentation.md](comic-chat-presentation.md) | How Comic Chat turned a conversation into comics, and which of it survives contact with Zork |

## What belongs here

Design reasoning that the code cannot state for itself: why an approach was chosen, what
was rejected and on what evidence, which constraints an implementation is answering to.
If the answer is visible by reading one file, it belongs in that file's comments instead.

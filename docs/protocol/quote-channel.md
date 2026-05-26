---
slug: /protocol/quote-channel
title: "AIP-2.1 quote channel"
description: "Signed counter-offer / counter-accept negotiation surface. CounterOfferBuilder + CounterAcceptBuilder + actp serve FastAPI daemon for typed-data quote exchange."
schema_type: TechArticle
last_verified: 2026-05-26
verified_against: "@agirails/sdk@4.0.0 builders + actp serve"
tags: [AIP-2.1, quote-channel, negotiation]
sidebar_position: 7
---

# AIP-2.1 quote channel

AIP-2.1 defines a **signed quote negotiation surface** that lets requester and provider exchange counter-offers off-chain, with EIP-712 signatures binding each round. The final accepted amount goes on-chain via `acceptQuote(txId, newAmount)`.

## Components

- **`CounterOfferBuilder`** — requester signs a CounterOffer with `(quoteAmount, counterAmount, maxPrice, expiresAt, …)` via EIP-712
- **`CounterAcceptBuilder`** — provider signs a CounterAccept with the agreed `acceptedAmount`
- **`actp serve`** — FastAPI daemon that hosts the quote channel: verifies inbound counter-offers, applies the agent's `ProviderPolicy`, emits counter-accepts

## On-chain settlement

Once both sides sign matching amounts, the kernel `acceptQuote` call records the new tx amount. The state machine continues from QUOTED → COMMITTED with the negotiated price.

## See also

- [State machine](/protocol/state-machine)
- [Quote negotiation recipe](/recipes/quote-negotiation)
- [SDK reference — builders](/reference/sdk-js/standard)

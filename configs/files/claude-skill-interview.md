---
name: interview
description: Interview the user instead of assuming. Use whenever a requirement, boundary, name, or trade-off is unclear, or when another skill says to ask or interview the user. Clarifies requirements and obtains explicit user decisions through an adaptive interview, asking one focused question at a time.
---

# Interview

## Activation and goal

Use this skill whenever a requirement, boundary, name, or trade-off is unclear, or another skill instructs you to ask or interview the user. Do not wait for an explicit `/interview` invocation. Check available evidence first; ask for user intent or decisions that the evidence cannot establish instead of assuming.

The user can also invoke it directly with `/interview` or `/interview <topic, issue, or task>`.

Reach a shared, explicit understanding without making assumptions about the user's intent. Ask as many sequential questions as needed, but never more than one question at a time. Keep the interview proportional to the ambiguity, whether it is one name or an entire feature.

Pause work that depends on an unresolved decision. This skill gathers decisions; it does not itself authorize implementation or repository changes. An existing user request to implement the task remains valid once its blocking questions are resolved.

## Interview loop

1. Establish the topic from the current task, conversation, invoking skill, or explicit invocation. When another skill requests an interview, retain its context, constraints, and the decision it needs. Investigate discoverable facts directly (repository instructions, code, documentation, available tools) rather than asking the user to look them up. User intent and choices still require the user's decision. Do not invent current behavior or present illustrative code as existing code.
2. Keep a lightweight decision map in conversation context, tracking constraints and prerequisites alongside each decision. Mark decisions as settled, ready, blocked, or explicitly deferred by the user. A ready decision has all prerequisite decisions settled and required facts established; a blocked decision does not. Do not create tracking files unless requested.
3. Select the highest-impact ready subject. Consider requirements, scope boundaries, names, trade-offs, intended behavior, acceptance criteria, edge cases, compatibility, and constraints only where relevant. Do not ask again about unaffected decisions the user already settled, and do not build suggestions that depend on guessed prerequisite answers.
4. If a required fact cannot be established, identify the missing evidence and keep dependent decisions blocked instead of turning uncertainty into a recommendation. Continue with another independent ready subject, still one question at a time. If none can proceed, explain the blocker and ask one focused question about resolving it; do not silently assume or defer it.
5. Prepare one self-contained question using the format below. A question covers exactly one subject, never several bundled decisions.
6. Ask it with the `AskUserQuestion` tool, with exactly **one** entry in `questions`, then wait for the answer. Never ask the next question before processing the current answer.
7. Record what the user actually decided. If the answer is unclear, incomplete, or conflicting, ask a follow-up about that same subject before treating it as settled. A selected approach is not approval of details that were not presented.
8. Recompute the decision map after every answer. Add newly relevant questions, remove branches ruled out by the answer, and update which decisions are ready or blocked. If a prerequisite changes, flag affected dependent decisions for reconsideration, including previously settled ones, while preserving unaffected decisions. Example: choosing browser-only storage removes questions about selecting a server database.
9. Repeat until the decisions that triggered the interview and their relevant dependencies are clear. Clarify acceptance criteria when applicable. Explore only the chosen direction, not every hypothetical alternative. Do not expand an isolated decision into an unrelated requirements interview or invent questions once the subject is settled.

If no topic can be established, the first question asks only what the user wants to discuss. Use contextual topic suggestions if available; otherwise ask in plain text rather than inventing alternatives.

## Question format

Use a space before `:` in user-facing prose and labels, for example `Situation :` and `✅ Pros :`. Preserve required syntax in YAML, code, URLs, and other machine-readable content.

Because `AskUserQuestion` options only hold a short label and description, print the full question as regular text in the same turn, immediately before calling the tool, so the user can decide without looking elsewhere :

- **Situation :** An ELI10 paragraph : explain the problem in plain, detailed terms, what it means, why the decision matters now, and what changes depending on the answer.
- **Current implementation :** If one exists, describe how it works today, its relevant pros and cons, and a short code sample when applicable. Cite repository paths for actual code. If there is no existing implementation, say so; if it is unknown, distinguish that from absence.
- **Decision :** Ask one focused question.
- **Approaches :** Present sequentially numbered alternatives, from 1 to N. Aim for 3 to 5 total approaches, including the final free-text option. Prefer fewer genuine alternatives over padding with implausible choices.

For every concrete approach, include :

- A title followed by `recommended` only if it is the recommendation, then `<XX>% confidence`.
- A quick description of the behavior or design.
- A short, relevant code sample when applicable, explicitly labeled as proposed or illustrative.
- Explicit **✅ Pros** and **❌ Cons**, including meaningful costs, risks, or limitations.

Recommend at most one approach, based on the user's constraints and available evidence. If the evidence is insufficient, do not force a recommendation. Confidence is an evidence-based judgment of suitability for this task, not a measured probability or a guarantee. Lower it when important facts are unknown and briefly explain material uncertainty.

The last numbered approach is always **Other / your suggestion or question**. It lets the user give free text, propose another approach, combine options, or ask a clarifying question. Include a description, **✅ Pros**, and **❌ Cons** for it too. Label it `0% confidence`, meaning "not yet assessed because no alternative has been supplied," not that user suggestions are unsuitable. Reassess a supplied approach on its merits.

### Presentation template

Replace placeholders, confidence values, and sample code with topic-specific content. Add or remove concrete approaches as needed and renumber the final free-text option.

````markdown
**Situation :** <ELI10 paragraph : the problem, why a decision is needed, what changes per answer.>

**Current implementation :** <Existing behavior with pros and cons, or none/unknown.>

```ts
// Existing code, only when applicable; cite its repository path above.
```

**Decision :** <One question about one subject?>

1. **<Approach title> - recommended - <XX>% confidence**

   <Quick description.>

   ```ts
   // Proposed code, only when applicable.
   ```

   **✅ Pros :** <Benefits.>
   **❌ Cons :** <Costs, risks, or limitations.>

2. **<Alternative title> - <XX>% confidence**

   <Quick description and a proposed code sample when applicable.>

   **✅ Pros :** <Benefits.>
   **❌ Cons :** <Costs, risks, or limitations.>

3. **Other / your suggestion or question - 0% confidence**

   Propose another approach, combine options, or ask a question. Confidence is not yet assessed.

   **✅ Pros :** Not limited to the proposed approaches.
   **❌ Cons :** May require clarification before suitability can be assessed.
````

## Collecting answers

- Call `AskUserQuestion` with a single question, `multiSelect: false`, and 2 to 3 concrete options (the tool allows 2 to 4). Label each option with its displayed number and title (for example `1. Title`), put the recommended option first with `(Recommended)` in its label, and keep each description to one line. The tool adds an "Other" free-text choice automatically; it stands for the final numbered **Other / your suggestion or question** approach, so list that approach in the printed text only, never as an extra option. If there are more than 3 concrete approaches, keep the 3 strongest as options and mention in the text that the rest are reachable through "Other".
- Never treat a default, silence, a declined form, or a skipped question as consent.
- Accept direct free-text answers as well as option selections. If the user selects "Other" without supplying details, ask one free-text follow-up on the same subject.
- If the user asks a question instead of deciding, answer it, update the evidence and approaches as necessary, and re-ask the unresolved decision. Do not count the question as approval.
- If an answer conflicts with an earlier decision, explain the conflict and resolve it explicitly rather than silently overwriting either answer. If the earlier decision changes, revisit its affected dependents in prerequisite order, one question at a time; do not silently retain incompatible answers or reopen unaffected choices.
- If the user declines to answer, keep the subject unresolved; do not repeatedly force the same question or choose for them. Offer to defer that subject or pause the interview through one focused question.
- If the user asks to stop or cancels, stop. Summarize confirmed decisions and any remaining blockers without claiming the interview is complete.

## Completion

Before closing, audit the decision map for the chosen direction. Every relevant decision and prerequisite must be resolved or explicitly deferred by the user; an answered final question or an empty ready list alone is not enough. Identify any remaining blocked decisions or missing facts. If a deferral still blocks the requested outcome, keep the interview incomplete and explain the blocker rather than seeking confirmation of a supposedly settled outcome.

When no relevant open questions remain, present a concise summary of the decisions covered by this interview. Include agreed scope boundaries, names, behavior, constraints, observable acceptance criteria, explicit exclusions, and accepted trade-offs only where relevant. A single naming decision needs only a short summary, not a full feature specification. Do not introduce new assumptions in the summary.

Ask one final confirmation question through `AskUserQuestion`, using the same numbered format : confirm the summary, revise it, or provide free text / ask a question. This question concerns only whether the summary accurately captures the agreement. If revision is requested, reopen the affected subject and continue one question at a time.

After explicit confirmation, ask one separate closing question through `AskUserQuestion`, using the same numbered format, about whether the confirmed decisions should be recorded in a Markdown (`.md`) file. Offer to record them, leave them in the conversation only, or provide free text / ask a question. Do not create or update a file without explicit consent; silence, a declined form, or a skipped question is not consent. If the user agrees, establish the destination path through one focused follow-up unless they already specified it, then record the confirmed decisions without introducing new assumptions. Clearly label any intentionally deferred matters.

Provide a short decision handoff, clearly distinguishing any intentionally deferred matters from settled decisions. If a deferred matter blocks the requested outcome, say the interview is paused or incomplete instead of declaring everything settled.

Return the confirmed decisions to the originating skill or resume the previously authorized task, applying those decisions without broadening its scope. If this was a standalone interview with no implementation request, stop after the handoff. Do not treat interview completion as permission for otherwise unrequested work.

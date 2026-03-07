# Blockers, Interventions, and Surprises

## Items That Required Your Intervention

### 1. Convex dev process interference
An older `convex dev` process was already running in the workspace and interfered with reliable code generation and backend iteration. You disabled it so I could continue with a clean Convex codegen flow.

### 2. OpenRouter / model provider clarification
You correctly flagged that Kimi K2.5 is not an OpenAI model. That required checking the current OpenRouter and AI SDK docs before settling on the correct provider path and model id.

### 3. API key timing
You clarified that the OpenRouter key would be provided later and asked for it to be left blank in `.env.local`. That changed the implementation requirement from “live model required now” to “must work with deterministic fallback until key is available.”

## Items That Were Continually Confusing or Surprising

### 1. `@convex-dev/agent` and `ai@6` did not line up
The current `@convex-dev/agent` package declared a peer dependency on `ai@^5`, while this project needed `ai@6`. That made the component path unreliable for this implementation. The practical result was to use custom Convex actions for the workflow instead of the Convex Agent package.

### 2. AI SDK v6 runtime export shape was not what older examples suggest
The installed `ai@6` package did not expose the structured-output helper the way older examples imply. The runtime-compatible pattern had to be confirmed against the installed package surface and adjusted to use the supported export shape.

### 3. Convex codegen required deployment access
Convex code generation was not purely local in practice. It needed deployment access, and in the sandbox it stalled until network escalation was allowed. That was a recurring source of uncertainty until verified.

### 4. TanStack route typing lagged behind file changes until the route tree regenerated
After replacing the old routes with `/intake` and `/threads/$threadId`, TypeScript still believed only the old `/about` route existed. This was resolved by regenerating the route tree through a build pass.

### 5. Convex internal action typing was stricter than it first looked
An internal workflow action was initially written as a normal `action` and referenced through `internal.inbox.*`. Convex only exposed it correctly after converting it to `internalAction`.

### 6. Convex runtime TypeScript target was lower than the app target
The Convex project used `ES2021`, which caused array `.at()` calls to fail in backend typechecking even though the main app target was newer. The Convex TypeScript config had to be updated accordingly.

### 7. Existing dirty workspace state required caution
The repo already had unrelated modifications before implementation started. That meant changes had to be applied carefully without reverting or trampling user-owned work outside the feature itself.

## Practical Outcome
None of these blockers prevented completion, but they changed implementation choices:
- custom Convex workflow instead of the Convex Agent package
- deterministic fallback before live model usage
- explicit codegen/build passes to keep generated types and routes in sync

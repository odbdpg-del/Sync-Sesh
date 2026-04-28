# Audio Patchbay

## Doc Header

### Doc History
4. 2026-03-21 10:04: Added `FM Voice` as a first-class early node candidate and documented why FM synthesis is a strong flagship generated-source direction for `Audio Patchbay`, especially because it matches ParaHook's broader generator identity and can reuse the same node-and-wire mental model as `Spaghetti`
3. 2026-03-21 09:59: Added a docked-idea note explaining why the tempting `SoundCloud link -> direct stream -> proxy -> Audio Patchbay effects graph` path is not the current recommended direction, including the technical reason, the product/policy risk, and the reminder that mixing/transformation through SoundCloud public APIs appears to conflict with SoundCloud policy
2. 2026-03-21 09:41: Locked the naming split so `Audio Patchbay` stays the umbrella architecture/system name while `Spaghetti Sounds` becomes the preferred UI-facing toolbar label inside that broader audio direction
1. 2026-03-21 09:31: Created this architecture idea doc as the bigger umbrella vision beyond `Radio.md`, reframing the current radio/sampler work as one branch of a future node-and-wire audio editor that can grow toward a DAW-like ParaHook subsystem

### Purpose

This doc defines the long-range architecture direction for the audio node editor that may grow out of `Radio`.

Use it to answer:
- what the bigger post-`Radio` audio system could become
- how it relates to `Radio`, `Sampler`, and the `Spaghetti` editor
- what node families, wire types, and runtime layers the future editor likely needs
- what the first honest cut should and should not try to solve
- which working name currently reads best

### Why This Doc Exists

`Radio.md` and `Sampler.md` now describe the right near-term scope:
- app-side playback
- burst sampling
- one simple sequencer surface

That is still the correct current implementation read.

But the longer-range idea is already wider than a toolbar-plus-sequencer:
- a node canvas
- wires
- modular signal flow
- reusable audio tools
- a DAW-like workbench with ParaHook flavor

This doc exists so that bigger vision has one explicit home without forcing `Radio.md` to stop being the narrow implementation-facing planning surface.

### Scope

This doc covers:
- the broader audio-graph / DAW direction
- naming candidates
- how audio nodes and wires should relate to `Spaghetti`
- likely future editor surfaces
- honest first-pass boundaries

This doc does not cover:
- current implementation task breakdowns
- detailed runtime API contracts
- exact plugin/effect format support
- export/render pipeline details
- final UI styling

## Doc Body

### Short Version

The long-range audio direction should likely become a dedicated node-based editor that sits beside `Spaghetti`, not merely a larger `Radio` toolbar.

`Radio` then becomes:
- the current shipped audio personality/system
- the narrow playback and sampler surface
- the place where source playback, burst sampling, and simple sequencer behavior first land

The broader system becomes:
- a visual audio graph
- node boxes
- wires
- transport and metering
- routing between sources, cue slicers, sequencers, effects, and outputs
- a DAW-like workspace that still feels like ParaHook instead of a generic timeline-only clone

### Working Name Direction

Recommended current working name:
- `Audio Patchbay`

Why this is the strongest current working name:
- it immediately implies nodes, routing, and wires
- it fits audio language better than a generic `Graph`
- it is broader than the current `Sampler`
- it does not force the full product identity to be named `DAW`

Other viable names:
- `Signal Graph`
  - cleaner system language
  - less musical personality
- `Spaghetti Sounds`
  - strong playful toolbar or mode label
  - weaker as the canonical system/architecture name once the graph grows deeper
- `Radio Studio`
  - preserves the current `Radio` identity
  - may blur the line between the current small subsystem and the future large editor
- `Spaghetti Audio`
  - clearly ties to the current editor grammar
  - may imply the audio system should share every CAD-specific rule

Current recommendation:
- use `Audio Patchbay` as the architecture-doc working name
- keep `Spaghetti Sounds` as the preferred UI-facing toolbar label when a friendlier surface name is wanted
- keep `Radio` as the current subsystem identity unless a later product decision replaces or narrows it

### Naming Split

Use this naming split for now:

- `Audio Patchbay`
  - umbrella architecture/system name
  - the broader node-and-wire audio editor direction
- `Spaghetti Sounds`
  - UI-level toolbar or surface label
  - the more playful name the user sees on the control surface

Important rule:
- do not rename the full architecture direction to `Spaghetti Sounds`
- do use `Spaghetti Sounds` when the UI needs a more characterful label than `Audio Patchbay`

### Relationship To Existing Docs

- `Radio.md`
  - current implementation-facing audio subsystem doc
- `Sampler.md`
  - current simple sequencer cut inside `Radio`
- `Audio Patchbay`
  - longer-range node-editor vision that could later host or absorb the earlier systems
- `Spaghetti`
  - the existing node-editor grammar and many of the interaction patterns worth reusing

Important rule:
- do not force `Radio.md` to act like the umbrella vision doc
- do not widen the current sampler phases into the full patchbay too early

### Core Product Read

This system should feel like a visual music and sound lab inside ParaHook.

It should not be treated as:
- a generic plugin host first
- only background music flavor second

It should be treated as:
- a creative workbench
- a modular audio graph
- a playful but serious authoring surface

Desired feel:
- playful
- legible
- modular
- patchable
- fast to experiment with
- visually closer to `Spaghetti` than to a spreadsheet of mixer channels

### Main UX Shape

#### 1. Graph Canvas

The main surface should be a node canvas with wires.

Likely reuse from `Spaghetti`:
- drag nodes
- connect typed ports
- box selection
- routed wires when useful
- add-node search/spawn flow

#### 2. Inspector / Node Surface

Selected nodes should expose:
- compact controls
- per-node params and toggles
- clear input/output ports
- preview/readout state when useful

#### 3. Transport Surface

Even in a node editor, the user still needs:
- play
- stop
- tempo
- loop
- position
- record later if the system grows that far

#### 4. Source / Cue Surface

The user needs an easy way to pick a current source, define cue regions, or randomize slice positions without requiring full waveform-edit tooling on day one.

#### 5. Performance / Jam Read

The first good version should feel playable and reroutable live, not only editable in a static offline way.

### Likely Node Families

The first likely node families are:
- `Source`
  - current radio/url source
  - generated tone/noise
  - later imported clips
- `FM Voice`
  - generated synth voice with carrier/modulator relationships
  - strong first flagship sound-generation node
- `Cue / Slice`
  - choose or randomize time regions inside a source
- `Trigger`
  - receive pulse/event input
  - console/UI interaction trigger
  - step trigger
- `Clock / Transport`
  - BPM
  - subdivisions
  - loop phase
  - reset
- `Sequencer`
  - step lanes
  - probability or gate logic later
- `Sampler Voice`
  - play a cue region with envelope and rate controls
- `Mixer`
  - gain
  - mute/solo
  - grouping
- `Effect`
  - filter
  - delay
  - distortion
  - later color/spatial tools
- `Modulation`
  - LFO
  - envelope
  - random source
  - macro control
- `Output`
  - master bus
  - preview bus
  - analysis or meter node

### FM Synth As A Flagship Generated Node

`FM Voice` is one of the strongest first real patchbay nodes.

Why it fits this project especially well:
- it is generated sound, not borrowed media
- we fully own the synthesis path
- it matches ParaHook's broader generator identity
- it creates a clean conceptual pairing with `Spaghetti`

That pairing matters:
- `Spaghetti` is graph-driven 3D/model generation
- `Audio Patchbay` can become graph-driven sound generation
- both systems then share the same core read:
  - nodes create signals
  - nodes transform signals
  - wires route typed flow
  - inspectors expose local controls

This makes FM synthesis more than just "a cool instrument."

It becomes proof that ParaHook can host multiple generator domains through one familiar authoring language.

#### Why FM Is Better Than Chasing External Audio First

Compared with trying to force third-party media into a deep effect graph, FM synthesis is cleaner because:
- there is no provider policy problem
- there is no widget/iframe ownership problem
- there is no CORS/proxy dependency
- timing and routing stay app-owned
- the node graph remains honest from the first version

This is a much better flagship path for `Audio Patchbay` than building around constrained external stream sources.

#### First FM Node Read

The first honest FM node does not need to be a full workstation synth.

Good first controls:
- carrier frequency
- modulator ratio
- modulation index
- attack
- decay
- sustain
- release
- output gain

Good first routing read:
- `Sequencer` or trigger node sends note/event input
- `FM Voice` generates the sound
- `Gain` / `Mixer` shapes level
- later `Filter`, `Delay`, or `Reverb` can sit after it
- `Output` sends it to the master bus

#### Product Direction Rule

If `Audio Patchbay` needs one early node that proves the system is more than a toy, `FM Voice` is a strong candidate.

Reason:
- it demonstrates real sound generation
- it reinforces the generator identity of the app
- it benefits directly from the node-and-wire UI grammar
- it avoids the policy and source-ownership traps of third-party streaming audio

### Wire Types

The audio graph should not treat every wire the same.

Likely first wire classes:
- `Audio`
  - actual signal flow
- `Event`
  - note/trigger/pulse style messages
- `Control`
  - continuous numeric modulation or macro values
- `Transport`
  - tempo/phase/sync signals when explicit wiring is useful

Important rule:
- typed wire color/language should be obvious
- audio wires should not be confused with control-rate values

### Docked Idea - SoundCloud Link Through Proxy Into Full Effects Graph

This idea is attractive on paper:
- take a `SoundCloud` link
- resolve it to a direct stream
- pass that stream through a small proxy that adds permissive CORS headers
- load it into our own `<audio>` / `AudioContext` path
- then run `Filter`, `EQ`, `Delay`, `Pitch Shift`, `Phaser`, `Reverb`, and later nodes inside `Audio Patchbay`

Technically, that general architecture can work for sources we honestly control.

For example:
- imported files
- self-hosted audio
- generated sources
- direct streams that we are actually allowed to fetch and process in our own graph

The problem is that `SoundCloud` is not just "any remote mp3."

#### Why The Idea Seems Plausible

The browser/audio-engine logic is real:
- if we own the media element or decoded buffer
- and the source is CORS-usable
- and we can route it into our own `AudioContext`

Then the normal Web Audio effect chain becomes possible.

That means the DSP part is not the blocker.

The blocker is source ownership and platform policy.

#### Current Technical Limitation

The current repo `SoundCloud` path is widget-style playback, not raw-source ownership.

That means:
- we can control transport-like behavior
- we can ask the widget to play or seek
- we do not honestly own the raw sample stream for a normal in-engine effect graph

So the current `Radio`/`SoundCloud` seam is acceptable for:
- playback
- seek
- burst/sampler-style triggering

It is not the right foundation for:
- a true filter chain
- real EQ
- delay feedback routing
- phaser modulation
- convolver reverb
- true pitch-shift processing

#### Why The Proxy Version Is Docked

Even if we later find an API path that exposes a direct stream URL, the proposed proxy approach is currently docked.

Reason:
- the moment we resolve a `SoundCloud` stream into our own graph and process it through our own effects chain, we are no longer doing simple embedded player control
- we are effectively transforming or remixing third-party streamed content through our own audio engine
- that appears to conflict with `SoundCloud` public-API policy boundaries

Important reminder for future-me:
- `SoundCloud` public-API policy explicitly warns that the APIs cannot be used for some cases including mixing music from `SoundCloud` with other content, and also warns against downloading or storing content
- a proxy that re-serves the stream to make it usable in our own effects graph is close enough to that risk that we should treat it as out-of-bounds unless `SoundCloud` explicitly authorizes it

Current decision:
- do not build `SoundCloud -> proxy -> Audio Patchbay FX graph` as a planned product path
- do not treat it as an acceptable hidden workaround
- if it ever comes up again, re-read this section first

#### What This Means For Node Planning

For `SoundCloud` sources:
- `Radio` playback is still fine
- sampler/sequencer behavior tied to transport windows is still fine
- exact waveform detail may still be limited depending on provider data
- full effect nodes should not assume `SoundCloud` is a controllable source

For real `Audio Patchbay` nodes:
- `Filter`
- `EQ`
- `Delay`
- `Pitch Shift`
- `Phaser`
- `Reverb`

These are still valid node goals.

But they should be planned first against sources we truly control:
- imported file source
- self-hosted stream/source
- generated/internal source

#### Preferred Source Rule

If `Audio Patchbay` grows into a real effects graph, the first-class effect-capable source types should be:
- imported audio files
- self-hosted or otherwise explicitly controllable streams
- generated synth/noise/tone sources

`SoundCloud` should remain:
- a `Radio` personality/input source
- a playback-oriented source
- a constrained source with explicit provider limitations

Not:
- the primary legal/technical foundation for the patchbay effect graph

#### Policy Warning

As of `2026-03-21`, treat this as a policy-risk idea, not merely a technical TODO.

If this idea is reconsidered later:
- verify the current `SoundCloud` API terms again
- verify whether direct stream access for this use case is explicitly allowed
- verify whether proxying/re-serving the stream is allowed
- do not assume that "possible in code" means "allowed as a product"

### Relationship To Spaghetti

This should feel like a sibling system to `Spaghetti`, not a copy-paste skin.

Strong reuse candidates:
- node canvas interaction model
- add/search flow
- selection behavior
- typed ports and wire colors
- graph serialization ideas
- browser/workspace integration

Likely audio-specific differences:
- transport state is central
- live playback timing matters
- meters and playheads matter
- some nodes may want small embedded mini-UIs
- the runtime needs real-time safety and scheduling rules that CAD graphs do not

Plain-English rule:
- reuse the editor grammar where it helps
- do not force audio authoring to inherit CAD-specific assumptions

### Radio's Place In The Bigger Vision

In the long run, `Radio` should probably become one of these:
- the default packaged patch inside the audio editor
- the user-facing personality name for the audio system
- a simplified hosted surface on top of the deeper patchbay
- a preset/workspace mode inside the larger audio tool

The current best read is:
- `Radio` is the current subsystem and vibe
- `Sampler` is the current simple sequencer branch
- `Audio Patchbay` is the broader authoring environment that could later host both

### Honest First Expansion Path

Do not jump straight from the current merged toolbar to a giant professional DAW clone.

A more honest path is:
1. keep `Radio` and the current sampler usable as the narrow shipped surface
2. introduce one dedicated audio graph document/editor surface
3. support only a tiny first node set:
   - source
   - clock
   - step sequencer
   - sampler voice
   - gain
   - output
4. allow simple wiring and audible playback
5. only then widen into more routing, effects, modulation, and multiple lanes

### Guardrails

- do not reopen the current radio/sampler implementation phases just to satisfy future patchbay goals
- do not require full waveform editing before the first graph version exists
- do not require plugin hosting before the core routing model is real
- do not let the first version become a giant mixer/timeline app with no strong graph identity
- do keep the playful `Radio` personality even if the deeper system grows more technical

### Open Naming / Product Questions

- Should the future user-facing name stay `Radio`, or does `Radio` become one mode or patch inside a larger audio tool?
- Does the first graph live in its own workspace like `Spaghetti`, or as one hosted panel/window inside the existing shell?
- Are cue regions explicit authored objects, or just params owned by sampler-style nodes at first?
- How much of the existing `Spaghetti` canvas/store stack should be reused directly versus treated only as interaction inspiration?

### Initial Recommendation

Treat this as a separate umbrella doc above `Radio.md` and `Sampler.md`.

For now:
- use `Audio Patchbay` as the working name
- keep `Radio` as the current implementation-facing subsystem
- keep `Sampler` as the current simple sequencer cut
- plan the future graph editor as a sibling to `Spaghetti`, not as a never-ending toolbar expansion

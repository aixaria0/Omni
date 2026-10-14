# Observatory edition

The home route now opens a complete investigation desk instead of the former
marketing/empty-state screen. Persistent navigation exposes all ten existing and
new views, and a search command palette opens with Ctrl/Cmd+K. `/` focuses the
indicator input. Existing history, watchlist, lattice, Stress, Autopilot, Prism,
source, temporal, capsule, and Quantum Fabric workflows remain available.

## First visit and live cases

With no active investigation, the workspace presents `OBSERVATORY_DEMO`, an
explicitly synthetic `training.example` exercise with documentation IP addresses,
fictional relationships and three evidence threads. It does not make collector
requests or enter investigation history. Autopilot is disabled for this exercise.

Typing an indicator or selecting a public example initiates real collection. The
existing public-infrastructure acknowledgment is requested when the first live
collection is initiated, rather than blocking offline exploration at page load.
After collection, the same desk renders the actual graph, sources, evidence
matrix and hypotheses. Collection errors are visible, and the previous case stays
inspectable while the next request is pending. Source counts describe responses
at collection time, not ongoing connectivity or freshness monitoring.

## Spatial evidence atlas

`layoutAtlas` deterministically assigns abstract 3D positions to actual graph
nodes. Positions depend on sorted ids/kinds and hop depth. `projectAtlas` rotates
and projects them onto a responsive 2D canvas. Every drawn edge corresponds to an
edge in the supplied graph. Reference rings are visual coordinate guides.

Dragging rotates the graph; controls pause rotation, zoom and reset. Selecting a
node shows its recorded details. Search and neighborhood focus narrow the view.
A native entity selector provides keyboard access to every node. The canvas draws
at most 250 nodes and exposes that limit next to the selection controls. It is
not a geographic map and its animation does not claim live traffic.

Rendering caps pixel density at 2 and frame rate at 30. Draws are skipped when the
atlas is offscreen or the document is hidden, and static frames are not redrawn
when rotation is paused. Automatic rotation respects reduced-motion preferences.
All observers and the animation callback are cleaned up when the component exits.

## Evidence desk and shared scenarios

The evidence mixing desk and decision monitor are backed by `evaluateScenario`.
Dragging a retention slider or removing a row updates the active hypothesis
weights immediately. The baseline marker stays visible. The active controls are
shared with Scenario Room, so switching between the two views preserves the
intervention and pinned branches. A new investigation or active lattice resets
the desk. The original evidence packet, capsule hashes, planner and receipt
semantics are not modified by scenario controls.

These are fixed-factor sensitivity weights, not calibrated truth probabilities,
a causal model, or an AI model rerun. The existing Scenario Room export contract
and six-branch limit remain in effect. See [Scenario Room](SCENARIO_ROOM.md).

## Presentation and access

The layout uses a persistent rail on desktop, a dismissible drawer on smaller
screens, a stacked atlas/monitor on mobile, and an internally scrollable evidence
table. Command and operating-boundary dialogs use Radix focus/escape behavior.
Quantum Fabric remains a separate route and trust plane.

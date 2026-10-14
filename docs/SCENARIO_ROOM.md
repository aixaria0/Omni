# Scenario Room

The Scenarios tab adds a non-destructive decision workbench to each investigation.
Each evidence slider retains 0–100% of that row's influence. Source mute presets use
Stress Engine provenance inference; a row shared by multiple collectors is fully
muted by any matching preset. These presets do not establish source independence.

The baseline is the normalized active posterior. For each hypothesis, the scenario
subtracts `(1 - retention) * log(factor)` from its log weight, then normalizes with
log-sum-exp. Factors match Stress: support 1.55, contradict 0.55, neutral/na 1.
Full retention preserves baseline; zero retention matches evidence removal. Invalid
controls default to full retention; controls are clamped to [0,1].

This is sensitivity analysis, not calibrated inference or an AI model rerun. It
never changes the investigation, capsule roots, or Autopilot receipt semantics.

Up to six named branches are held in component/session memory. Switching tabs preserves them; changing the investigation or active lattice clears them. Export before leaving to keep
a JSON scenario pack including the complete baseline lattice, query, timestamp,
model identifier and branch controls. Evaluate any exported branch by passing its
retention map and lattice to `evaluateScenario`. The export is not a sealed capsule.

Prism now includes label/kind/detail search, selected-node-centered zoom,
neighborhood filtering, keyboard-selectable nodes, and linked-entity traversal.
Reset view clears filters and zoom. The existing radial layout is fitted to its
viewport by maximum hop rather than placing higher-hop nodes outside the canvas.

The landing page also offers an explicitly synthetic training playground at
`training.example`. Its fixed fixture makes no live collection or external truth
claim and is never inserted into investigation history. Reducing the CT row
changes the leading hypothesis, demonstrating the decision boundary offline.

In the Observatory edition, the home page starts in the offline exercise itself.
The Observatory mixing desk shares its active controls with Scenario Room; edits
in either view appear in the other. See [Observatory](OBSERVATORY.md).

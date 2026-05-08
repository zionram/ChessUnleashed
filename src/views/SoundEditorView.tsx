import React, { useMemo, useRef, useState } from "react";
import {
  isSupportedAudioFile,
  useAudio,
  type AudioRule,
  type SoundAsset,
} from "../context/AudioContext";
import { useSettings } from "../context/SettingsContext";
import { getCustomEventStatus } from "../events/CustomEventRuntime";

type RuleDraft = Omit<AudioRule, "id">;

const FILTERS = [
  "All",
  "Piece Moves",
  "Captures",
  "Game Events",
  "UI Events",
  "Dynamic Sounds",
  "Music",
  "Custom Events",
];

const PIECES = ["any", "p", "n", "b", "r", "q", "k"];
const SIDES = ["any", "w", "b"];

const CATEGORY_EVENTS: Record<string, Array<{ id: string; label: string }>> = {
  "Piece Moves": [
    { id: "move", label: "Any move" },
    { id: "pieceMove", label: "Piece moves" },
    { id: "capture", label: "Piece captures" },
    { id: "pieceCaptured", label: "Piece is captured" },
    { id: "promotion", label: "Promotion" },
    { id: "check", label: "Check" },
    { id: "checkmate", label: "Checkmate" },
  ],
  Captures: [
    { id: "capture", label: "Any capture" },
    { id: "capturingPiece", label: "Capturing piece" },
    { id: "capturedPiece", label: "Captured piece" },
  ],
  "Game Events": [
    { id: "gameStart", label: "Game start" },
    { id: "gameEnd", label: "Game over" },
    { id: "win", label: "Win" },
    { id: "loss", label: "Loss" },
    { id: "draw", label: "Draw" },
    { id: "resign", label: "Resign" },
    { id: "timerLow", label: "Timer low" },
  ],
  "UI Events": [
    { id: "panelOpen", label: "Panel opened" },
    { id: "panelClose", label: "Panel closed" },
    { id: "buttonClick", label: "Button clicked" },
    { id: "themeApplied", label: "Theme or package applied" },
    { id: "chatOpen", label: "Open Chat panel" },
  ],
  "Dynamic Sounds": [
    { id: "dynamicGroup", label: "Random or grouped sound" },
    { id: "stateBasedSound", label: "State-based sound" },
  ],
  Music: [
    { id: "backgroundMusic", label: "Background music" },
    { id: "eventMusic", label: "Event music" },
  ],
  "Custom Events": [{ id: "customEvent", label: "Custom event ID" }],
};

const pieceNames: Record<string, string> = {
  any: "Any piece",
  p: "Pawn",
  n: "Knight",
  b: "Bishop",
  r: "Rook",
  q: "Queen",
  k: "King",
};

const getFileType = (file: File): SoundAsset["fileType"] => {
  const lowerName = file.name.toLowerCase();
  return lowerName.endsWith(".mid") || lowerName.endsWith(".midi")
    ? "midi"
    : "audio";
};

const normalizeCategory = (category?: string) => {
  if (category === "UI / Panel Events") return "UI Events";
  if (!category || category === "Other Events") return "Custom Events";
  return category;
};

const inferCategory = (eventName: string) => {
  if (
    [
      "move",
      "pieceMove",
      "pieceCaptured",
      "promotion",
      "castle",
      "check",
      "checkmate",
    ].includes(eventName)
  )
    return "Piece Moves";
  if (["capture", "capturingPiece", "capturedPiece"].includes(eventName))
    return "Captures";
  if (
    [
      "stalemate",
      "draw",
      "gameStart",
      "gameEnd",
      "win",
      "loss",
      "resign",
      "timerLow",
    ].includes(eventName)
  )
    return "Game Events";
  if (
    eventName.includes("panel") ||
    eventName.includes("chat") ||
    eventName === "buttonClick" ||
    eventName === "themeApplied"
  )
    return "UI Events";
  if (eventName.includes("Music")) return "Music";
  return "Custom Events";
};

const getEventLabel = (eventName: string, category?: string) => {
  const options = CATEGORY_EVENTS[normalizeCategory(category)] ?? [];
  return options.find((option) => option.id === eventName)?.label ?? eventName;
};

const getSoundName = (library: SoundAsset[], soundId: string) =>
  library.find((sound) => sound.id === soundId)?.name ?? "Missing sound";

const createDefaultDraft = (library: SoundAsset[]): RuleDraft => ({
  name: "",
  event: "move",
  piece: "any",
  side: "any",
  mode: "any",
  soundId: library[0]?.id || "",
  category: "Piece Moves",
  target: "any",
  playback: {
    allowOverlap: true,
    playOnceUntilReset: false,
    stopOtherSounds: false,
    duckMusic: false,
    pauseMusic: false,
    resumeMusicAfter: true,
    loopWhileEventTrue: false,
    stopWhenEventEnds: false,
  },
});

const getRuleSummary = (rule: AudioRule) => {
  const category = normalizeCategory(
    rule.category || inferCategory(rule.event),
  );
  const eventLabel = getEventLabel(rule.event, category);
  const pieceLabel = pieceNames[rule.piece] ?? rule.piece;
  const sideLabel =
    rule.side === "any" ? "any side" : rule.side === "w" ? "White" : "Black";
  if (category === "Piece Moves" || category === "Captures") {
    return (
      rule.name?.trim() ||
      `${eventLabel} for ${pieceLabel.toLowerCase()} (${sideLabel})`
    );
  }
  return rule.name?.trim() || eventLabel;
};

const getPlaybackSummary = (rule: AudioRule) => {
  const playback = rule.playback ?? {};
  const labels = [
    playback.allowOverlap ? "Overlap" : "",
    playback.playOnceUntilReset ? "Once" : "",
    playback.stopOtherSounds ? "Stop other effects" : "",
    playback.duckMusic ? "Lower music" : "",
    playback.pauseMusic ? "Pause music" : "",
    playback.loopWhileEventTrue ? "Loop while active" : "",
    playback.stopWhenEventEnds ? "Stop when event ends" : "",
  ].filter(Boolean);
  return labels.length ? labels.join(", ") : "Default";
};

const SoundEditorView: React.FC = () => {
  const {
    masterVolume,
    setMasterVolume,
    sfxVolume,
    setSfxVolume,
    library,
    addSound,
    removeSound,
    renameSound,
    rules,
    addRule,
    updateRule,
    removeRule,
    ruleCategories,
    addRuleCategory,
    playLibrarySound,
    stopPreview,
  } = useAudio();
  const { settings, toggleView } = useSettings();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleDraft, setRuleDraft] = useState<RuleDraft>(() =>
    createDefaultDraft(library),
  );
  const [ruleEditorOpen, setRuleEditorOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  const categories = useMemo(() => {
    const savedCategories = ruleCategories.map(normalizeCategory);
    const ruleDerivedCategories = rules.map((rule) =>
      normalizeCategory(rule.category || inferCategory(rule.event)),
    );
    return [
      "All",
      ...Array.from(
        new Set([
          ...FILTERS.slice(1),
          ...savedCategories,
          ...ruleDerivedCategories,
        ]),
      ),
    ];
  }, [ruleCategories, rules]);

  const visibleRules = useMemo(() => {
    if (selectedCategory === "All") return rules;
    return rules.filter(
      (rule) =>
        normalizeCategory(rule.category || inferCategory(rule.event)) ===
        selectedCategory,
    );
  }, [rules, selectedCategory]);

  const eventOptions =
    normalizeCategory(ruleDraft.category) === "Custom Events"
      ? [
          ...CATEGORY_EVENTS["Custom Events"],
          ...settings.customEvents.map((eventDefinition) => ({
            id: eventDefinition.eventId,
            label: `${eventDefinition.name || eventDefinition.eventId} (${getCustomEventStatus(eventDefinition, settings.customEvents)})`,
          })),
        ]
      : (CATEGORY_EVENTS[normalizeCategory(ruleDraft.category)] ??
        CATEGORY_EVENTS["Custom Events"]);
  const selectedSound = library.find((sound) => sound.id === ruleDraft.soundId);
  const selectedCustomEvent = settings.customEvents.find(
    (eventDefinition) => eventDefinition.eventId === ruleDraft.event,
  );
  const selectedCustomEventStatus = selectedCustomEvent
    ? getCustomEventStatus(selectedCustomEvent, settings.customEvents)
    : null;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const allFiles = Array.from(event.target.files ?? []);
    const files = allFiles.filter(isSupportedAudioFile);
    const rejected = allFiles.filter((file) => !isSupportedAudioFile(file));
    if (rejected.length) {
      setUploadMessage(
        `Unsupported file skipped: ${rejected.map((file) => file.name).join(", ")}. Use MP3, WAV, OGG, M4A, MID, or MIDI.`,
      );
    } else {
      setUploadMessage("");
    }
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) =>
        addSound(
          file.name.replace(/\.[^/.]+$/, ""),
          ev.target?.result as string,
          getFileType(file),
        );
      reader.readAsDataURL(file);
    });
    event.target.value = "";
    if (files.length) setLibraryOpen(true);
  };

  const openNewRule = () => {
    setEditingRuleId(null);
    setRuleDraft(createDefaultDraft(library));
    setRuleEditorOpen(true);
  };

  const openEditRule = (rule: AudioRule) => {
    setEditingRuleId(rule.id);
    setRuleDraft({
      name: rule.name ?? "",
      event: rule.event,
      piece: rule.piece,
      side: rule.side,
      mode: rule.mode,
      soundId: rule.soundId,
      category: normalizeCategory(rule.category || inferCategory(rule.event)),
      target: rule.target ?? "any",
      playback: {
        allowOverlap: rule.playback?.allowOverlap ?? true,
        playOnceUntilReset: rule.playback?.playOnceUntilReset ?? false,
        stopOtherSounds: rule.playback?.stopOtherSounds ?? false,
        duckMusic: rule.playback?.duckMusic ?? false,
        pauseMusic: rule.playback?.pauseMusic ?? false,
        resumeMusicAfter: rule.playback?.resumeMusicAfter ?? true,
        loopWhileEventTrue: rule.playback?.loopWhileEventTrue ?? false,
        stopWhenEventEnds: rule.playback?.stopWhenEventEnds ?? false,
      },
    });
    setRuleEditorOpen(true);
  };

  const saveRule = () => {
    const nextRule = {
      ...ruleDraft,
      category: normalizeCategory(
        ruleDraft.category || inferCategory(ruleDraft.event),
      ),
      soundId: ruleDraft.soundId || library[0]?.id || "",
    };
    if (!nextRule.soundId) return;
    if (editingRuleId) updateRule(editingRuleId, nextRule);
    else addRule(nextRule);
    setRuleEditorOpen(false);
    setEditingRuleId(null);
  };

  const updateDraftPlayback = (
    key: keyof NonNullable<AudioRule["playback"]>,
    value: boolean,
  ) => {
    setRuleDraft({
      ...ruleDraft,
      playback: {
        ...ruleDraft.playback,
        [key]: value,
      },
    });
  };

  const addCustomCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    addRuleCategory(trimmed);
    setSelectedCategory(trimmed);
    setNewCategoryName("");
  };

  const shellStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 1120,
    margin: "0 auto",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    color: "#e2e8f0",
    boxSizing: "border-box",
  };

  const cardStyle: React.CSSProperties = {
    border: "1px solid rgba(148, 163, 184, 0.18)",
    background: "rgba(8, 18, 34, 0.78)",
    borderRadius: 12,
    boxShadow: "0 16px 36px rgba(2, 6, 23, 0.22)",
    padding: 12,
  };

  const mutedStyle: React.CSSProperties = { color: "#8ea6bf", fontSize: "0.74rem" };
  const pillStyle = (active = false): React.CSSProperties => ({
    border: active ? "1px solid rgba(96, 165, 250, 0.65)" : "1px solid rgba(148, 163, 184, 0.18)",
    background: active ? "rgba(37, 99, 235, 0.34)" : "rgba(15, 23, 42, 0.58)",
    color: active ? "#dbeafe" : "#9fb3c8",
    borderRadius: 999,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: "0.74rem",
    fontWeight: 800,
    whiteSpace: "nowrap",
  });

  const smallButtonStyle: React.CSSProperties = {
    border: "1px solid rgba(148, 163, 184, 0.22)",
    background: "rgba(15, 23, 42, 0.72)",
    color: "#dbeafe",
    borderRadius: 8,
    padding: "7px 10px",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: "0.76rem",
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...smallButtonStyle,
    border: "1px solid rgba(96, 165, 250, 0.5)",
    background: "linear-gradient(135deg, rgba(37, 99, 235, 0.52), rgba(14, 165, 233, 0.28))",
    color: "#eff6ff",
  };

  const dangerButtonStyle: React.CSSProperties = {
    ...smallButtonStyle,
    border: "1px solid rgba(248, 113, 113, 0.34)",
    background: "rgba(127, 29, 29, 0.28)",
    color: "#fecaca",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    background: "rgba(2, 6, 23, 0.45)",
    color: "#e2e8f0",
    borderRadius: 8,
    padding: "8px 9px",
  };

  const renderRuleCard = (rule: AudioRule) => {
    const category = normalizeCategory(rule.category || inferCategory(rule.event));
    const playbackLabels = getPlaybackSummary(rule).split(", ").filter(Boolean);
    return (
      <article key={rule.id} style={{ ...cardStyle, padding: 10, display: "flex", flexDirection: "column", gap: 9 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, color: "#f8fafc", fontSize: "0.92rem" }}>{getRuleSummary(rule)}</div>
            <div style={mutedStyle}>{getSoundName(library, rule.soundId)}</div>
          </div>
          <span style={{ ...pillStyle(true), padding: "4px 8px", fontSize: "0.66rem" }}>{category}</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {playbackLabels.slice(0, 4).map((label) => (
            <span key={label} style={{ ...pillStyle(false), padding: "3px 7px", fontSize: "0.66rem" }}>{label}</span>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 7 }}>
          <button type="button" onClick={() => openEditRule(rule)} style={smallButtonStyle}>Edit</button>
          <button type="button" onClick={() => removeRule(rule.id)} style={dangerButtonStyle}>Delete</button>
        </div>
      </article>
    );
  };

  return (
    <div className="cu-view-shell cu-sound-editor-view" style={shellStyle}>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.mid,.midi"
        multiple
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />

      <header style={{ ...cardStyle, display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "1.05rem", fontWeight: 950 }}>Sound Editor</div>
          <div style={mutedStyle}>Assign sounds to moves, captures, UI events, music, and custom events.</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button type="button" onClick={openNewRule} style={primaryButtonStyle}>Add Rule</button>
          <button type="button" onClick={() => fileInputRef.current?.click()} style={smallButtonStyle}>Add Files</button>
        </div>
      </header>

      {uploadMessage && <div className="cu-warning-note">{uploadMessage}</div>}

      <section style={{ ...cardStyle, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontWeight: 800, fontSize: "0.78rem" }}>
          Master volume
          <input type="range" min="0" max="1" step="0.05" value={masterVolume} onChange={(e) => setMasterVolume(parseFloat(e.target.value))} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontWeight: 800, fontSize: "0.78rem" }}>
          Sound effects
          <input type="range" min="0" max="1" step="0.05" value={sfxVolume} onChange={(e) => setSfxVolume(parseFloat(e.target.value))} />
        </label>
      </section>

      <nav style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2 }}>
        {categories.map((category) => (
          <button key={category} type="button" onClick={() => setSelectedCategory(category)} style={pillStyle(selectedCategory === category)}>
            {category}
          </button>
        ))}
      </nav>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 340px)", gap: 12, alignItems: "start" }}>
        <section style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 900 }}>Rules</div>
              <div style={mutedStyle}>{visibleRules.length} shown · {selectedCategory}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
            {visibleRules.map(renderRuleCard)}
            {!visibleRules.length && <div style={{ ...cardStyle, color: "#8ea6bf" }}>No sound rules in this category yet.</div>}
          </div>
        </section>

        <aside style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div>
              <div style={{ fontWeight: 900 }}>Sound Library</div>
              <div style={mutedStyle}>{library.length} files available</div>
            </div>
            <button type="button" onClick={() => setLibraryOpen(!libraryOpen)} style={smallButtonStyle}>{libraryOpen ? "Hide" : "Show"}</button>
          </div>
          {libraryOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto", paddingRight: 2 }}>
              {library.map((sound) => (
                <div key={sound.id} style={{ border: "1px solid rgba(148, 163, 184, 0.16)", borderRadius: 10, padding: 8, background: "rgba(15, 23, 42, 0.46)", display: "flex", flexDirection: "column", gap: 7 }}>
                  <input value={sound.name} onChange={(e) => renameSound(sound.id, e.target.value)} style={inputStyle} />
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <span style={{ ...pillStyle(false), padding: "3px 7px", fontSize: "0.65rem" }}>{(sound.fileType ?? "audio").toUpperCase()}</span>
                    <button type="button" onClick={() => playLibrarySound(sound.id)} disabled={sound.fileType === "midi"} style={smallButtonStyle}>{sound.fileType === "midi" ? "MIDI pending" : "Play"}</button>
                    <button type="button" onClick={() => removeSound(sound.id)} style={dangerButtonStyle}>Remove</button>
                  </div>
                </div>
              ))}
              {!library.length && <div style={mutedStyle}>No sound files yet. Add files to assign them to rules.</div>}
            </div>
          )}
        </aside>
      </div>

      {ruleEditorOpen && (
        <div className="cu-modal-backdrop">
          <div className="cu-modal-panel cu-scroll-area">
            <div className="cu-panel-titlebar">
              <div>
                <div className="cu-modal-title">{editingRuleId ? "Edit Sound Rule" : "Add Sound Rule"}</div>
                <div className="cu-muted-text">Choose the event, target, sound file, and playback behavior.</div>
              </div>
              <button type="button" onClick={() => setRuleEditorOpen(false)} className="cu-inline-button">Cancel</button>
            </div>

            <div className="cu-control-grid cu-modal-grid">
              <label className="cu-field-stack">Sound Rule Name
                <input value={ruleDraft.name ?? ""} onChange={(e) => setRuleDraft({ ...ruleDraft, name: e.target.value })} placeholder="Example: Pawn capture sound" className="cu-control-input" />
              </label>
              <label className="cu-field-stack">Sound Category
                <select value={normalizeCategory(ruleDraft.category)} onChange={(e) => {
                  const category = e.target.value;
                  const nextEvent = CATEGORY_EVENTS[category]?.[0]?.id ?? ruleDraft.event;
                  setRuleDraft({ ...ruleDraft, category, event: nextEvent });
                }} className="cu-control-input">
                  {FILTERS.filter((category) => category !== "All").map((category) => <option key={category} value={category}>{category}</option>)}
                  {categories.filter((category) => !FILTERS.includes(category)).map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <label className="cu-field-stack">Sound File
                <div className="cu-inline-control-grid">
                  <select value={ruleDraft.soundId} onChange={(e) => setRuleDraft({ ...ruleDraft, soundId: e.target.value })} className="cu-control-input">
                    {library.map((sound) => <option key={sound.id} value={sound.id}>{sound.name}{sound.fileType === "midi" ? " (MIDI playback pending)" : ""}</option>)}
                  </select>
                  <button type="button" onClick={() => playLibrarySound(ruleDraft.soundId)} disabled={!ruleDraft.soundId || selectedSound?.fileType === "midi"} className="cu-inline-button">Preview</button>
                  <button type="button" onClick={stopPreview} className="cu-inline-button">Stop</button>
                </div>
              </label>
              <label className="cu-field-stack">Trigger / Event
                <select value={ruleDraft.event} onChange={(e) => setRuleDraft({ ...ruleDraft, event: e.target.value })} className="cu-control-input">
                  {eventOptions.map((event) => <option key={event.id} value={event.id}>{event.label}</option>)}
                </select>
              </label>
              {(normalizeCategory(ruleDraft.category) === "Piece Moves" || normalizeCategory(ruleDraft.category) === "Captures") && (
                <>
                  <label className="cu-field-stack">Apply To
                    <select value={ruleDraft.piece} onChange={(e) => setRuleDraft({ ...ruleDraft, piece: e.target.value })} className="cu-control-input">
                      {PIECES.map((piece) => <option key={piece} value={piece}>{pieceNames[piece] ?? piece}</option>)}
                    </select>
                  </label>
                  <label className="cu-field-stack">Side
                    <select value={ruleDraft.side} onChange={(e) => setRuleDraft({ ...ruleDraft, side: e.target.value })} className="cu-control-input">
                      {SIDES.map((side) => <option key={side} value={side}>{side === "any" ? "Any side" : side === "w" ? "White" : "Black"}</option>)}
                    </select>
                  </label>
                </>
              )}
              {(normalizeCategory(ruleDraft.category) === "UI Events" || normalizeCategory(ruleDraft.category) === "Custom Events") && (
                <label className="cu-field-stack cu-grid-span-all">Apply To / Event ID
                  <input value={ruleDraft.target ?? ""} onChange={(e) => setRuleDraft({ ...ruleDraft, target: e.target.value })} placeholder="panel id, button id, or future custom event id" className="cu-control-input" />
                </label>
              )}
            </div>

            <section className="cu-panel-card">
              <div className="cu-section-title">Playback Behavior</div>
              <div className="cu-action-grid">
                {[
                  ["allowOverlap", "Allow overlap with other sound effects"],
                  ["playOnceUntilReset", "Play only once until event resets"],
                  ["stopOtherSounds", "Stop other sound effects before playing"],
                  ["duckMusic", "Lower background music while playing"],
                  ["pauseMusic", "Pause background music while playing"],
                  ["resumeMusicAfter", "Resume music after sound ends"],
                  ["loopWhileEventTrue", "Loop while event remains true"],
                  ["stopWhenEventEnds", "Stop when event condition ends"],
                ].map(([key, label]) => (
                  <label key={key} className="cu-checkbox-row">
                    <input type="checkbox" checked={!!ruleDraft.playback?.[key as keyof NonNullable<AudioRule["playback"]>]} onChange={(e) => updateDraftPlayback(key as keyof NonNullable<AudioRule["playback"]>, e.target.checked)} />
                    {label}
                  </label>
                ))}
              </div>
              {(ruleDraft.playback?.loopWhileEventTrue || ruleDraft.playback?.stopWhenEventEnds) && ruleDraft.event !== "check" && (
                <div className="cu-warning-note">Stateful stop is currently supported for Check / in-check events. Other event states are saved for future support.</div>
              )}
            </section>

            <section className="cu-info-note">
              {normalizeCategory(ruleDraft.category) === "Dynamic Sounds" && "Dynamic sound groups are saved as rules now. Random/group playback logic is prepared for a future pass."}
              {normalizeCategory(ruleDraft.category) === "Music" && "Music rules are prepared for event music and background music handoff. Full routing will use the Audio Controller."}
              {normalizeCategory(ruleDraft.category) === "Custom Events" && (selectedCustomEvent ? `${selectedCustomEvent.name}: ${selectedCustomEventStatus}. ${selectedCustomEventStatus === "Future-only" ? "This rule can be saved, but it will not fire until detection is added." : selectedCustomEvent.category}` : "Custom event IDs are saved here. Active events can fire now; Future-only tactical events are saved but will not fire until detection is added.")}
              {selectedSound?.fileType === "midi" && "MIDI files can be stored and assigned now. Browser MIDI playback support is pending."}
            </section>

            <div className="cu-action-row cu-action-row-end">
              <button type="button" onClick={() => setRuleEditorOpen(false)} className="cu-inline-button">Cancel</button>
              <button type="button" onClick={saveRule} disabled={!ruleDraft.soundId} className="cu-inline-button cu-primary-action">Save Rule</button>
            </div>
          </div>
        </div>
      )}

      <section style={{ ...cardStyle, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="New custom category" style={{ ...inputStyle, flex: "1 1 220px" }} />
        <button type="button" onClick={addCustomCategory} style={smallButtonStyle}>Add Category</button>
        <button type="button" onClick={() => toggleView("sound-editor")} style={smallButtonStyle}>Close</button>
      </section>
    </div>
  );
};

export default SoundEditorView;

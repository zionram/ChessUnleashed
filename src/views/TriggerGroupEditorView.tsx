import React, { useMemo, useState } from "react";
import { useSettings } from "../context/SettingsContext";
import { useAudio } from "../context/AudioContext";
import type {
  TriggerAction,
  TriggerCondition,
  TriggerGroup,
  TriggerConditionOperator,
} from "../events/TriggerGroups";
import {
  ACTION_TEMPLATES,
  BOARD_RESULT_OPTIONS,
  EVENT_CATALOG,
  PIECE_OPTIONS,
  SIDE_OPTIONS,
  describeConditionValue,
  findMatchingTriggerGroups,
  getCatalogEntryForEvent,
  getReadableTriggerText,
  makeCatalogAction,
  makeCatalogCondition,
  makeGroupFromCatalogEntry,
  makeTriggerId,
  searchEventCatalog,
  type EventCatalogEntry,
} from "../events/EventCatalog";

type EditorMode = "simple" | "advanced" | "system";
type SimpleStep = "when" | "limits" | "do" | "save";

const categories = [
  "All",
  ...Array.from(new Set(EVENT_CATALOG.map((entry) => entry.category))),
];

const operatorOptions: Array<{
  value: TriggerConditionOperator;
  label: string;
}> = [
  { value: "equals", label: "is" },
  { value: "notEquals", label: "is not" },
  { value: "includes", label: "contains" },
  { value: "exists", label: "exists" },
  { value: "notExists", label: "does not exist" },
];

const makeBlankGroup = (): TriggerGroup =>
  makeGroupFromCatalogEntry(EVENT_CATALOG[0]);

const cloneGroup = (group: TriggerGroup): TriggerGroup => ({
  ...group,
  trigger: {
    ...group.trigger,
    conditions: (group.trigger.conditions ?? []).map((condition) => ({
      ...condition,
    })),
  },
  actions: group.actions.map((action) => ({ ...action })),
  metadata: {
    ...(group.metadata ?? {}),
    tags: [...(group.metadata?.tags ?? [])],
    keywords: [...(group.metadata?.keywords ?? [])],
  },
});

const shellStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  padding: 14,
  color: "#e2e8f0",
  minHeight: 0,
  width: "100%",
  boxSizing: "border-box",
};

const panelStyle: React.CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.18)",
  background: "rgba(8, 18, 34, 0.86)",
  borderRadius: 16,
  padding: 14,
  boxSizing: "border-box",
  boxShadow: "0 14px 32px rgba(2, 6, 23, 0.28)",
};

const insetPanelStyle: React.CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.14)",
  background: "rgba(15, 23, 42, 0.54)",
  borderRadius: 14,
  padding: 12,
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  color: "#7dd3fc",
  fontSize: "0.68rem",
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.09em",
};

const mutedStyle: React.CSSProperties = {
  color: "#8aa2bd",
  fontSize: "0.74rem",
  lineHeight: 1.35,
};

const buttonStyle: React.CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.24)",
  background: "rgba(15, 23, 42, 0.72)",
  color: "#dbeafe",
  borderRadius: 10,
  padding: "8px 11px",
  cursor: "pointer",
  fontWeight: 850,
  fontSize: "0.74rem",
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  borderColor: "rgba(56, 189, 248, 0.55)",
  background:
    "linear-gradient(135deg, rgba(14, 116, 144, 0.94), rgba(29, 78, 216, 0.82))",
  color: "#eff6ff",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  background: "rgba(2, 6, 23, 0.5)",
  color: "#e2e8f0",
  borderRadius: 9,
  padding: "8px 9px",
  fontSize: "0.76rem",
  minWidth: 0,
};

const chipStyle = (active = false): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  border: `1px solid ${active ? "rgba(56, 189, 248, 0.74)" : "rgba(148, 163, 184, 0.22)"}`,
  background: active ? "rgba(14, 116, 144, 0.30)" : "rgba(15, 23, 42, 0.68)",
  color: active ? "#e0f2fe" : "#cbd5e1",
  borderRadius: 12,
  padding: "9px 12px",
  fontSize: "0.8rem",
  fontWeight: 900,
  cursor: "pointer",
  minHeight: 38,
});

const modeButtonStyle = (active: boolean): React.CSSProperties => ({
  ...buttonStyle,
  textAlign: "left",
  padding: "10px 12px",
  borderColor: active
    ? "rgba(56, 189, 248, 0.70)"
    : "rgba(148, 163, 184, 0.20)",
  background: active ? "rgba(14, 116, 144, 0.30)" : "rgba(15, 23, 42, 0.58)",
});

const describeCondition = (condition: TriggerCondition) =>
  `${condition.label}: ${describeConditionValue(condition)}`;

const conditionInput = (
  condition: TriggerCondition,
  updateCondition: (id: string, updates: Partial<TriggerCondition>) => void,
) => {
  const commonProps = {
    value: String(condition.value ?? ""),
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => updateCondition(condition.id, { value: event.target.value }),
    style: inputStyle,
  };

  if (
    condition.field === "piece" ||
    condition.field === "target" ||
    condition.field === "promotion"
  ) {
    return (
      <select {...commonProps}>
        {PIECE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.icon} {option.label}
          </option>
        ))}
      </select>
    );
  }
  if (condition.field === "side") {
    return (
      <select {...commonProps}>
        {SIDE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  if (condition.field === "result") {
    return (
      <select {...commonProps}>
        {BOARD_RESULT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.icon} {option.label}
          </option>
        ))}
      </select>
    );
  }
  return <input {...commonProps} placeholder="Optional value" />;
};

const TriggerGroupEditorView: React.FC = () => {
  const {
    settings,
    createTriggerGroup,
    updateTriggerGroup,
    deleteTriggerGroup,
  } = useSettings();
  const { library, playLibrarySound, stopPreview } = useAudio();
  const groups = settings.triggerGroups ?? [];
  const [draft, setDraft] = useState<TriggerGroup>(() =>
    groups[0] ? cloneGroup(groups[0]) : makeBlankGroup(),
  );
  const [activeMode, setActiveMode] = useState<EditorMode>("simple");
  const [activeStep, setActiveStep] = useState<SimpleStep>("when");
  const [eventSearch, setEventSearch] = useState("");
  const [eventCategory, setEventCategory] = useState("All");
  const [savedSearch, setSavedSearch] = useState("");
  const [showEventPicker, setShowEventPicker] = useState(true);

  const eventEntry = getCatalogEntryForEvent(draft.trigger.event);
  const conditions = draft.trigger.conditions ?? [];
  const activeActions = draft.actions.filter(
    (action) => action.enabled !== false,
  );
  const visibleConditions = conditions.filter(
    (condition) => condition.value !== "" && condition.value !== undefined,
  );
  const primaryPiece = conditions.find(
    (condition) => condition.field === "piece",
  );
  const readableSummary = getReadableTriggerText(draft);

  const catalogResults = useMemo(
    () => searchEventCatalog(eventSearch, eventCategory),
    [eventSearch, eventCategory],
  );
  const duplicateCandidates = useMemo(
    () => findMatchingTriggerGroups(groups, draft),
    [draft, groups],
  );
  const savedGroups = useMemo(() => {
    const term = savedSearch.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter((group) =>
      [
        group.metadata?.name,
        group.metadata?.summary,
        group.metadata?.category,
        group.trigger.event,
        ...(group.metadata?.keywords ?? []),
        ...(group.metadata?.tags ?? []),
        ...group.actions.map(
          (action) => `${action.type} ${action.key} ${action.label ?? ""}`,
        ),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [groups, savedSearch]);

  const selectEvent = (entry: EventCatalogEntry) => {
    setDraft((current) => ({
      ...current,
      trigger: {
        event: entry.event,
        conditionMode: "all",
        conditions: entry.conditions.map(makeCatalogCondition),
      },
      metadata: {
        ...current.metadata,
        name: current.metadata?.name || entry.label,
        category: entry.category,
        icon: entry.icon,
        keywords: entry.keywords,
        source: "user",
      },
    }));
    setShowEventPicker(false);
    setActiveStep("limits");
  };

  const startNew = () => {
    setDraft(makeBlankGroup());
    setShowEventPicker(true);
    setActiveMode("simple");
    setActiveStep("when");
  };

  const selectGroup = (group: TriggerGroup) => {
    setDraft(cloneGroup(group));
    setActiveMode("simple");
    setActiveStep("save");
  };

  const makeSimilar = () =>
    setDraft({
      ...cloneGroup(draft),
      id: makeTriggerId("trigger-group"),
      enabled: false,
      metadata: {
        ...draft.metadata,
        name: `${draft.metadata?.name || "Trigger group"} Copy`,
        source: "user",
      },
      actions: draft.actions.map((action) => ({
        ...action,
        id: makeTriggerId("action"),
      })),
      trigger: {
        ...draft.trigger,
        conditions: conditions.map((condition) => ({
          ...condition,
          id: makeTriggerId("condition"),
        })),
      },
    });

  const saveDraft = () => {
    const next: TriggerGroup = {
      ...draft,
      metadata: {
        ...draft.metadata,
        summary: readableSummary,
        source: "user",
      },
    };
    if (groups.some((group) => group.id === next.id))
      updateTriggerGroup(next.id, next);
    else createTriggerGroup(next);
    setDraft(cloneGroup(next));
  };

  const addActionToExisting = (target: TriggerGroup) => {
    const nextActions = [
      ...target.actions,
      ...draft.actions.map((action) => ({
        ...action,
        id: makeTriggerId("action"),
      })),
    ];
    updateTriggerGroup(target.id, { actions: nextActions, enabled: true });
    setDraft(cloneGroup({ ...target, actions: nextActions, enabled: true }));
  };

  const updateCondition = (id: string, updates: Partial<TriggerCondition>) => {
    setDraft((current) => ({
      ...current,
      trigger: {
        ...current.trigger,
        conditions: (current.trigger.conditions ?? []).map((condition) =>
          condition.id === id ? { ...condition, ...updates } : condition,
        ),
      },
    }));
  };

  const removeCondition = (id: string) =>
    setDraft((current) => ({
      ...current,
      trigger: {
        ...current.trigger,
        conditions: (current.trigger.conditions ?? []).filter(
          (condition) => condition.id !== id,
        ),
      },
    }));

  const addCondition = () =>
    setDraft((current) => ({
      ...current,
      trigger: {
        ...current.trigger,
        conditions: [
          ...(current.trigger.conditions ?? []),
          makeCatalogCondition({
            field: "piece",
            label: "Piece",
            input: "piece",
            defaultValue: "any",
          }),
        ],
      },
    }));

  const updateAction = (id: string, updates: Partial<TriggerAction>) => {
    setDraft((current) => ({
      ...current,
      actions: current.actions.map((action) =>
        action.id === id ? { ...action, ...updates } : action,
      ),
    }));
  };

  const addAction = (type: string) => {
    const template =
      ACTION_TEMPLATES.find((item) => item.type === type) ??
      ACTION_TEMPLATES[0];
    setDraft((current) => ({
      ...current,
      actions: [...current.actions, makeCatalogAction(template)],
    }));
  };

  const previewAction = (action: TriggerAction) => {
    if (action.type === "audio" && action.key) playLibrarySound(action.key);
  };

  const renderActionCard = (action: TriggerAction) => {
    const template = ACTION_TEMPLATES.find((item) => item.type === action.type);
    return (
      <div
        key={action.id}
        style={{
          ...insetPanelStyle,
          borderColor:
            action.enabled === false
              ? "rgba(148, 163, 184, 0.12)"
              : "rgba(168, 85, 247, 0.32)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            alignItems: "center",
            marginBottom: 9,
          }}
        >
          <strong>
            {template?.icon ?? "✨"} {template?.label ?? action.type}
          </strong>
          <label
            style={{
              display: "inline-flex",
              gap: 6,
              alignItems: "center",
              color: "#cbd5e1",
              fontSize: "0.72rem",
              fontWeight: 850,
            }}
          >
            On
            <input
              type="checkbox"
              checked={action.enabled !== false}
              onChange={(event) =>
                updateAction(action.id, { enabled: event.target.checked })
              }
            />
          </label>
        </div>
        {action.type === "audio" ? (
          <select
            value={action.key}
            onChange={(event) =>
              updateAction(action.id, {
                key: event.target.value,
                label:
                  library.find((sound) => sound.id === event.target.value)
                    ?.name || event.target.value,
              })
            }
            style={inputStyle}
          >
            <option value="">Choose sound...</option>
            {library.map((sound) => (
              <option key={sound.id} value={sound.id}>
                🔊 {sound.name}
              </option>
            ))}
          </select>
        ) : action.type === "animation" ? (
          <select
            value={action.key}
            onChange={(event) =>
              updateAction(action.id, {
                key: event.target.value,
                label:
                  settings.animationDefinitions.find(
                    (animation) => animation.id === event.target.value,
                  )?.name || event.target.value,
              })
            }
            style={inputStyle}
          >
            <option value="">Choose animation...</option>
            {settings.animationDefinitions.map((animation) => (
              <option key={animation.id} value={animation.id}>
                ✨ {animation.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={action.label ?? action.key ?? ""}
            onChange={(event) =>
              updateAction(action.id, {
                key: event.target.value,
                label: event.target.value,
              })
            }
            style={inputStyle}
            placeholder="What should it show or do?"
          />
        )}
        <div
          style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 9 }}
        >
          {action.previewable && (
            <button
              type="button"
              onClick={() => previewAction(action)}
              style={buttonStyle}
            >
              ▶ Preview
            </button>
          )}
          {action.type === "audio" && (
            <button type="button" onClick={stopPreview} style={buttonStyle}>
              Stop
            </button>
          )}
          {action.type === "animation" && (
            <span style={{ ...mutedStyle, alignSelf: "center" }}>
              Animation preview hook ready.
            </span>
          )}
          <button
            type="button"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                actions: current.actions.filter(
                  (item) => item.id !== action.id,
                ),
              }))
            }
            style={{ ...buttonStyle, marginLeft: "auto" }}
          >
            Remove
          </button>
        </div>
      </div>
    );
  };

  const renderConditionEditor = (compact = false) => (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {visibleConditions.map((condition) => (
          <button key={condition.id} type="button" style={chipStyle(false)}>
            {describeCondition(condition)}
          </button>
        ))}
        {!visibleConditions.length && (
          <span style={{ ...mutedStyle, padding: "8px 0" }}>
            No special limits yet.
          </span>
        )}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact
            ? "1fr"
            : "repeat(auto-fit, minmax(230px, 1fr))",
          gap: 9,
        }}
      >
        {conditions.map((condition) => (
          <div key={condition.id} style={insetPanelStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <strong>{condition.label}</strong>
              <button
                type="button"
                onClick={() => removeCondition(condition.id)}
                style={{ ...buttonStyle, padding: "4px 8px" }}
              >
                ×
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: compact ? "1fr" : "0.8fr 1fr",
                gap: 8,
              }}
            >
              <select
                value={condition.operator}
                onChange={(event) =>
                  updateCondition(condition.id, {
                    operator: event.target.value as TriggerConditionOperator,
                  })
                }
                style={inputStyle}
              >
                {operatorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {conditionInput(condition, updateCondition)}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addCondition}
        style={{ ...buttonStyle, alignSelf: "flex-start" }}
      >
        + Add another limit
      </button>
    </>
  );

  return (
    <div style={shellStyle}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{ color: "#f8fafc", fontWeight: 950, fontSize: "1.12rem" }}
          >
            Reaction Creator
          </div>
          <div style={mutedStyle}>
            Simple for normal reactions. Advanced for reusable custom events.
            Pro/System for raw details.
          </div>
        </div>
        <button type="button" onClick={startNew} style={primaryButtonStyle}>
          + New Reaction
        </button>
      </header>

      <section
        style={{ ...panelStyle, borderColor: "rgba(56, 189, 248, 0.30)" }}
      >
        <div style={{ ...labelStyle, marginBottom: 9 }}>Sentence preview</div>
        <div style={{ color: "#f8fafc", fontSize: "0.98rem", lineHeight: 1.4 }}>
          {readableSummary}
        </div>
      </section>

      <nav
        aria-label="Editor mode"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        {[
          { id: "simple", label: "Simple", hint: "Pick one thing at a time" },
          {
            id: "advanced",
            label: "Advanced",
            hint: "Reuse, clone, name, group",
          },
          {
            id: "system",
            label: "Pro/System",
            hint: "IDs, payloads, diagnostics",
          },
        ].map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => setActiveMode(mode.id as EditorMode)}
            style={modeButtonStyle(activeMode === mode.id)}
          >
            <div
              style={{
                color: activeMode === mode.id ? "#e0f2fe" : "#cbd5e1",
                fontWeight: 950,
              }}
            >
              {mode.label}
            </div>
            <div
              style={{ color: "#8aa2bd", fontSize: "0.66rem", marginTop: 3 }}
            >
              {mode.hint}
            </div>
          </button>
        ))}
      </nav>

      {activeMode === "simple" && (
        <>
          <nav
            aria-label="Reaction builder steps"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            {[
              {
                id: "when",
                label: "1. When",
                hint: eventEntry?.label || "Choose event",
              },
              {
                id: "limits",
                label: "2. Only if",
                hint: `${visibleConditions.length || 0} limits`,
              },
              {
                id: "do",
                label: "3. Do",
                hint: `${activeActions.length || 0} reactions`,
              },
              {
                id: "save",
                label: "4. Save",
                hint: draft.enabled ? "Active" : "Inactive",
              },
            ].map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id as SimpleStep)}
                style={modeButtonStyle(activeStep === step.id)}
              >
                <div
                  style={{
                    color: activeStep === step.id ? "#e0f2fe" : "#cbd5e1",
                    fontWeight: 950,
                  }}
                >
                  {step.label}
                </div>
                <div
                  style={{
                    color: "#8aa2bd",
                    fontSize: "0.66rem",
                    marginTop: 3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {step.hint}
                </div>
              </button>
            ))}
          </nav>

          {activeStep === "when" && (
            <section
              style={{
                ...panelStyle,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={labelStyle}>WHEN</div>
                  <div style={mutedStyle}>
                    Pick one thing that starts the reaction.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEventPicker((value) => !value)}
                  style={buttonStyle}
                >
                  {showEventPicker ? "Hide picker" : "Change what happens"}
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowEventPicker(true)}
                  style={chipStyle(true)}
                >
                  <span style={{ fontSize: "1.25rem" }}>
                    {eventEntry?.icon ?? "✨"}
                  </span>
                  <span>
                    {primaryPiece
                      ? describeConditionValue(primaryPiece)
                      : "Something"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowEventPicker(true)}
                  style={chipStyle(true)}
                >
                  {eventEntry?.sentence ?? draft.trigger.event}
                </button>
              </div>
              {showEventPicker && (
                <div style={insetPanelStyle}>
                  <input
                    value={eventSearch}
                    onChange={(event) => setEventSearch(event.target.value)}
                    placeholder="Search events: pawn, check, timer, panel..."
                    style={inputStyle}
                  />
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      marginTop: 9,
                    }}
                  >
                    {categories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setEventCategory(category)}
                        style={chipStyle(eventCategory === category)}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 8,
                      maxHeight: 260,
                      overflowY: "auto",
                      marginTop: 10,
                    }}
                  >
                    {catalogResults.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => selectEvent(entry)}
                        style={{
                          ...buttonStyle,
                          textAlign: "left",
                          padding: 10,
                          background:
                            entry.event === draft.trigger.event
                              ? "rgba(14, 116, 144, 0.30)"
                              : "rgba(15, 23, 42, 0.62)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 9,
                            alignItems: "center",
                          }}
                        >
                          <span style={{ fontSize: "1.28rem" }}>
                            {entry.icon}
                          </span>
                          <strong>{entry.label}</strong>
                        </div>
                        <div
                          style={{
                            color: "#8aa2bd",
                            fontSize: "0.68rem",
                            marginTop: 4,
                          }}
                        >
                          {entry.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {activeStep === "limits" && (
            <section
              style={{
                ...panelStyle,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div>
                <div style={labelStyle}>ONLY IF</div>
                <div style={mutedStyle}>
                  Optional filters. Leave broad when this reaction should happen
                  often.
                </div>
              </div>
              {renderConditionEditor(true)}
            </section>
          )}

          {activeStep === "do" && (
            <section
              style={{
                ...panelStyle,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div>
                <div style={labelStyle}>DO</div>
                <div style={mutedStyle}>
                  Add one or more reactions to this same trigger.
                </div>
              </div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {ACTION_TEMPLATES.map((template) => (
                  <button
                    key={template.type}
                    type="button"
                    onClick={() => addAction(template.type)}
                    style={chipStyle(false)}
                  >
                    {template.icon} {template.label}
                  </button>
                ))}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 9,
                }}
              >
                {draft.actions.map(renderActionCard)}
              </div>
            </section>
          )}

          {activeStep === "save" && (
            <section
              style={{
                ...panelStyle,
                display: "grid",
                gridTemplateColumns: "minmax(220px, 1fr) auto auto",
                gap: 10,
                alignItems: "end",
              }}
            >
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                  minWidth: 0,
                }}
              >
                <span style={labelStyle}>Name</span>
                <input
                  value={draft.metadata?.name ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      metadata: {
                        ...current.metadata,
                        name: event.target.value,
                      },
                    }))
                  }
                  style={inputStyle}
                />
              </label>
              <label
                style={{
                  display: "flex",
                  gap: 7,
                  alignItems: "center",
                  color: "#cbd5e1",
                  fontWeight: 850,
                }}
              >
                Active
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      enabled: event.target.checked,
                    }))
                  }
                />
              </label>
              <button
                type="button"
                onClick={saveDraft}
                style={primaryButtonStyle}
              >
                Save Reaction
              </button>
            </section>
          )}
        </>
      )}

      {activeMode === "advanced" && (
        <section
          style={{
            ...panelStyle,
            display: "grid",
            gridTemplateColumns: "minmax(240px, 0.85fr) minmax(300px, 1.15fr)",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              minWidth: 0,
            }}
          >
            <div>
              <div style={labelStyle}>Saved / reusable reactions</div>
              <div style={mutedStyle}>
                Load, clone, or reuse existing trigger groups.
              </div>
            </div>
            <input
              value={savedSearch}
              onChange={(event) => setSavedSearch(event.target.value)}
              placeholder="Search saved reactions..."
              style={inputStyle}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxHeight: 420,
                overflowY: "auto",
              }}
            >
              {savedGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => selectGroup(group)}
                  style={{
                    ...buttonStyle,
                    textAlign: "left",
                    padding: 10,
                    background:
                      group.id === draft.id
                        ? "rgba(14, 116, 144, 0.30)"
                        : "rgba(15, 23, 42, 0.62)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <strong>
                      {group.metadata?.icon ?? "✨"}{" "}
                      {group.metadata?.name || group.trigger.event}
                    </strong>
                    <span
                      style={{
                        color: group.enabled ? "#86efac" : "#fca5a5",
                        fontSize: "0.7rem",
                      }}
                    >
                      {group.enabled ? "On" : "Off"}
                    </span>
                  </div>
                  <div
                    style={{
                      color: "#8aa2bd",
                      fontSize: "0.68rem",
                      marginTop: 5,
                      lineHeight: 1.3,
                    }}
                  >
                    {group.metadata?.summary || getReadableTriggerText(group)}
                  </div>
                </button>
              ))}
              {!savedGroups.length && (
                <div style={mutedStyle}>No saved trigger groups yet.</div>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              minWidth: 0,
            }}
          >
            <div>
              <div style={labelStyle}>Advanced logic</div>
              <div style={mutedStyle}>
                Name the reusable trigger, manage matching, clone, and
                reactivate inactive rules.
              </div>
            </div>
            {duplicateCandidates.length > 0 && (
              <div
                style={{
                  ...insetPanelStyle,
                  borderColor: "rgba(251, 191, 36, 0.34)",
                  background: "rgba(69, 42, 9, 0.24)",
                }}
              >
                <div
                  style={{ color: "#fde68a", fontWeight: 950, marginBottom: 6 }}
                >
                  This trigger already exists.
                </div>
                <div style={mutedStyle}>
                  Add this reaction to the existing trigger instead of making a
                  duplicate.
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginTop: 10,
                  }}
                >
                  {duplicateCandidates.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => addActionToExisting(group)}
                      style={buttonStyle}
                    >
                      Add actions to “
                      {group.metadata?.name || group.trigger.event}”
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 150px",
                gap: 10,
              }}
            >
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                  minWidth: 0,
                }}
              >
                <span style={labelStyle}>Reusable name</span>
                <input
                  value={draft.metadata?.name ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      metadata: {
                        ...current.metadata,
                        name: event.target.value,
                      },
                    }))
                  }
                  style={inputStyle}
                />
              </label>
              <label
                style={{ display: "flex", flexDirection: "column", gap: 5 }}
              >
                <span style={labelStyle}>Match mode</span>
                <select
                  value={draft.trigger.conditionMode ?? "all"}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      trigger: {
                        ...current.trigger,
                        conditionMode: event.target.value as "all" | "any",
                      },
                    }))
                  }
                  style={inputStyle}
                >
                  <option value="all">Match all</option>
                  <option value="any">Match any</option>
                </select>
              </label>
            </div>
            {renderConditionEditor(false)}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={makeSimilar} style={buttonStyle}>
                Make Similar
              </button>
              <label
                style={{
                  display: "inline-flex",
                  gap: 7,
                  alignItems: "center",
                  color: "#cbd5e1",
                  fontWeight: 850,
                }}
              >
                Active
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      enabled: event.target.checked,
                    }))
                  }
                />
              </label>
              <button
                type="button"
                onClick={saveDraft}
                style={primaryButtonStyle}
              >
                Save Advanced Reaction
              </button>
              {groups.some((group) => group.id === draft.id) && (
                <button
                  type="button"
                  onClick={() => {
                    deleteTriggerGroup(draft.id);
                    startNew();
                  }}
                  style={{
                    ...buttonStyle,
                    borderColor: "rgba(248, 113, 113, 0.45)",
                    color: "#fecaca",
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {activeMode === "system" && (
        <section
          style={{
            ...panelStyle,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          <div style={insetPanelStyle}>
            <div style={labelStyle}>Trigger internals</div>
            <pre
              style={{
                ...mutedStyle,
                whiteSpace: "pre-wrap",
                margin: "8px 0 0",
              }}
            >
              {JSON.stringify(
                {
                  id: draft.id,
                  enabled: draft.enabled,
                  trigger: draft.trigger,
                },
                null,
                2,
              )}
            </pre>
          </div>
          <div style={insetPanelStyle}>
            <div style={labelStyle}>Actions</div>
            <pre
              style={{
                ...mutedStyle,
                whiteSpace: "pre-wrap",
                margin: "8px 0 0",
              }}
            >
              {JSON.stringify(draft.actions, null, 2)}
            </pre>
          </div>
          <div style={insetPanelStyle}>
            <div style={labelStyle}>Package metadata</div>
            <pre
              style={{
                ...mutedStyle,
                whiteSpace: "pre-wrap",
                margin: "8px 0 0",
              }}
            >
              {JSON.stringify(draft.metadata ?? {}, null, 2)}
            </pre>
          </div>
        </section>
      )}
    </div>
  );
};

export default TriggerGroupEditorView;

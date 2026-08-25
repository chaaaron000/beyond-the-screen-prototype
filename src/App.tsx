import { useEffect, useReducer, useState } from "react";
import { ReportScreen } from "./components/report/ReportScreen";
import { VNScene } from "./components/vn/VNScene";
import { getFieldRouteContent } from "./content/field-mission/routes";
import { getProposalReaction } from "./content/proposals";
import { gameReducer } from "./game/reducer";
import { createInitialState } from "./game/state";
import type { EvidenceId, ProposalId } from "./types/game";

type PresentationTransition =
  | {
      kind: "report-to-vn";
      phase: "cover" | "field-link" | "reveal";
      proposalId: ProposalId;
      evidenceIds: EvidenceId[];
      accepted: boolean;
      label: string | null;
      location: string | null;
    }
  | {
      kind: "vn-to-report";
      phase: "cover" | "field-log" | "reveal";
      proposalId: ProposalId;
      label: string;
      location: string;
    };

function PresentationTransitionOverlay({ transition }: { transition: PresentationTransition }) {
  const isFieldLink = transition.kind === "report-to-vn" && transition.accepted;
  const label = transition.label;
  const location = transition.location;
  const showTransitionLabel = transition.kind === "report-to-vn"
    ? transition.phase === "field-link"
    : transition.phase === "field-log";

  return (
    <div
      className={`presentation-transition presentation-transition--${transition.kind} presentation-transition--${transition.phase}${isFieldLink ? " presentation-transition--accepted" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={showTransitionLabel ? label ?? undefined : undefined}
    >
      {label && <p className="presentation-transition-label">{label}</p>}
      {location && <p className="presentation-transition-location">{location}</p>}
      <span className="presentation-transition-record" aria-hidden="true" />
    </div>
  );
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, createInitialState());
  const [transition, setTransition] = useState<PresentationTransition | null>(null);
  const [highlightedRoute, setHighlightedRoute] = useState<ProposalId | null>(null);

  useEffect(() => {
    if (!transition) return undefined;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let duration = reducedMotion ? 100 : 280;

    if (transition.kind === "report-to-vn") {
      if (transition.phase === "cover") {
        duration = reducedMotion ? 100 : 300;
      } else if (transition.phase === "field-link") {
        duration = reducedMotion ? 160 : 420;
      } else {
        duration = reducedMotion ? 100 : 280;
      }
    } else if (transition.phase === "cover") {
      duration = reducedMotion ? 100 : 300;
    } else if (transition.phase === "field-log") {
      duration = reducedMotion ? 160 : 420;
    } else {
      duration = reducedMotion ? 100 : 280;
    }

    const timer = window.setTimeout(() => {
      if (transition.kind === "report-to-vn") {
        if (transition.phase === "cover") {
          dispatch({
            type: "PROPOSE_ACTION",
            proposalId: transition.proposalId,
            evidenceIds: transition.evidenceIds,
          });
          setTransition((current) => {
            if (!current || current.kind !== "report-to-vn") return current;
            return {
              ...current,
              phase: "field-link",
            };
          });
        } else if (transition.phase === "field-link") {
          setTransition((current) => {
            if (!current || current.kind !== "report-to-vn") return current;
            return { ...current, phase: "reveal" };
          });
        } else {
          setTransition(null);
        }
      } else if (transition.phase === "cover") {
        dispatch({ type: "ADVANCE_DIALOGUE" });
        setHighlightedRoute(transition.proposalId);
        setTransition({ ...transition, phase: "field-log" });
      } else if (transition.phase === "field-log") {
        setTransition({ ...transition, phase: "reveal" });
      } else {
        setTransition(null);
      }
    }, duration);

    return () => window.clearTimeout(timer);
  }, [dispatch, transition]);

  useEffect(() => {
    if (!highlightedRoute) return undefined;
    const timer = window.setTimeout(() => setHighlightedRoute(null), 1600);
    return () => window.clearTimeout(timer);
  }, [highlightedRoute]);

  const inputLocked = transition !== null;
  const transitionClass = transition
    ? ` presentation-${transition.kind}-${transition.phase}`
    : "";

  const handleProposal = (proposalId: ProposalId, evidenceIds: EvidenceId[]) => {
    if (inputLocked || state.view !== "report" || state.exploredRoutes[proposalId]) return;
    const route = getFieldRouteContent(proposalId);
    const reaction = getProposalReaction(state, proposalId, evidenceIds);
    setTransition({
      kind: "report-to-vn",
      phase: "cover",
      proposalId,
      evidenceIds,
      accepted: reaction.outcome === "accepted",
      label: reaction.outcome === "accepted" ? route.fieldLinkLabel : null,
      location: reaction.outcome === "accepted" ? route.location : null,
    });
  };

  const handleAdvanceDialogue = () => {
    if (inputLocked || state.view !== "vn") return;
    const isLastLine = state.dialogueIndex >= state.dialogue.length - 1;
    if (!isLastLine || !state.pendingFieldVisit) {
      dispatch({ type: "ADVANCE_DIALOGUE" });
      return;
    }

    const route = getFieldRouteContent(state.pendingFieldVisit);
    setTransition({
      kind: "vn-to-report",
      phase: "cover",
      proposalId: state.pendingFieldVisit,
      label: route.fieldLogUpdatedLabel,
      location: route.location,
    });
  };

  return (
    <div className="game-viewport">
      <div className={`game-screen${inputLocked ? " is-presentation-locked" : ""}${transitionClass}`}>
        {state.view === "vn" ? (
          <VNScene state={state} dispatch={dispatch} onAdvanceDialogue={handleAdvanceDialogue} disabled={inputLocked} />
        ) : (
          <ReportScreen
            state={state}
            dispatch={dispatch}
            onProposeAction={handleProposal}
            inputLocked={inputLocked}
            highlightedRoute={highlightedRoute}
            activeProposal={transition?.kind === "report-to-vn" ? transition.proposalId : null}
          />
        )}
        {transition && <PresentationTransitionOverlay transition={transition} />}
      </div>
    </div>
  );
}

import { useReducer } from "react";
import { ReportScreen } from "./components/report/ReportScreen";
import { VNScene } from "./components/vn/VNScene";
import { gameReducer } from "./game/reducer";
import { createInitialState } from "./game/state";

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, createInitialState());

  return state.view === "vn" ? (
    <VNScene state={state} dispatch={dispatch} />
  ) : (
    <ReportScreen state={state} dispatch={dispatch} />
  );
}

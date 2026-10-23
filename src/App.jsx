import { useEffect } from "react";
import FluffyTypeBattle from "./components/FluffyTypeBattle/FluffyTypeBattle.jsx";

// body[data-task] is used by styles/base.css for this task's page background.
const TASK_ID = "13";

export default function App() {
  useEffect(() => {
    document.body.dataset.task = TASK_ID;
    return () => { delete document.body.dataset.task; };
  }, []);

  return (
    <main className="page">
      <div className="page-head">
        <span className="task-chip">Task 13</span>
        <h1 className="page-title">Fluffy Type Battle</h1>
        <p className="page-sub">Compete in a typing battle against other players and improve your speed and accuracy.</p>
      </div>
      <FluffyTypeBattle />
    </main>
  );
}

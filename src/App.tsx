import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { LandingPage } from "./pages/LandingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { QueuePage } from "./pages/QueuePage";
import { AlgorithmLabPage } from "./pages/AlgorithmLabPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { AboutAlgorithmPage } from "./pages/AboutAlgorithmPage";
import { SettingsPage } from "./pages/SettingsPage";
import { PresentationPage } from "./pages/PresentationPage";
import { BenchmarkLabPage } from "./pages/BenchmarkLabPage";
import { HeapStepperPage } from "./pages/HeapStepperPage";
import { FairnessChallengePage } from "./pages/FairnessChallengePage";
import { QueueReplayPage } from "./pages/QueueReplayPage";
import { AlgorithmDuelPage } from "./pages/AlgorithmDuelPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="queue" element={<QueuePage />} />
          <Route path="lab" element={<AlgorithmLabPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="benchmark" element={<BenchmarkLabPage />} />
          <Route path="dsa/stepper" element={<HeapStepperPage />} />
          <Route path="dsa/fairness" element={<FairnessChallengePage />} />
          <Route path="dsa/replay" element={<QueueReplayPage />} />
          <Route path="dsa/duel" element={<AlgorithmDuelPage />} />
          <Route path="about" element={<AboutAlgorithmPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="/app/presentation" element={<PresentationPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

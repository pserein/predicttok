import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Predict from "./pages/Predict.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import HashtagAnalyzer from "./pages/HashtagAnalyzer.jsx";
import Metrics from "./pages/Metrics.jsx";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"          element={<Home />} />
        <Route path="/predict"   element={<Predict />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/hashtags"  element={<HashtagAnalyzer />} />
        <Route path="/metrics"   element={<Metrics />} />
      </Routes>
    </Layout>
  );
}

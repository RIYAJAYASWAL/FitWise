import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { Layout } from "./components/Layout.jsx";
import { Landing } from "./pages/Landing.jsx";
import { Connect } from "./pages/Connect.jsx";
import { Dashboard } from "./pages/Dashboard.jsx";
import { Recommendations } from "./pages/Recommendations.jsx";
import { Analytics } from "./pages/Analytics.jsx";
import { Suggestions } from "./pages/Suggestions.jsx";
import { Communities } from "./pages/Communities.jsx";
import { Journals } from "./pages/Journals.jsx";
import { ChartDoctor } from "./pages/ChartDoctor.jsx";
import { Products } from "./pages/Products.jsx";
import { Experiments } from "./pages/Experiments.jsx";
import { WidgetPreview } from "./pages/WidgetPreview.jsx";
import { Settings } from "./pages/Settings.jsx";

function ExperimentIdRedirect() {
  const { id } = useParams();
  return <Navigate to={`/experiments?experiment=${encodeURIComponent(id || "")}`} replace />;
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Landing & Marketing Pages */}
            <Route path="/" element={<Landing />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/home" element={<Landing />} />

            {/* Public Auth Screen */}
            <Route path="/connect" element={<Connect />} />
            <Route path="/login" element={<Connect />} />

            {/* Authenticated Dashboard Shell */}
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/recommendations" element={<Recommendations />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/suggestions" element={<Suggestions />} />
              <Route path="/communities" element={<Communities />} />
              <Route path="/journals" element={<Journals />} />
              <Route path="/chart-doctor" element={<ChartDoctor />} />
              <Route path="/products" element={<Products />} />
              <Route path="/experiments" element={<Experiments />} />
              <Route path="/experiments/:id" element={<ExperimentIdRedirect />} />
              <Route path="/ab-testing" element={<Navigate to="/experiments" replace />} />
              <Route path="/ab-testing/:id" element={<ExperimentIdRedirect />} />
              <Route path="/widget-preview" element={<WidgetPreview />} />
              <Route path="/settings" element={<Settings />} />
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

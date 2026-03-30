import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import MainLayout from "./components/layout/MainLayout";
import Login from "./pages/Login";
import { hasSession } from "./lib/session";

function ProtectedLayout() {
    return hasSession() ? <MainLayout /> : <Navigate to="/login" replace />;
}

function App() {
    return (
        <Routes>
            <Route
                path="/login"
                element={hasSession() ? <Navigate to="/dashboard" replace /> : <Login />}
            />
            <Route path="/" element={<ProtectedLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="projects" element={<Projects />} />
                <Route path="tasks" element={<Tasks />} />
            </Route>
            <Route path="*" element={<Navigate to={hasSession() ? "/dashboard" : "/login"} replace />} />
        </Routes>
    );
}

export default App;

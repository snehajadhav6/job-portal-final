import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../../services/api";

const PROCTORING_SERVER_URL = "http://localhost:5001/admin";

export default function LiveProctoring() {
  const [candidates, setCandidates] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  const fetchLiveCandidates = async () => {
    try {
      const { data } = await api.get("/api/proctoring/live-candidates");
      setCandidates(data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load candidates:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveCandidates();

    // Setup Socket
    const socket = io(PROCTORING_SERVER_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Admin connected to proctoring hub");
    });

    socket.on("violation-detected", ({ sessionId, newIntegrity }) => {
      setCandidates((prev) => 
        prev.map(c => c.session_id === sessionId ? { ...c, integrity_score: newIntegrity, violation_count: parseInt(c.violation_count) + 1 } : c)
      );
    });

    socket.on("warning-sent", ({ sessionId, warningNumber }) => {
      setCandidates((prev) => 
        prev.map(c => c.session_id === sessionId ? { ...c, warnings_count: warningNumber } : c)
      );
    });

    socket.on("interview-terminated", ({ sessionId, reason }) => {
      setCandidates((prev) => 
        prev.map(c => c.session_id === sessionId ? { ...c, status: "TERMINATED", termination_reason: reason } : c)
      );
    });

    return () => socket.disconnect();
  }, []);

  const sendWarning = async (candidateId, sessionId) => {
    try {
      await api.post("/api/proctoring/send-warning", { candidateId, sessionId });
      alert("Warning sent to candidate");
    } catch (error) {
      alert(error.response?.data?.message || "Error sending warning");
    }
  };

  const terminateInterview = async (candidateId, sessionId) => {
    if (!window.confirm("Are you sure you want to terminate this interview?")) return;
    try {
      await api.post("/api/proctoring/terminate-interview", { candidateId, sessionId });
      alert("Interview successfully terminated.");
    } catch (error) {
      alert("Failed to terminate interview");
    }
  };

  // Filter Logic
  const filteredCandidates = candidates.filter((c) => {
    if (filter === "ALL") return true;
    if (filter === "ACTIVE") return c.status === "ACTIVE";
    if (filter === "TERMINATED") return c.status === "TERMINATED";
    if (filter === "COMPLETED") return c.status === "COMPLETED";
    if (filter === "BELOW_70") return c.integrity_score < 70;
    if (filter === "VIOLATIONS") return parseInt(c.violation_count) > 0;
    return true;
  });

  return (
    <div className="admin-page">
      <div className="header-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 className="text-2xl font-bold">Live Proctoring Dashboard</h1>
        <div className="filters">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
            <option value="ALL">All Sessions</option>
            <option value="ACTIVE">Active Sessions</option>
            <option value="BELOW_70">Integrity &lt; 70%</option>
            <option value="VIOLATIONS">With Violations</option>
            <option value="TERMINATED">Terminated</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <button onClick={fetchLiveCandidates} style={{ marginLeft: "10px", padding: '8px 12px', background: "#1976d2", color: "white", borderRadius: "4px" }}>
            Refresh Data
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading sessions...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
          {filteredCandidates.length === 0 ? (
            <p>No candidates match your current filter.</p>
          ) : (
            filteredCandidates.map((c) => (
              <div 
                key={c.session_id} 
                style={{ 
                  border: c.integrity_score < 70 ? "2px solid #ef5350" : "1px solid #ddd", 
                  borderRadius: "8px", 
                  padding: "16px",
                  background: "white",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "600" }}>{c.candidate_name}</h3>
                  <span style={{ 
                    padding: "4px 8px", 
                    borderRadius: "12px", 
                    fontSize: "0.8rem", 
                    color: "white",
                    background: c.status === 'ACTIVE' ? '#4caf50' : c.status === 'TERMINATED' ? '#f44336' : '#2196f3' 
                  }}>
                    {c.status}
                  </span>
                </div>
                
                {/* Mock Video Stream Area */}
                <div style={{ background: "#222", height: "180px", borderRadius: "8px", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
                  {c.status === "ACTIVE" ? <span style={{color: '#4caf50', display: 'flex', alignItems: 'center', gap: '6px'}}><span style={{display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#4caf50', animation: 'pulse 2s infinite'}}></span> Live Webcam Stream</span> : "Stream Closed"}
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px", fontSize: "0.9rem" }}>
                  <div style={{ background: "#f5f5f5", padding: "8px", borderRadius: "4px" }}>
                    <strong>Integrity:</strong> 
                    <span style={{ color: c.integrity_score < 70 ? "#d32f2f" : "#2e7d32", marginLeft: "4px" }}>
                      {c.integrity_score}%
                    </span>
                  </div>
                  <div style={{ background: "#f5f5f5", padding: "8px", borderRadius: "4px" }}>
                    <strong>Violations:</strong> {c.violation_count}
                  </div>
                  <div style={{ background: "#f5f5f5", padding: "8px", borderRadius: "4px" }}>
                    <strong>Warnings:</strong> {c.warnings_count}/3
                  </div>
                  <div style={{ background: "#f5f5f5", padding: "8px", borderRadius: "4px" }}>
                    <strong>Started:</strong> {new Date(c.start_time).toLocaleTimeString()}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  {c.status === "ACTIVE" && (
                    <>
                      <button 
                        onClick={() => sendWarning(c.candidate_id, c.session_id)}
                        style={{ flex: 1, padding: "8px", background: "#ff9800", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                      >
                        Warn
                      </button>
                      <button 
                        onClick={() => terminateInterview(c.candidate_id, c.session_id)}
                        style={{ flex: 1, padding: "8px", background: "#d32f2f", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                      >
                        Stop
                      </button>
                    </>
                  )}
                  <Link 
                    to={`/admin/proctoring/summary/${c.candidate_id}`}
                    style={{ flex: c.status === "ACTIVE" ? 1 : '100%', textAlign: "center", padding: "8px", background: "#f5f5f5", color: "#333", border: "1px solid #ccc", borderRadius: "4px", textDecoration: "none" }}
                  >
                    View Report
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

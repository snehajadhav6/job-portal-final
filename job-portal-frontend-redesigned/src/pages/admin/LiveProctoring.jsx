import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../../services/api";

const PROCTORING_SERVER_URL = import.meta.env.VITE_PROCTORING_SERVER_URL || "http://localhost:5001/admin";

export default function LiveProctoring() {
  const [candidates, setCandidates] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [watchingId, setWatchingId] = useState(null); // which candidate is being watched

  const socketRef = useRef(null);
  const peerConnections = useRef({});       // candidateId → RTCPeerConnection

  const fetchLiveCandidates = useCallback(async (targetPage = page) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/api/proctoring/live-candidates?page=${targetPage}&limit=20`);
      setCandidates(data.data ?? data);
      if (data.pagination) setPagination(data.pagination);
    } catch (error) {
      console.error("Failed to load candidates:", error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  const closePeerConnection = useCallback((candidateId) => {
    const pc = peerConnections.current[candidateId];
    if (pc) {
      pc.close();
      delete peerConnections.current[candidateId];
    }
    const videoEl = document.getElementById(`video-${candidateId}`);
    if (videoEl) videoEl.srcObject = null;
  }, []);

  const initiateWebRTC = useCallback(async (candidateId) => {
    if (!socketRef.current) return;

    if (watchingId && watchingId !== candidateId) {
      closePeerConnection(watchingId);
    }

    if (peerConnections.current[candidateId]) return;

    setWatchingId(candidateId);

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
    peerConnections.current[candidateId] = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("webrtc-ice-candidate", { candidateId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      const videoEl = document.getElementById(`video-${candidateId}`);
      if (videoEl) {
        if (event.streams && event.streams[0]) {
          videoEl.srcObject = event.streams[0];
        } else {
          let stream = videoEl.srcObject;
          if (!stream) { stream = new MediaStream(); videoEl.srcObject = stream; }
          stream.addTrack(event.track);
        }
      }
    };

    pc.addTransceiver("video", { direction: "recvonly" });
    pc.addTransceiver("audio", { direction: "recvonly" });

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit("webrtc-offer", { candidateId, offer });
    } catch (e) {
      console.error("WebRTC Error initiating:", e);
    }
  }, [watchingId, closePeerConnection]);

  useEffect(() => {
    fetchLiveCandidates(1);

    const socket = io(PROCTORING_SERVER_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => console.log("Admin connected to proctoring hub"));

    socket.on("violation-detected", ({ sessionId, newIntegrity }) => {
      setCandidates((prev) =>
        prev.map(c => c.session_id === sessionId
          ? { ...c, integrity_score: newIntegrity, violation_count: parseInt(c.violation_count) + 1 }
          : c)
      );
    });

    socket.on("warning-sent", ({ sessionId, warningNumber }) => {
      setCandidates((prev) =>
        prev.map(c => c.session_id === sessionId ? { ...c, warnings_count: warningNumber } : c)
      );
    });

    socket.on("interview-terminated", ({ sessionId, reason }) => {
      setCandidates((prev) =>
        prev.map(c => c.session_id === sessionId
          ? { ...c, status: "TERMINATED", termination_reason: reason }
          : c)
      );
    });

    socket.on("webrtc-answer", async ({ candidateId, answer }) => {
      const pc = peerConnections.current[candidateId];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          if (pc.iceQueue) {
            pc.iceQueue.forEach(cand =>
              pc.addIceCandidate(new RTCIceCandidate(cand)).catch(e => console.error(e))
            );
            pc.iceQueue = [];
          }
        } catch (e) {
          console.error("Error setting remote answer", e);
        }
      }
    });

    socket.on("webrtc-ice-candidate", async ({ candidateId, candidate }) => {
      const pc = peerConnections.current[candidateId];
      if (pc && candidate) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
          catch (e) { console.error("ICE Admin Error", e); }
        } else {
          pc.iceQueue = pc.iceQueue || [];
          pc.iceQueue.push(candidate);
        }
      }
    });

    return () => {
      Object.keys(peerConnections.current).forEach(id => closePeerConnection(id));
      socket.disconnect();
    };
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

  const filteredCandidates = candidates.filter((c) => {
    if (filter === "ALL")       return true;
    if (filter === "BELOW_70")  return c.integrity_score < 70;
    if (filter === "VIOLATIONS") return parseInt(c.violation_count) > 0;
    return true;
  });

  return (
    <div className="admin-page">
      <div className="header-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 className="text-2xl font-bold">Live Proctoring Dashboard</h1>
        <div className="filters" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
            <option value="ALL">All Active</option>
            <option value="BELOW_70">Integrity &lt; 70%</option>
            <option value="VIOLATIONS">With Violations</option>
          </select>
          <button
            onClick={() => fetchLiveCandidates(page)}
            style={{ padding: '8px 12px', background: "#1976d2", color: "white", borderRadius: "4px", border: "none", cursor: "pointer" }}
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading sessions...</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
            {filteredCandidates.length === 0 ? (
              <p>No active candidates match your filter.</p>
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
                    <span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "0.8rem", color: "white", background: '#4caf50' }}>
                      ACTIVE
                    </span>
                  </div>

                  <div style={{ background: "#000", height: "180px", borderRadius: "8px", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                    {watchingId === c.candidate_id ? (
                      <>
                        <video
                          id={`video-${c.candidate_id}`}
                          autoPlay
                          playsInline
                          muted
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        <span style={{ position: "absolute", top: "8px", left: "8px", background: "rgba(0,0,0,0.6)", padding: "2px 6px", borderRadius: "4px", color: '#4caf50', display: 'flex', alignItems: 'center', gap: '6px', fontSize: "0.8rem" }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#4caf50', animation: 'pulse 2s infinite' }}></span> Live
                        </span>
                        <button
                          onClick={() => { closePeerConnection(c.candidate_id); setWatchingId(null); }}
                          style={{ position: "absolute", top: "8px", right: "8px", padding: "2px 8px", background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem" }}
                        >
                          ✕ Stop
                        </button>
                      </>
                    ) : (
                      /* Fix: removed auto-connect. Admin must click "Watch Live" */
                      <button
                        onClick={() => initiateWebRTC(c.candidate_id)}
                        style={{ padding: "10px 20px", background: "#1976d2", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                      >
                        Watch Live
                      </button>
                    )}
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
                    <Link
                      to={`/admin/proctoring/summary/${c.candidate_id}`}
                      style={{ flex: 1, textAlign: "center", padding: "8px", background: "#f5f5f5", color: "#333", border: "1px solid #ccc", borderRadius: "4px", textDecoration: "none" }}
                    >
                      Report
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "24px" }}>
              <button
                disabled={page <= 1}
                onClick={() => { const p = page - 1; setPage(p); fetchLiveCandidates(p); }}
                style={{ padding: "8px 16px", borderRadius: "4px", cursor: page <= 1 ? "not-allowed" : "pointer" }}
              >
                ← Prev
              </button>
              <span style={{ padding: "8px 12px" }}>Page {page} of {pagination.totalPages}</span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => { const p = page + 1; setPage(p); fetchLiveCandidates(p); }}
                style={{ padding: "8px 16px", borderRadius: "4px", cursor: page >= pagination.totalPages ? "not-allowed" : "pointer" }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

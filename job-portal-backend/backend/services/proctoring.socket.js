const candidateSocketMap = new Map();

module.exports = function (io) {
  const adminNs     = io.of('/admin');
  const candidateNs = io.of('/candidate');

  adminNs.on('connection', (socket) => {
    console.log('Admin connected to proctoring namespace:', socket.id);

    socket.on('monitor-candidate', (candidateId) => {
      socket.join(`monitor-${candidateId}`);
      console.log(`Admin ${socket.id} monitoring candidate ${candidateId}`);
    });

    socket.on('webrtc-offer', ({ candidateId, offer }) => {
      candidateNs.to(`candidate-${candidateId}`).emit('webrtc-offer', { offer, adminId: socket.id });
    });

    socket.on('webrtc-ice-candidate', ({ candidateId, candidate }) => {
      candidateNs.to(`candidate-${candidateId}`).emit('webrtc-ice-candidate', { candidate, adminId: socket.id });
    });

    socket.on('disconnect', () => {
      console.log('Admin disconnected:', socket.id);
    });
  });

  candidateNs.on('connection', (socket) => {
    console.log('Candidate connected to proctoring namespace:', socket.id);

    socket.on('join-session', ({ candidateId }) => {
      const candidateRoom = `candidate-${candidateId}`;
      const existingSocketId = candidateSocketMap.get(String(candidateId));

      if (existingSocketId && existingSocketId !== socket.id) {
        const oldSocket = candidateNs.sockets.get(existingSocketId);
        if (oldSocket) {
          oldSocket.emit('duplicate-session', {
            message: 'You joined the interview in another tab. This tab has been disconnected.'
          });
          oldSocket.leave(candidateRoom);
          oldSocket.disconnect(true);
          console.log(`[DuplicateSession] Disconnected old socket ${existingSocketId} for candidate ${candidateId}`);
        }
      }

      candidateSocketMap.set(String(candidateId), socket.id);
      socket.join(candidateRoom);
      console.log(`Candidate ${candidateId} joined room (socket: ${socket.id})`);
    });

    socket.on('webrtc-answer', ({ adminId, answer, candidateId }) => {
      adminNs.to(adminId).emit('webrtc-answer', { answer, candidateId });
    });

    socket.on('webrtc-ice-candidate', ({ adminId, candidate, candidateId }) => {
      adminNs.to(adminId).emit('webrtc-ice-candidate', { candidate, candidateId });
    });

    socket.on('disconnect', () => {
      for (const [candId, sockId] of candidateSocketMap.entries()) {
        if (sockId === socket.id) {
          candidateSocketMap.delete(candId);
          console.log(`Candidate ${candId} disconnected (socket: ${socket.id})`);
          break;
        }
      }
    });
  });
};

/* c8 ignore start */
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
// @ts-expect-error Missing type definitions
import { WebSocket } from 'ws';

const socket = new WebSocket("ws://localhost:54430");
// const socket = new WebSocket("ws://192.168.1.188:54430");

// Connection opened
socket.addEventListener("open", () => {
  console.log("Connected to server");
  socket.send("set-progress 25");
});

// Listen for messages
// @ts-expect-error Missing type definitions
socket.addEventListener("message", (event) => {
  console.log("Message from server:", event.data);
});

// Handle errors
// @ts-expect-error Missing type definitions
socket.addEventListener("error", (error) => {
  console.error("WebSocket error:", error);
});

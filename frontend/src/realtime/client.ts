import { io, type Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const SOCKET_URL = API_URL.replace(/\/api$/, "");

let socket: Socket | undefined;

export function connectRealtime(token: string) {
  disconnectRealtime();

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket"]
  });

  return socket;
}

export function disconnectRealtime() {
  socket?.disconnect();
  socket = undefined;
}

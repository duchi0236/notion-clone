export const COLLAB_WS_URL = process.env.NEXT_PUBLIC_COLLAB_WS_URL ?? "ws://localhost:1234";

export function getCollabRoomName(documentId: string) {
  return `clawnote-document-${documentId}`;
}

export function randomUserColor() {
  const colors = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2"];
  return colors[Math.floor(Math.random() * colors.length)];
}

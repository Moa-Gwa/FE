/** SSE 본문 조각을 이벤트로 나눔. 아직 끝나지 않은 마지막 조각은 rest로 돌려줌 */
export function parseSse<E = { event: string; data: unknown }>(buffer: string): { events: E[]; rest: string } {
  const blocks = buffer.replace(/\r\n/g, "\n").split("\n\n");
  const rest = blocks.pop() ?? "";
  const events: E[] = [];
  for (const block of blocks) {
    let name = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) name = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
    }
    if (!data.length) continue;
    try {
      events.push({ event: name, data: JSON.parse(data.join("\n")) } as E);
    } catch {
      // 깨진 이벤트 하나 때문에 답변 전체를 버리지 않음
    }
  }
  return { events, rest };
}

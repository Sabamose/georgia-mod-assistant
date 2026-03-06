const encoder = new TextEncoder();

export type SseEvent = {
  event: string | null;
  data: string;
};

export async function* iterateSseEvents(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<SseEvent> {
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() || "";

    for (const frame of frames) {
      const lines = frame.split("\n");
      let event: string | null = null;
      const dataLines: string[] = [];

      for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        if (!line || line.startsWith(":")) continue;
        if (line.startsWith("event:")) {
          event = line.slice(6).trim();
          continue;
        }
        if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trimStart());
        }
      }

      if (dataLines.length > 0) {
        yield {
          event,
          data: dataLines.join("\n"),
        };
      }
    }
  }

  const finalChunk = buffer.trim();
  if (finalChunk) {
    const lines = finalChunk.split("\n");
    let event: string | null = null;
    const dataLines: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      if (!line || line.startsWith(":")) continue;
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
        continue;
      }
      if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    if (dataLines.length > 0) {
      yield { event, data: dataLines.join("\n") };
    }
  }
}

function encodeEvent(event: string | null, payload: unknown): Uint8Array {
  const prefix = event ? `event: ${event}\n` : "";
  return encoder.encode(`${prefix}data: ${JSON.stringify(payload)}\n\n`);
}

export function createAnthropicCompatibleStream(options: {
  requestId: string;
  model: string;
  textStream: AsyncIterable<string>;
  onComplete?: () => void;
  onError?: (error: unknown) => void;
}): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encodeEvent("message_start", {
          type: "message_start",
          message: {
            id: `msg_${options.requestId}`,
            type: "message",
            role: "assistant",
            model: options.model,
            content: [],
            stop_reason: null,
            stop_sequence: null,
            usage: {
              input_tokens: 0,
              output_tokens: 0,
            },
          },
        }));

        controller.enqueue(encodeEvent("content_block_start", {
          type: "content_block_start",
          index: 0,
          content_block: {
            type: "text",
            text: "",
          },
        }));

        for await (const chunk of options.textStream) {
          if (!chunk) continue;
          controller.enqueue(encodeEvent("content_block_delta", {
            type: "content_block_delta",
            index: 0,
            delta: {
              type: "text_delta",
              text: chunk,
            },
          }));
        }

        controller.enqueue(encodeEvent("content_block_stop", {
          type: "content_block_stop",
          index: 0,
        }));
        controller.enqueue(encodeEvent("message_stop", { type: "message_stop" }));
        controller.close();
        options.onComplete?.();
      } catch (error) {
        options.onError?.(error);
        controller.error(error);
      }
    },
  });
}

import React, { useState, useRef, type ReactNode } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import TextInput from "ink-text-input";

interface Props {
  lines: string[];
  onSubmit: (input: string) => void;
  promptQuestion: string | null;
  statusBar: ReactNode;
}

export function Terminal({
  lines,
  onSubmit,
  promptQuestion,
  statusBar,
}: Props) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const savedInput = useRef("");
  const { stdout } = useStdout();

  // Reserve rows: 2 separator lines + 1 status row + 1 input row
  const visibleLines = Math.max(1, (stdout?.rows ?? 24) - 4);

  useInput((_char, key) => {
    if (promptQuestion !== null) return;

    if (key.upArrow) {
      if (history.length === 0) return;
      if (historyIndex === -1) savedInput.current = input;
      const next =
        historyIndex === -1
          ? history.length - 1
          : Math.max(0, historyIndex - 1);
      setHistoryIndex(next);
      setInput(history[next]);
    }

    if (key.downArrow) {
      if (historyIndex === -1) return;
      const next = historyIndex + 1;
      if (next >= history.length) {
        setHistoryIndex(-1);
        setInput(savedInput.current);
      } else {
        setHistoryIndex(next);
        setInput(history[next]);
      }
    }
  });

  const handleSubmit = (value: string) => {
    if (!promptQuestion && value.trim()) {
      setHistory((prev) => [...prev, value]);
    }
    setHistoryIndex(-1);
    savedInput.current = "";
    setInput("");
    onSubmit(value);
  };

  // Pad with empty rows at the top so every row is always rendered,
  // which forces ink to overwrite (clear) old terminal content.
  const tail = lines.slice(-visibleLines);
  const padded = [...new Array(Math.max(0, visibleLines - tail.length)).fill(""), ...tail];

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Output — fixed row count so the full area is always cleared */}
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {padded.map((line, i) => (
          <Box key={i}>
            <Text wrap="truncate">{line}</Text>
          </Box>
        ))}
      </Box>

      {/* Input */}
      <Box
        paddingX={1}
        borderStyle="single"
        borderLeft={false}
        borderRight={false}>
        <Text color="cyan">{promptQuestion ?? "❯ "}</Text>
        <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
      </Box>

      {/* Status bar — sticky under input */}
      {statusBar}
    </Box>
  );
}

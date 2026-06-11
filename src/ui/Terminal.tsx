import React, { useState, useRef, type ReactNode } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import TextInput from "ink-text-input";

interface Props {
  lines: string[];
  onSubmit: (input: string) => void;
  promptQuestion: string | null;
  statusBar: ReactNode;
}

export function Terminal({ lines, onSubmit, promptQuestion, statusBar }: Props) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const savedInput = useRef("");
  const { stdout } = useStdout();

  // Reserve rows: status bar (3) + input (1) + padding (1)
  const visibleLines = Math.max(1, (stdout?.rows ?? 24) - 5);

  useInput((_char, key) => {
    if (promptQuestion !== null) return;

    if (key.upArrow) {
      if (history.length === 0) return;
      if (historyIndex === -1) savedInput.current = input;
      const next = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
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
      setHistory(prev => [...prev, value]);
    }
    setHistoryIndex(-1);
    savedInput.current = "";
    setInput("");
    onSubmit(value);
  };

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Output — clipped to available height, always shows tail */}
      <Box flexDirection="column" flexGrow={1} overflow="hidden" paddingX={1}>
        {lines.slice(-visibleLines).map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>

      {/* Status bar sticky above input */}
      {statusBar}

      {/* Input */}
      <Box paddingX={1}>
        <Text color="cyan">{promptQuestion ?? "> "}</Text>
        <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
      </Box>
    </Box>
  );
}

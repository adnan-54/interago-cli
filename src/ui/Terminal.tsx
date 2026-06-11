import React, { useState, useRef } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";

interface Props {
  lines: string[];
  onSubmit: (input: string) => void;
  promptQuestion: string | null;
}

export function Terminal({ lines, onSubmit, promptQuestion }: Props) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const savedInput = useRef(""); // preserves current input when navigating up

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
    <Box flexDirection="column" flexGrow={1} paddingX={1}>
      <Box flexDirection="column" flexGrow={1}>
        {lines.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color="cyan">{promptQuestion ?? "> "}</Text>
        <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
      </Box>
    </Box>
  );
}

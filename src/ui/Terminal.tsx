import React, { useState } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";

interface Props {
  lines: string[];
  onSubmit: (input: string) => void;
  promptQuestion: string | null;
}

export function Terminal({ lines, onSubmit, promptQuestion }: Props) {
  const [input, setInput] = useState("");

  const handleSubmit = (value: string) => {
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
        <Text color="cyan">
          {promptQuestion ? promptQuestion : "> "}
        </Text>
        <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
      </Box>
    </Box>
  );
}

import React from "react";
import { Box, Text } from "ink";

interface Props {
  projectId: string | null;
  serverPort: number | null;
}

export function StatusBar({ projectId, serverPort }: Props) {
  return (
    <Box borderStyle="single" paddingX={1} marginBottom={0}>
      <Text>
        <Text dimColor>Project: </Text>
        <Text color={projectId ? "green" : "yellow"}>
          {projectId ?? "(none)"}
        </Text>
        <Text>{"   "}</Text>
        <Text dimColor>Server: </Text>
        {serverPort ? (
          <Text color="green">● :{serverPort}</Text>
        ) : (
          <Text dimColor>○ stopped</Text>
        )}
      </Text>
    </Box>
  );
}

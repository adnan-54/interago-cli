import React from "react";
import { Box, Text, useStdout } from "ink";
import { getRequestCount } from "../core/rateLimiter.js";

interface Props {
  projectId: string | null;
  serverPort: number | null;
}

export function StatusBar({ projectId, serverPort }: Props) {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const line = "─".repeat(width);

  const reqCount = getRequestCount();
  const reqColor = reqCount > 55 ? "red" : reqCount > 40 ? "yellow" : "green";

  return (
    <Box flexDirection="column">
      <Text dimColor>{line}</Text>
      <Box justifyContent="space-between" paddingX={1}>
        <Text>
          <Text dimColor>Project: </Text>
          <Text color={projectId ? "green" : "yellow"}>{projectId ?? "(none)"}</Text>
        </Text>
        <Text>
          <Text dimColor>Server: </Text>
          {serverPort !== null ? (
            <Text color="green">● :{serverPort}</Text>
          ) : (
            <Text dimColor>○ stopped</Text>
          )}
        </Text>
        <Text>
          <Text dimColor>Req: </Text>
          <Text color={reqColor}>{reqCount}/59</Text>
        </Text>
      </Box>
      <Text dimColor>{line}</Text>
    </Box>
  );
}

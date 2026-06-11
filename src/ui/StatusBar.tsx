import React, { useEffect, useState } from "react";
import { Box, Text, useStdout } from "ink";
import { getRequestCount } from "../core/rateLimiter.js";

interface Props {
  projectId: string | null;
  serverPort: number | null;
}

export function StatusBar({ projectId, serverPort }: Props) {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const title = projectId ? `Interago - Project ${projectId}` : "Interago";
    stdout?.write(`\x1b]0;${title}\x07`);
  }, [projectId, stdout]);

  const reqCount = getRequestCount();
  const reqColor = reqCount > 55 ? "red" : reqCount > 40 ? "yellow" : "green";

  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Text>
        <Text dimColor>Project: </Text>
        <Text color={projectId ? "green" : "yellow"}>
          {projectId ?? "(none)"}
        </Text>
      </Text>
      <Text>
        <Text dimColor>Server: </Text>
        {serverPort !== null ? (
          <>
            <Text color="green">● </Text>
            <Text color="cyan">http://localhost:{serverPort}/</Text>
          </>
        ) : (
          <Text dimColor>○ stopped</Text>
        )}
      </Text>
      <Text>
        <Text dimColor>Req: </Text>
        <Text color={reqColor}>{reqCount}/60</Text>
      </Text>
    </Box>
  );
}

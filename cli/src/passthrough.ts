import { spawn } from 'bun'

/**
 * Passthrough unknown CLI commands to MCP tools via mcp2cli.
 *
 * Allows `fulcrum list-tasks --search bug` instead of
 * `uvx mcp2cli --mcp-stdio "fulcrum mcp" list-tasks --search bug`
 */
export async function mcpPassthrough(argv: string[]): Promise<number> {
  // Check uvx availability
  const uvxCheck = spawn(['which', 'uvx'], { stdout: 'pipe', stderr: 'pipe' })
  if ((await uvxCheck.exited) !== 0) {
    console.error(
      'Error: uvx is required for MCP tool passthrough but was not found.\n' +
        'Install uv: https://docs.astral.sh/uv/getting-started/installation/'
    )
    return 1
  }

  // Extract --port and --url flags (these go to `fulcrum mcp`, not mcp2cli)
  const mcpFlags: string[] = []
  const passthroughArgs: string[] = []
  let i = 0
  while (i < argv.length) {
    const arg = argv[i]
    if (arg === '--port' && i + 1 < argv.length) {
      mcpFlags.push('--port', argv[i + 1])
      i += 2
    } else if (arg.startsWith('--port=')) {
      mcpFlags.push('--port', arg.slice('--port='.length))
      i++
    } else if (arg === '--url' && i + 1 < argv.length) {
      mcpFlags.push('--url', argv[i + 1])
      i += 2
    } else if (arg.startsWith('--url=')) {
      mcpFlags.push('--url', arg.slice('--url='.length))
      i++
    } else if (arg === '--debug') {
      // Skip --debug, it's a global CLI flag not relevant to mcp2cli
      i++
    } else {
      passthroughArgs.push(arg)
      i++
    }
  }

  // Handle --list flag: `fulcrum --list` → list MCP tools
  const listIndex = passthroughArgs.indexOf('--list')
  if (listIndex !== -1) {
    passthroughArgs.splice(listIndex, 1)
    const mcpStdio = buildMcpStdio(mcpFlags)
    const cmd = ['uvx', 'mcp2cli', '--mcp-stdio', mcpStdio, '--list', ...passthroughArgs]
    return runCommand(cmd)
  }

  // The first non-flag arg is the tool name
  const toolIndex = passthroughArgs.findIndex((a) => !a.startsWith('-'))
  if (toolIndex === -1) {
    // No tool name found — nothing to passthrough
    console.error('Error: No tool name provided for MCP passthrough.')
    return 1
  }

  // Convert underscores to dashes in tool name (list_tasks → list-tasks)
  const toolName = passthroughArgs[toolIndex].replace(/_/g, '-')
  const remainingArgs = [...passthroughArgs.slice(0, toolIndex), ...passthroughArgs.slice(toolIndex + 1)]

  const mcpStdio = buildMcpStdio(mcpFlags)
  const cmd = ['uvx', 'mcp2cli', '--mcp-stdio', mcpStdio, toolName, ...remainingArgs]
  return runCommand(cmd)
}

function buildMcpStdio(mcpFlags: string[]): string {
  const parts = ['fulcrum', 'mcp', ...mcpFlags]
  return parts.join(' ')
}

async function runCommand(cmd: string[]): Promise<number> {
  const proc = spawn(cmd, {
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  })
  return await proc.exited
}

# Security Guidelines for Code Execution Tools

## Overview

This document outlines the security measures implemented in the Octopi Neural Mesh system's code execution tools, particularly focusing on the DevOps agent's `executeCommand` method.

## Critical Security Measures

### 1. Command Injection Prevention

The system implements multiple layers of protection against command injection attacks:

#### Shell Metacharacter Detection
The following dangerous patterns are blocked:
- `;` - Command separator
- `|` - Pipe operator
- `&` and `&&` - AND operators
- `||` - OR operator
- `` ` `` - Backticks for command substitution
- `$()` - Command substitution
- `>` and `<` - I/O redirection
- `{}`, `[]`, `()` - Shell expansion characters
- `eval` - Direct code evaluation
- `/bin/sh`, `/bin/bash` - Direct shell invocation

#### Example Blocked Commands
```javascript
// These commands are BLOCKED:
executeCommand('ls; rm -rf /');           // Semicolon separator
executeCommand('cat /etc/passwd | grep root'); // Pipe
executeCommand('echo `whoami`');          // Backtick substitution
executeCommand('echo $(whoami)');         // Command substitution
executeCommand('true && rm -rf /');       // AND operator
executeCommand('cat /etc/passwd > /tmp/pwned'); // Redirection
```

### 2. Command Whitelist

Only explicitly approved commands can be executed. The whitelist is categorized for security:

#### Approved Commands

**Development Tools:**
- `npm` - Package manager (restricted subcommands)
- `node` - Runtime
- `git` - Version control (read-only operations only)

**Container Management:**
- `docker` - Container operations (read-only: ps, images, info, version, inspect)

**System Information (Read-Only):**
- `ps`, `top` - Process monitoring
- `df`, `free` - Disk and memory info
- `uptime`, `uname`, `whoami` - System info
- `which` - Command location

**Network Utilities (Limited):**
- `netstat` - Network statistics
- `ping` - Connectivity test
- `curl` - HTTP client (with restrictions)

**File Operations (Restricted):**
- `cat`, `ls`, `pwd` - Read operations
- `mkdir`, `cp`, `mv` - Safe write operations
- `tail`, `head` - File viewing
- `grep`, `find` - Search

#### Explicitly Blocked Commands

For security reasons, these commands are **NOT** in the whitelist:
- `rm`, `rmdir` - File deletion
- `chmod`, `chown` - Permission changes
- `systemctl`, `service` - Service management
- `sudo`, `su` - Privilege escalation
- `ssh`, `scp` - Remote access
- `bash`, `sh` - Shell execution
- `eval`, `exec` - Code execution
- `wget` - Unvalidated file download

### 3. Argument Validation

Commands with complex arguments have specific validation rules:

#### NPM Command Validation
```javascript
// Allowed:
executeCommand('npm install');
executeCommand('npm run build');
executeCommand('npm test');
executeCommand('npm --version');

// Blocked:
executeCommand('npm malicious-script'); // Invalid subcommand
```

#### Git Command Validation
```javascript
// Allowed (read-only):
executeCommand('git status');
executeCommand('git log');
executeCommand('git diff');
executeCommand('git --no-pager show');

// Blocked (write operations):
executeCommand('git push origin master'); // Write operation
executeCommand('git rm -rf /'); // Destructive operation
```

#### Docker Command Validation
```javascript
// Allowed (read-only):
executeCommand('docker ps');
executeCommand('docker images');
executeCommand('docker info');

// Blocked (destructive):
executeCommand('docker rm container-id'); // Deletion
executeCommand('docker run malicious'); // Execution
```

### 4. Path Traversal Prevention

The system blocks attempts to access files outside allowed directories:

```javascript
// Blocked:
executeCommand('cat ../../etc/passwd');    // Path traversal
executeCommand('cat /etc/shadow');          // Disallowed absolute path

// Allowed:
executeCommand('cat /proc/uptime');         // Safe system path
executeCommand('cat /var/log/app.log');     // Allowed directory
executeCommand('cat /tmp/safe-file.txt');   // Temp directory
```

#### Allowed Absolute Paths
- `/var/*` - Variable data
- `/tmp/*` - Temporary files
- `/opt/*` - Optional software
- `/proc/*` - Process information
- `/home/*` - User directories

### 5. Resource Limits

Commands are executed with strict resource constraints:

```javascript
{
  timeout: 30000,              // 30 second max execution time
  maxBuffer: 1024 * 1024,      // 1MB max output buffer
  shell: '/bin/sh',            // Restricted shell environment
  env: {
    PATH: '/usr/local/bin:/usr/bin:/bin', // Limited PATH
    IFS: ' \t\n'              // Reset IFS to prevent injection
  }
}
```

### 6. Comprehensive Audit Logging

All command execution attempts are logged with full context:

```javascript
{
  level: 'info',
  message: 'Executing system command',
  data: {
    command: 'validated-command',
    baseCommand: 'npm',
    options: { timeout: 30000 },
    timestamp: '2025-12-03T06:46:15.549Z',
    agentId: 'agent-uuid',
    sessionId: 'session-uuid'
  }
}
```

Failed attempts are also logged:
```javascript
{
  level: 'error',
  message: 'Command blocked: dangerous pattern detected',
  data: {
    command: 'attempted-command',
    pattern: '/[;&|`$()]/i',
    timestamp: '2025-12-03T06:46:15.549Z'
  }
}
```

## Safe Usage Patterns

### ✅ DO: Use Whitelisted Commands
```javascript
// Good - uses allowed command with safe arguments
await executeCommand('npm install');
await executeCommand('git status');
await executeCommand('docker ps');
```

### ✅ DO: Validate Inputs Before Passing to executeCommand
```javascript
// Good - validate user input before command construction
const allowedBranches = ['main', 'develop', 'staging'];
if (allowedBranches.includes(branchName)) {
  await executeCommand(`git show ${branchName}`);
}
```

### ❌ DON'T: Concatenate User Input Directly
```javascript
// Bad - never concatenate user input directly
const userInput = req.body.filename; // Could be "; rm -rf /"
await executeCommand(`cat ${userInput}`); // DANGEROUS!

// Good - validate and sanitize first
const safeFilename = path.basename(userInput); // Remove directory traversal
if (/^[a-zA-Z0-9._-]+$/.test(safeFilename)) {
  await executeCommand(`cat /var/log/${safeFilename}`);
}
```

### ❌ DON'T: Bypass Security Checks
```javascript
// Bad - attempting to bypass validation
import { exec } from 'child_process'; // Don't import exec directly
exec('dangerous-command'); // Bypasses all security!

// Good - use the secure executeCommand wrapper
await this.executeCommand('safe-command');
```

## Testing Security

The system includes comprehensive security tests in `tests/code-execution-security.spec.js`:

```bash
npm test
```

Test coverage includes:
- Command injection prevention (8 tests)
- Whitelist enforcement (5 tests)
- Path traversal prevention (3 tests)
- Input validation (3 tests)
- Argument validation (4 tests)
- Audit logging (2 tests)
- Resource limits (2 tests)
- Shell escape prevention (3 tests)

**Total: 30 security test cases**

## Incident Response

If a security violation is detected:

1. **Command is blocked immediately** - Execution never occurs
2. **Error is logged** - Full details captured in audit log
3. **Error thrown to caller** - Clear error message provided
4. **No partial execution** - Command is atomic (all-or-nothing)

## Security Updates

When modifying the command execution system:

1. ✅ **Always update the whitelist cautiously** - Each addition must be security reviewed
2. ✅ **Add tests for new commands** - Ensure safe usage patterns
3. ✅ **Document security implications** - Update this document
4. ✅ **Review argument validation** - Add rules for new commands
5. ✅ **Test injection scenarios** - Verify protections work

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT open a public issue**
2. Contact the security team directly
3. Provide detailed reproduction steps
4. Include potential impact assessment

## References

- OWASP Command Injection: https://owasp.org/www-community/attacks/Command_Injection
- CWE-78: OS Command Injection: https://cwe.mitre.org/data/definitions/78.html
- Node.js Security Best Practices: https://nodejs.org/en/docs/guides/security/

## Version History

- v1.0.0 (2025-12-03): Initial comprehensive security implementation
  - Command injection prevention
  - Whitelist enforcement
  - Path traversal prevention
  - Argument validation
  - Resource limits
  - Audit logging

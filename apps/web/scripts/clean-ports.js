#!/usr/bin/env bun

/**
 * Cross-platform port cleanup utility for Lightloop
 * Works on Windows, macOS, and Linux
 */

import { exec } from 'child_process'
import os from 'os'

const platform = os.platform()
const ports = [3000, 42069] // Frontend and devtools ports

function log(message) {
  console.log(`[clean-ports] ${message}`)
}

function isWindows() {
  return platform === 'win32'
}

/**
 * Get PIDs using a specific port
 */
function getPidsOnPort(port) {
  return new Promise((resolve) => {
    exec(`lsof -ti:${port}`, (error, stdout) => {
      if (error || !stdout || stdout.trim() === '') {
        resolve([])
        return
      }
      const pids = stdout
        .trim()
        .split('\n')
        .filter((pid) => pid)
        .map((pid) => Number.parseInt(pid, 10))
        .filter((pid) => !Number.isNaN(pid))
      resolve(pids)
    })
  })
}

/**
 * Wait and check if port is free
 */
async function waitForPortFree(port, maxWaitMs = 1000) {
  const startTime = Date.now()
  while (Date.now() - startTime < maxWaitMs) {
    const pids = await getPidsOnPort(port)
    if (pids.length === 0) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return false
}

/**
 * Kill process on port for Windows
 */
function cleanPortWindows(port) {
  return new Promise((resolve) => {
    exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
      if (error || !stdout) {
        resolve()
        return
      }

      const lines = stdout.split('\n')
      const pids = new Set()

      lines.forEach((line) => {
        const parts = line.trim().split(/\s+/)
        const pid = parts.at(-1)
        if (pid && pid !== '0') {
          pids.add(pid)
        }
      })

      if (pids.size === 0) {
        resolve()
        return
      }

      const killPromises = Array.from(pids).map(
        (pid) =>
          new Promise((killResolve) => {
            exec(`taskkill /F /PID ${pid}`, (killError) => {
              if (!killError) {
                log(`Killed process ${pid} on port ${port}`)
              }
              killResolve()
            })
          })
      )

      Promise.all(killPromises).then(() => {
        setTimeout(() => {
          exec(`netstat -ano | findstr :${port}`, (verifyError, verifyStdout) => {
            if (verifyError || !verifyStdout) {
              log(`Port ${port} is now free`)
            }
            resolve()
          })
        }, 500)
      })
    })
  })
}

/**
 * Kill process on port for Unix-like systems (Linux/Mac)
 * Sends SIGTERM first for graceful shutdown, then SIGKILL if needed
 */
async function cleanPortUnix(port) {
  const maxAttempts = 3

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const pids = await getPidsOnPort(port)

    if (pids.length === 0) {
      log(`Port ${port} is now free`)
      return
    }

    const signal = attempt < maxAttempts ? 'SIGTERM' : 'SIGKILL'

    for (const pid of pids) {
      try {
        try {
          process.kill(-pid, signal)
        } catch {
          // Process group kill failed, ignore
        }
        process.kill(pid, signal)
        log(`Sent ${signal} to process ${pid} on port ${port}`)
      } catch (killError) {
        // Process might already be dead
      }
    }

    const isFree = await waitForPortFree(port, 1000)

    if (isFree) {
      log(`Port ${port} is now free (${signal} succeeded)`)
      return
    }

    if (attempt < maxAttempts) {
      log(`Port ${port} still busy, waiting 250ms before retry ${attempt + 1}/${maxAttempts}`)
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }

  // Final check after all attempts
  const remainingPids = await getPidsOnPort(port)
  if (remainingPids.length > 0) {
    log(`⚠️  Warning: Port ${port} still has processes: ${remainingPids.join(', ')}`)
    log('   Forcing final kill attempt...')

    for (const pid of remainingPids) {
      try {
        process.kill(pid, 'SIGKILL')
        try {
          process.kill(-pid, 'SIGKILL')
        } catch {
          // Ignore
        }
      } catch {
        // Ignore
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250))

    const finalCheck = await getPidsOnPort(port)
    if (finalCheck.length > 0) {
      throw new Error(
        `Failed to clean port ${port} after ${maxAttempts} attempts. PIDs still running: ${finalCheck.join(', ')}`
      )
    }
  }

  log(`Port ${port} is now free`)
}

/**
 * Clean a specific port based on platform
 */
async function cleanPort(port) {
  log(`Cleaning port ${port}...`)

  try {
    if (isWindows()) {
      await cleanPortWindows(port)
    } else {
      await cleanPortUnix(port)
    }
  } catch (error) {
    log(`❌ Error: Could not clean port ${port}: ${error.message}`)
    throw error
  }
}

/**
 * Kill any orphaned Vite/dev processes by name
 */
async function killOrphanedProcesses() {
  if (isWindows()) {
    // Windows: taskkill for vite processes
    return new Promise((resolve) => {
      exec('taskkill /F /IM vite.exe 2>nul', () => {
        setTimeout(resolve, 1000)
      })
    })
  } else {
    // Unix: kill vite and node processes related to our dev server
    return new Promise((resolve) => {
      exec(
        "pkill -9 -f 'vite dev' 2>/dev/null || true",
        () => {
          // Wait for processes to fully die
          setTimeout(resolve, 1000)
        }
      )
    })
  }
}

/**
 * Main cleanup function
 */
async function cleanAllPorts() {
  log(`Starting port cleanup on ${platform}`)

  // Step 1: Kill any orphaned processes by name FIRST
  await killOrphanedProcesses()

  // Step 2: Now clean ports
  for (const port of ports) {
    await cleanPort(port)
  }

  // Step 3: Final verification with extra wait
  log('Verifying ports are free...')
  await new Promise((resolve) => setTimeout(resolve, 1000))

  for (const port of ports) {
    const pids = await getPidsOnPort(port)
    if (pids.length > 0) {
      log(`⚠️  Warning: Port ${port} still has PIDs: ${pids.join(', ')}. Force killing...`)
      for (const pid of pids) {
        try {
          process.kill(pid, 'SIGKILL')
        } catch (e) {
          // Ignore
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  log('Port cleanup complete')
}

// Handle command line arguments
const args = process.argv.slice(2)
if (args.length > 0) {
  const customPorts = args.map((p) => Number.parseInt(p, 10)).filter((p) => !Number.isNaN(p))
  if (customPorts.length > 0) {
    ports.length = 0
    ports.push(...customPorts)
  }
}

// Run cleanup
cleanAllPorts()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error during port cleanup:', error)
    process.exit(1)
  })

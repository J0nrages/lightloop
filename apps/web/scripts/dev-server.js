#!/usr/bin/env bun

/**
 * Lightloop Development Server
 * Handles port cleanup, environment loading, and graceful startup/shutdown
 */

import { exec, spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
}

class DevServer {
  constructor() {
    this.process = null
    this.isShuttingDown = false
  }

  log(message, color = 'reset') {
    const timestamp = new Date().toLocaleTimeString()
    console.log(
      `${colors.gray}[${timestamp}]${colors.reset} ${colors[color]}${message}${colors.reset}`
    )
  }

  error(message) {
    this.log(`❌ ${message}`, 'red')
  }

  success(message) {
    this.log(`✅ ${message}`, 'green')
  }

  info(message) {
    this.log(`ℹ️  ${message}`, 'blue')
  }

  warn(message) {
    this.log(`⚠️  ${message}`, 'yellow')
  }

  /**
   * Load environment variables from .env.local
   */
  loadEnvironment() {
    const envPath = path.join(__dirname, '..', '.env.local')

    if (!fs.existsSync(envPath)) {
      this.warn('.env.local not found - using environment defaults')
      return
    }

    const envContent = fs.readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        return
      }
      const equalsIndex = trimmed.indexOf('=')
      if (equalsIndex === -1) {
        return
      }
      const key = trimmed.slice(0, equalsIndex).trim()
      const value = trimmed.slice(equalsIndex + 1).trim()
      process.env[key] = value
    })

    this.success('Environment variables loaded from .env.local')
  }

  /**
   * Clear Next.js/Vite build cache
   */
  async clearCache() {
    return new Promise((resolve) => {
      this.info('Clearing build cache...')
      exec('rm -rf .next .vite', (error) => {
        if (error) {
          this.warn('Could not clear cache (may not exist)')
        } else {
          this.success('Build cache cleared')
        }
        resolve()
      })
    })
  }

  /**
   * Clean up ports before starting
   */
  async cleanPorts() {
    return new Promise((resolve, reject) => {
      this.info('Cleaning up existing processes on ports...')
      exec('bun scripts/clean-ports.js', (error, stdout, stderr) => {
        if (stdout) console.log(stdout)
        if (stderr) console.error(stderr)

        if (error) {
          this.warn('Port cleanup had issues, continuing anyway...')
          // Don't fail on cleanup errors, just warn
          setTimeout(resolve, 300)
        } else {
          this.success('Ports cleaned successfully')
          // Small delay to ensure OS has released ports
          setTimeout(resolve, 300)
        }
      })
    })
  }

  /**
   * Print startup information
   */
  printStartupInfo() {
    console.log(`\n${'='.repeat(60)}`)
    this.log('🚀 Starting Lightloop Development Server', 'bright')
    console.log(`${'='.repeat(60)}\n`)
  }

  /**
   * Print localhost links
   */
  printLocalhostLinks() {
    console.log(`\n${'='.repeat(60)}`)
    this.log('🌐 Local Development URLs', 'bright')
    console.log('─'.repeat(60))
    console.log(
      `  ${colors.green}▶${colors.reset} Frontend (TanStack Start) ${colors.cyan}http://localhost:3000${colors.reset}`
    )
    console.log(
      `  ${colors.green}▶${colors.reset} TanStack DevTools        ${colors.cyan}http://localhost:42069${colors.reset}`
    )
    console.log('─'.repeat(60))
    console.log(`${'='.repeat(60)}\n`)
  }

  /**
   * Start the Vite dev server
   */
  async startServer() {
    return new Promise((resolve, reject) => {
      this.info('Starting Vite dev server...')

      const child = spawn('bun', ['run', 'dev:app'], {
        stdio: ['inherit', 'pipe', 'pipe'],
        env: process.env,
        cwd: path.join(__dirname, '..'),
      })

      this.process = child

      let hasStarted = false

      child.stdout.on('data', (data) => {
        const output = data.toString()

        // Check for startup indicators
        if (!hasStarted && (output.includes('Local:') || output.includes('ready in'))) {
          hasStarted = true
          this.success('Vite dev server started successfully')
          this.printLocalhostLinks()
          this.info('Press Ctrl+C to stop the server')
          resolve(child)
        }

        // Stream all output as-is
        process.stdout.write(output)
      })

      child.stderr.on('data', (data) => {
        const output = data.toString()

        // Stream all output as-is
        process.stderr.write(output)
      })

      child.on('close', (code) => {
        if (!this.isShuttingDown) {
          this.error(`Dev server exited with code ${code}`)
          process.exit(code || 1)
        }
      })

      // Startup timeout
      setTimeout(() => {
        if (!hasStarted) {
          this.warn('Server taking longer than expected to start...')
        }
      }, 10000)
    })
  }

  /**
   * Graceful shutdown
   */
  shutdown() {
    if (this.isShuttingDown) {
      return
    }
    this.isShuttingDown = true

    this.info('\nShutting down server...')

    if (this.process) {
      try {
        this.process.kill('SIGTERM')

        // Force kill after 5 seconds
        setTimeout(() => {
          if (!this.process.killed) {
            this.process.kill('SIGKILL')
          }
        }, 5000)
      } catch (error) {
        this.warn(`Error stopping server: ${error.message}`)
      }
    }

    setTimeout(() => {
      this.success('Server stopped')
      process.exit(0)
    }, 1000)
  }

  /**
   * Main start function
   */
  async start() {
    try {
      this.printStartupInfo()

      // Load environment variables
      this.loadEnvironment()

      // Clear cache
      await this.clearCache()

      // Clean ports
      await this.cleanPorts()

      // Start server
      await this.startServer()

      // Setup graceful shutdown
      process.on('SIGINT', () => this.shutdown())
      process.on('SIGTERM', () => this.shutdown())
    } catch (error) {
      this.error(`Failed to start server: ${error.message}`)
      process.exit(1)
    }
  }
}

const server = new DevServer()
server.start()

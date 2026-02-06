#!/usr/bin/env node
import { defineCommand, runMain } from 'citty'

const main = defineCommand({
  meta: {
    name: 'cobalt',
    version: '0.1.0',
    description: 'Cypress for AI agents — test, evaluate, and track your AI experiments'
  },
  subCommands: {
    init: () => import('./commands/init.js').then(m => m.default),
    run: () => import('./commands/run.js').then(m => m.default)
  }
})

runMain(main)

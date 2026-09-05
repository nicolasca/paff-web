import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const REQUIRED_COLUMNS = [
  'Entité',
  'Faction',
  'Nom carte',
  'Cost',
  'Max in deck',
  'Life',
  'Attack',
  'Type unit',
  'Capacités',
  'Unités',
]

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectDirectory = resolve(scriptDirectory, '..')
const sourceArgument = process.argv.find((argument) => argument.startsWith('--file='))
const sourcePath = sourceArgument
  ? resolve(process.cwd(), sourceArgument.slice('--file='.length))
  : resolve(projectDirectory, 'data/catalog/paff-v100-cards.csv')
const deploymentFlag = process.argv.includes('--prod') ? '--prod' : undefined
const csv = await readFile(sourcePath, 'utf8')
const table = parseCsv(csv)
const [headers, ...dataRows] = table

for (const column of REQUIRED_COLUMNS) {
  if (!headers.includes(column)) {
    throw new Error(`Colonne requise absente: ${column}`)
  }
}

const rows = dataRows
  .filter((row) => row.some((value) => value.trim() !== ''))
  .map((row, index) => ({
    lineNumber: index + 2,
    entityCode: cell(row, headers, 'Entité'),
    faction: cell(row, headers, 'Faction'),
    name: cell(row, headers, 'Nom carte'),
    cost: cell(row, headers, 'Cost'),
    deckLimit: cell(row, headers, 'Max in deck'),
    life: cell(row, headers, 'Life'),
    attack: cell(row, headers, 'Attack'),
    unitType: cell(row, headers, 'Type unit'),
    abilities: cell(row, headers, 'Capacités'),
    isUnit: cell(row, headers, 'Unités'),
    sourceNote: row.at(-1) ?? '',
  }))

const commandArguments = [
  'convex',
  'run',
  'catalogImport:importCards',
  JSON.stringify({ rows }),
]
if (deploymentFlag) commandArguments.push(deploymentFlag)

const result = spawnSync('npx', commandArguments, {
  cwd: projectDirectory,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
})

if (result.stdout) process.stdout.write(result.stdout)
if (result.stderr) process.stderr.write(result.stderr)
if (result.error) throw result.error
process.exitCode = result.status ?? 1

function cell(row, headers, name) {
  return row[headers.indexOf(name)] ?? ''
}

function parseCsv(value) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    const next = value[index + 1]

    if (character === '"') {
      if (quoted && next === '"') {
        field += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      row.push(field)
      field = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += character
    }
  }

  if (quoted) throw new Error('Guillemet CSV non refermé')
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

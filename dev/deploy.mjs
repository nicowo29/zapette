// Mise en ligne : construit l'application, puis pousse dist/ sur la branche gh-pages (GitHub Pages).
// Usage : npm run deploy
import { execSync } from 'node:child_process'
import { rmSync, writeFileSync } from 'node:fs'

const read = (command) => execSync(command, { encoding: 'utf8' }).trim()
const run = (command, cwd) => execSync(command, { cwd, stdio: 'inherit' })

const remote = read('git remote get-url origin')
const name = read('git config user.name')
const email = read('git config user.email')

run('npm run build')
// sans ce fichier, GitHub Pages passe le site dans Jekyll et peut écarter des fichiers
writeFileSync('dist/.nojekyll', '')
rmSync('dist/.git', { recursive: true, force: true })
run('git init -q -b gh-pages', 'dist')
run('git add -A', 'dist')
run(`git -c user.name="${name}" -c user.email="${email}" commit -q -m "Mise en ligne"`, 'dist')
run(`git push -f -q "${remote}" gh-pages`, 'dist')
rmSync('dist/.git', { recursive: true, force: true })
console.log('En ligne dans une à deux minutes.')

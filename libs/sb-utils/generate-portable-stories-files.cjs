const fs = require('fs')
const path = require('path')

function createPortableFile(filePath, renderer) {
  const fileDir = path.dirname(filePath)
  const fileName = path.basename(filePath, path.extname(filePath))
  const portableFilePath = path.join(fileDir, `${fileName}.portable.ts`)
  const importPath = `./${fileName}`

  const content =
    `import { composeStories } from '@storybook/${renderer}'\n` +
    `import * as stories from '${importPath.replace(/\\/g, '/')}'\n\n` +
    `export default composeStories(stories)\n`

  fs.writeFileSync(portableFilePath, content, 'utf8')
  console.log(`\t✅ ${portableFilePath}`)
}

function generatePortableStoriesFiles(directory, renderer) {
  fs.readdirSync(directory, { withFileTypes: true }).forEach((dirent) => {
    const fullPath = path.join(directory, dirent.name)
    if (dirent.isDirectory() && dirent.name !== 'node_modules') {
      generatePortableStoriesFiles(fullPath, renderer)
    } else if (dirent.isFile() && dirent.name.match(/\.stories\.(ts|tsx|js|jsx)$/)) {
      createPortableFile(fullPath, renderer)
    }
  })
}

module.exports = {
  generatePortableStoriesFiles
}
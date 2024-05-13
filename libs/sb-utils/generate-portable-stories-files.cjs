const fs = require('fs')
const path = require('path')

function createPortableFile(filePath) {
  const fileDir = path.dirname(filePath)
  const fileName = path.basename(filePath, path.extname(filePath))
  const portableFilePath = path.join(fileDir, `${fileName}.portable.ts`)
  const importPath = `./${fileName}`

  const content =
    `import { composeStories } from '@storybook/react'\n\n` +
    `import * as stories from '${importPath.replace(/\\/g, '/')}'\n\n` +
    `export default composeStories(stories)\n`

  fs.writeFileSync(portableFilePath, content, 'utf8')
  console.log(`Portable story file created at: ${portableFilePath}`)
}

function traverseDirectories(directory) {
  fs.readdirSync(directory, { withFileTypes: true }).forEach((dirent) => {
    const fullPath = path.join(directory, dirent.name)
    if (dirent.isDirectory()) {
      traverseDirectories(fullPath)
    } else if (dirent.isFile() && dirent.name.match(/\.stories\.tsx$/)) {
      createPortableFile(fullPath)
    }
  })
}

module.exports = {
  traverseDirectories
}
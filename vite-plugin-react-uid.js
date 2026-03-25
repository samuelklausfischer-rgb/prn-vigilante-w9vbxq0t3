import { parseSync } from 'oxc-parser'
import MagicString from 'magic-string'
import path from 'path'

export default function oxcDeepUidPlugin() {
  return {
    name: 'vite-plugin-oxc-deep-uid',
    enforce: 'pre',
    transform(code, id) {
      // 1. Filtrar apenas arquivos .jsx / .tsx e ignorar node_modules
      if (!/\.(t|j)sx$/.test(id) || id.includes('node_modules')) return

      const s = new MagicString(code)

      // 2. Parsear o código
      const parseResult = parseSync(id, code, {
        sourceType: 'module',
      })

      // 3. Obter o nome do arquivo relativo (para o ID ficar mais curto)
      // Ex: /user/project/src/App.tsx -> src/App.tsx
      const relativeFilename = path.relative(process.cwd(), id).replace(/\\/g, '/')

      function checkForJSXExpressions(node) {
        if (!node || typeof node !== 'object') return

        if (node.type === 'JSXAttribute' && node.name.name !== 'className') {
          return false
        }

        if (node.type === 'JSXExpressionContainer' && node.expression.type !== 'Literal') {
          return true
        }

        for (const key in node) {
          const child = node[key]
          if (Array.isArray(child)) {
            const expressions = child.some((c) => checkForJSXExpressions(c))
            if (expressions) {
              return true
            }
          } else if (child && typeof child === 'object') {
            const expressions = checkForJSXExpressions(child)
            if (expressions) {
              return true
            }
          }
        }

        return false
      }

      // 4. Função recursiva para visitar TODOS os nós
      function visit(node, parent) {
        if (!node || typeof node !== 'object') return

        // Se encontrarmos uma abertura de elemento JSX (<div, <span, <Component)
        if (node.type === 'JSXOpeningElement') {
          // ATENÇÃO: Ignorar Fragments (<>...</>) pois eles não aceitam atributos
          // No AST, Fragments geralmente são JSXFragment, mas se for JSXOpeningElement
          // sem nome ou com nome especial, devemos checar.
          // O Oxc geralmente separa JSXFragment de JSXElement, então isso aqui foca nas tags reais.

          if (node.name) {
            // Garante que tem um nome (div, span, Header)

            // Calcula a linha e coluna para garantir unicidade
            // Oxc fornece 'loc' (location) se solicitado ou 'start/end'
            // Vamos usar o 'start' para calcular a linha manualmente se necessário,
            // mas o MagicString facilita inserção por índice.

            const { line, column } = getLineColumn(code, node.start)

            // Cria o ID único: "arquivo:linha:coluna"
            const uniqueId = `${relativeFilename}:${line}:${column}`

            const prohibitions = []

            if (node.selfClosing || checkForJSXExpressions(parent)) {
              prohibitions.push('editContent')
            }
            // Inserção Cirúrgica:
            // node.name.end é a posição logo após o nome da tag (ex: <div|...)
            s.appendLeft(
              node.name.end,
              ` data-uid="${uniqueId}" data-prohibitions="[${prohibitions.join(',')}]"`,
            )
          }
        }

        // Continua percorrendo os filhos do nó atual
        for (const key in node) {
          const child = node[key]
          if (Array.isArray(child)) {
            child.forEach((c) => visit(c, node))
          } else if (child && typeof child === 'object') {
            visit(child, node)
          }
        }
      }

      // Iniciar a varredura
      visit(parseResult.program, null)

      return {
        code: s.toString(),
        map: s.generateMap({ source: id, includeContent: true }),
      }
    },
  }
}

// Helper simples para pegar linha e coluna baseado no índice
function getLineColumn(source, index) {
  const lines = source.slice(0, index).split('\n')
  const line = lines.length
  const column = lines[lines.length - 1].length + 1
  return { line, column }
}
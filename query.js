// ============================================================
//  OLLAMA COM DOCUMENTOS LOCAIS
//  Uso: node query.js "sua pergunta aqui"
//  Exemplo: node query.js "como funciona o endpoint de pedidos?"
// ============================================================

const fs   = require('fs')
const path = require('path')
const http = require('http')

// ------ CONFIGURAÇÃO ----------------------------------------
const CONFIG = {
  // Pasta com seus arquivos de código/docs
  // Pode ser um projeto inteiro: '../meu-projeto'
  DIRETORIO: process.env.DOC_DIR || './docs',

  // Extensões que serão lidas
  EXTENSOES: ['.js', '.ts', '.md', '.txt', '.json', '.py', '.env.example', '.sh'],

  // Modelo do Ollama (veja os que você tem: ollama list)
  MODELO: process.env.OLLAMA_MODEL || 'llama3',

  // Quantos caracteres de contexto enviar (mais = mais lento)
  MAX_CONTEXTO: 8000,
}
// ------------------------------------------------------------

// ============================================================
//  LÊ TODOS OS ARQUIVOS DO DIRETÓRIO
// ============================================================
function lerDiretorio(dir, arquivos = []) {
  if (!fs.existsSync(dir)) {
    console.error(`[Erro] Diretório não encontrado: ${dir}`)
    process.exit(1)
  }

  const itens = fs.readdirSync(dir)
  for (const item of itens) {
    // Ignora pastas comuns que não interessam
    if (['node_modules', '.git', 'dist', 'build', '.next'].includes(item)) continue

    const caminho = path.join(dir, item)
    const stat = fs.statSync(caminho)

    if (stat.isDirectory()) {
      lerDiretorio(caminho, arquivos)
    } else {
      const ext = path.extname(item).toLowerCase()
      if (CONFIG.EXTENSOES.includes(ext)) {
        arquivos.push(caminho)
      }
    }
  }
  return arquivos
}

function montarContexto(arquivos) {
  let contexto = ''
  for (const arquivo of arquivos) {
    try {
      const conteudo = fs.readFileSync(arquivo, 'utf8')
      const bloco = `\n\n### Arquivo: ${arquivo}\n\`\`\`\n${conteudo}\n\`\`\``
      // Para quando atingir o limite de contexto
      if (contexto.length + bloco.length > CONFIG.MAX_CONTEXTO) {
        console.log(`[Aviso] Limite de contexto atingido. Arquivos lidos: ${arquivos.indexOf(arquivo)}/${arquivos.length}`)
        break
      }
      contexto += bloco
    } catch (e) {
      // ignora arquivos que não consegue ler
    }
  }
  return contexto
}

// ============================================================
//  CHAMA O OLLAMA LOCAL
// ============================================================
function chamarOllama(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model : CONFIG.MODELO,
      prompt: prompt,
      stream: false,
    })

    const req = http.request(
      {
        hostname: 'localhost',
        port    : 11434,
        path    : '/api/generate',
        method  : 'POST',
        headers : { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let data = ''
        res.on('data', chunk => (data += chunk))
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            resolve(json.response)
          } catch (e) {
            reject(new Error('Resposta inválida do Ollama: ' + data.slice(0, 200)))
          }
        })
      }
    )

    req.on('error', (e) => {
      if (e.code === 'ECONNREFUSED') {
        reject(new Error('Ollama não está rodando. Execute: ollama serve'))
      } else {
        reject(e)
      }
    })

    req.write(body)
    req.end()
  })
}

// ============================================================
//  MODO INTERATIVO (sem argumento na linha de comando)
// ============================================================
async function modoInterativo(contexto) {
  const readline = require('readline')
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  console.log('\n💬 Modo interativo — digite sua pergunta (ou "sair" para encerrar)\n')

  const perguntar = () => {
    rl.question('Você: ', async (pergunta) => {
      if (pergunta.toLowerCase() === 'sair') {
        console.log('👋 Encerrando.')
        rl.close()
        return
      }
      if (!pergunta.trim()) { perguntar(); return }

      const prompt = montarPrompt(contexto, pergunta)
      console.log('\n🤖 Pensando...\n')

      try {
        const resposta = await chamarOllama(prompt)
        console.log('Ollama: ' + resposta + '\n')
      } catch (e) {
        console.error('Erro:', e.message)
      }
      perguntar()
    })
  }
  perguntar()
}

function montarPrompt(contexto, pergunta) {
  return `Você é um assistente de código. Responda em português.
Abaixo estão os arquivos do projeto atual:
${contexto}

---
Pergunta: ${pergunta}

Responda de forma direta e objetiva, com exemplos de código quando necessário.`
}

// ============================================================
//  MAIN
// ============================================================
async function main() {
  const pergunta = process.argv.slice(2).join(' ')

  console.log(`\n📂 Lendo arquivos em: ${path.resolve(CONFIG.DIRETORIO)}`)
  const arquivos = lerDiretorio(CONFIG.DIRETORIO)
  console.log(`   ${arquivos.length} arquivos encontrados`)

  const contexto = montarContexto(arquivos)
  console.log(`   ${contexto.length} caracteres de contexto montados`)
  console.log(`   Modelo: ${CONFIG.MODELO}\n`)

  if (!pergunta) {
    await modoInterativo(contexto)
    return
  }

  console.log(`❓ Pergunta: ${pergunta}\n🤖 Pensando...\n`)
  try {
    const prompt   = montarPrompt(contexto, pergunta)
    const resposta = await chamarOllama(prompt)
    console.log('Resposta:\n' + resposta)
  } catch (e) {
    console.error('Erro:', e.message)
  }
}

main()

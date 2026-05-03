# Ollama com documentos locais
> Faz o modelo responder baseado nos arquivos do seu projeto

## Como usar

```bash
# Pergunta única
node query.js "como funciona o endpoint de pedidos?"

# Modo interativo (fica perguntando até você digitar "sair")
node query.js

# Apontando para outro diretório
DOC_DIR=../bot-vendas node query.js "explica o que esse código faz"

# Usando outro modelo
OLLAMA_MODEL=codellama node query.js "tem algum bug nesse código?"
```

## Antes de rodar

```bash
# Certifica que o Ollama está rodando
ollama serve

# Vê quais modelos você tem instalados
ollama list

# Se não tiver nenhum, baixa um (llama3 é bom pra código)
ollama pull llama3

# Para código especificamente, esse é excelente:
ollama pull codellama
```

## Colocar o projeto inteiro como contexto

```bash
# Aponta para a pasta do bot de vendas
DOC_DIR=../bot-vendas node query.js "como eu adiciono suporte ao Rappi?"
```

## Modelos recomendados para o seu caso

| Modelo       | Uso ideal                        | Tamanho |
|--------------|----------------------------------|---------|
| `llama3`     | Perguntas gerais + código        | 4.7 GB  |
| `codellama`  | Código e debug                   | 3.8 GB  |
| `mistral`    | Rápido, bom custo/benefício      | 4.1 GB  |
| `phi3`       | Leve, bom para hardware limitado | 2.3 GB  |

Se a conta de luz for preocupação: use `phi3` — consome menos CPU/GPU.

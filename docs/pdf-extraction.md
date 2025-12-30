# PDF Structured Extraction

## Visao geral
O fluxo usa o `pdfjs-dist` (via `extractTextFromPdfFile`) e aplica parsing + validacao
para extrair campos obrigatorios do PDF.

## Fluxo tecnico
1) Extrair texto bruto do PDF com `extractTextFromPdfFile`.
2) Converter o texto em registros com `parseAthleteRecordsFromText`.
3) Validar os registros com `buildValidationReport`.

## Campos extraidos
- `nome`: string normalizada (lowercase) com primeiro nome + sobrenome.
- `sexo`: `masculino` ou `feminino`.
- `faixa`: `branca`, `cinza`, `amarelo`, `azul`.
- `idade`: inteiro positivo.
- `categoriaIdade`: `juvenil` (<= 17) ou `adulto` (>= 18).
- `academia`: string conforme fornecida no PDF (apenas limpeza de espacos).
- `_raw`: valores originais capturados por campo (uso interno).

## Validacao aplicada
- `nome` deve conter pelo menos dois termos.
- `sexo` aceita apenas `masculino` ou `feminino`.
- `faixa` aceita apenas `branca`, `cinza`, `amarelo`, `azul`.
- `idade` deve ser numero positivo.
- `academia` nao pode estar vazia.

## Layouts suportados
- Linhas com `Campo: valor` ou `Campo - valor`.
- Campos em uma mesma linha separados por `|` ou `;`.
- Tabelas com cabecalho (colunas separadas por `|`, `;`, tab ou 2+ espacos).

## Tratamento de erros
- PDFs invalidos/corrompidos geram erro amigavel na extracao.
- `buildValidationReport` retorna erros por registro quando faltam campos obrigatorios.

## Exemplo de uso
```js
import { extractStructuredDataFromPdfFile } from '../services/pdfStructuredExtractionService';

const { records, report } = await extractStructuredDataFromPdfFile(file);
```

## Extensao
Para suportar novos sinonimos, atualize `FIELD_LABELS`, `SEXO_MAP` ou `FAIXA_MAP`
em `src/services/pdfStructuredExtractionService.js`.

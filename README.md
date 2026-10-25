# Pulso Eleitoral

Painel independente de acompanhamento da eleição presidencial de 2026. Os resultados nacionais e por UF vêm dos arquivos JSON públicos de divulgação do TSE. A interface atualiza a cada 60 segundos e também oferece atualização manual.

## Executar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Fonte dos dados

- [Informações técnicas do TSE para divulgação de resultados em 2026](https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados)
- Padrão consultado: `https://resultados.tse.jus.br/oficial/ele2026/{6257|6258}/dados/{br|uf}/{br|uf}-c0001-e00{6257|6258}-u.json`
- 6257: primeiro turno; 6258: segundo turno; cargo 0001: Presidente.

O servidor Next.js consulta e valida os arquivos, reaproveita as respostas por 60 segundos e devolve um formato simplificado à interface. Resultados indisponíveis são identificados como tal. O mapa colore uma UF somente quando há seções e votos apurados no arquivo correspondente.

Geometria do mapa: [@svg-maps/brazil](https://github.com/VictorCazanave/svg-maps/tree/master/packages/brazil), licença CC BY 4.0.

Fotos dos candidatos: arquivos de divulgação do TSE para a eleição 6258, identificados pelos sequenciais 280002551544 (Flávio Bolsonaro) e 280002542548 (Lula).

export default {
  '*.js': ['prettier -c', 'eslint'],
  '*.ts': ['prettier -c', () => 'tsc', 'eslint', () => 'vitest run'],
  '*.json': ['prettier -c']
}

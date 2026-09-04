import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.sut/**',
      '.m2/**',
      'allure-report/**',
      'allure-results/**',
      'playwright-report/**',
      'test-results/**',
      'performance/results/**',
    ],
  },

  js.configs.recommended,

  {
    // As regras que exigem informacao de tipo valem apenas para os arquivos que
    // pertencem ao projeto TypeScript. Aplicadas globalmente, quebrariam ao
    // analisar este proprio arquivo de configuracao.
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Um any nao justificado esconde exatamente o tipo de erro que a suite
      // deveria detectar.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Promessa nao aguardada num teste produz falha fantasma: o teste termina
      // antes da acao e o erro aparece em outro cenario.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },

  {
    // Scripts de apoio e cenarios k6 sao JavaScript puro, fora do projeto
    // TypeScript, e falam com o console por natureza.
    files: ['scripts/**/*.js', 'performance/**/*.js'],
    languageOptions: {
      globals: {
        __ENV: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'writable',
        console: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
        setTimeout: 'readonly',
        __dirname: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
);

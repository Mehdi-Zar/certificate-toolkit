/**
 * Ce que le lint garantit, pour qu'on n'ait pas a s'en souvenir.
 *
 * Le typage attrape deja beaucoup. Ce qui est ajoute ici, ce sont les regles
 * propres au projet, celles qu'aucun compilateur ne connait :
 *
 *   - aucun texte destine a l'utilisateur hors du catalogue de traduction ;
 *   - aucun mot de passe passe en argument de ligne de commande.
 *
 * La premiere a deja ete enfreinte une fois. La regle est la pour que ca ne se
 * represente pas. La typographie, elle, est controlee par
 * scripts/check-docs.mjs, qui lit aussi bien les documents que les catalogues.
 */
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dist-electron/**',
      'release/**',
      'vendor/**',
      'test-results/**',
      'playwright-report/**',
      'node_modules/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // Un underscore devant un argument dit "je sais qu'il ne sert pas".
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Le typage strict rend la plupart des assertions inutiles ; celles qui
      // restent doivent etre justifiees, pas subies.
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['error', 'warn'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
    },
  },

  // --- Interface ------------------------------------------------------------
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },

  // --- Processus principal --------------------------------------------------
  {
    files: ['electron/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          // Le message affiche quand aucun certificat ne correspondait a la
          // cle privee etait ecrit ici, en dur et sans accents : il restait
          // donc en francais en session anglaise. Tout texte vu par un
          // utilisateur vient du catalogue.
          selector:
            "NewExpression[callee.name='Error'] > :matches(Literal[value=/[ ]/], TemplateLiteral)",
          message:
            "Un message d'erreur affiche passe par le catalogue : new Error(t('err.xxx')).",
        },
        {
          // Les arguments d'un processus sont visibles de tout le systeme.
          // Les mots de passe voyagent par l'environnement, jamais autrement.
          selector:
            "CallExpression[callee.property.name=/^(run|spawn|exec|execFile)/] Literal[value=/^-{1,2}(passin|passout|password|passwd)$/]",
          message:
            'Un mot de passe ne se passe pas en argument : utilisez env: et OPENSSL_CONF.',
        },
      ],
    },
  },

  // --- Tests ----------------------------------------------------------------
  {
    files: ['tests/**/*.ts'],
    rules: {
      // Un test decrit ce qu'il attend en clair, y compris des libelles.
      'no-restricted-syntax': 'off',
      'no-console': 'off',
    },
  },

  // --- Scripts Node ---------------------------------------------------------
  {
    files: ['scripts/**/*.mjs', '*.config.{js,ts}'],
    languageOptions: {
      globals: globals.node,
      parserOptions: { projectService: false },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
)

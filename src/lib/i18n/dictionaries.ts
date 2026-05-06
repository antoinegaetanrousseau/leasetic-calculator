export const dictionaries = {
  fr: {
    welcomeHeading: 'Bienvenue sur Leasétic Matrice',
    welcomeSubtext: 'Application en cours de déploiement.',
    themeLight: 'Clair',
    themeDark: 'Sombre',
    themeSystem: 'Système',
  },
  en: {
    welcomeHeading: 'Welcome to Leasétic Matrice',
    welcomeSubtext: 'Application deployment in progress.',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
  },
} as const;

export type Lang = keyof typeof dictionaries;
export type DictKey = keyof typeof dictionaries.fr;

// Tout le texte de la landing vit ici. Un {{marqueur}} est une information
// encore manquante : à remplacer avant publication.

export const PRODUCT = 'Lucrum Journal';

// Liste d'attente stockée dans Supabase (table public.waitlist, voir supabase/waitlist.sql).
// La clé anon est publique par conception : seule la règle RLS d'insertion la protège.
export const SUPABASE_URL = (process.env.REACT_APP_SUPABASE_URL || '').replace(/\/+$/, '');
export const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

export const NAV_LINKS = [
  { href: '#benefices', label: 'Bénéfices' },
  { href: '#fonctionnement', label: 'Fonctionnement' },
  { href: '#faq', label: 'Questions' },
];

export const HERO = {
  titleLines: ['Comprends pourquoi tu gagnes', 'et pourquoi tu perds'],
  sub: 'Importe le CSV de ton courtier. Le journal reconstruit tes trades, calcule tes statistiques et note tes journées sur ton processus, pas sur ton résultat.',
  cta: 'Rejoindre la liste d’attente',
  proof: 'Tes données restent sur ton ordinateur. Aucun compte requis.',
  imageAlt:
    'Tableau de bord du journal : P&L net sur une courbe de capital, sessions du mois et trades récents.',
};

export const PROBLEM = {
  title: 'Ton relevé de courtier t’indique ce qui s’est passé, pas pourquoi',
  body: [
    'Un relevé liste des exécutions. Il ne regroupe pas tes entrées partielles, tes renforcements ni tes ventes à découvert en trades lisibles.',
    'Un tableur te donne un total. Il ne te dit pas si ta journée gagnante était bien tradée, ni si ta journée perdante respectait ton plan.',
  ],
  solution:
    'Le journal transforme tes exécutions en trades, calcule les chiffres avec du code testé, puis te laisse noter ta méthode trade après trade.',
};

export const BENEFITS_TITLE = 'Des chiffres sûrs, un journal qui reste chez toi';

export const BENEFITS = [
  {
    title: 'Chiffres fiables',
    body: 'P&L, frais, taux de réussite, profit factor, espérance et drawdown sont calculés par du code testé. L’IA n’y touche pas.',
  },
  {
    title: 'Trades reconstruits',
    body: 'Exécutions partielles, renforcements et ventes à découvert sont regroupés automatiquement en un trade par aller retour.',
  },
  {
    title: 'Données privées',
    body: 'Une seule base SQLite sur ton ordinateur. Pas de télémétrie, pas de compte à créer pour utiliser le journal.',
  },
  {
    title: 'Journées notées sur le processus',
    body: 'En option, Claude lit tes notes et tes trades, puis te dit si une journée gagnante a été mal gérée.',
  },
  {
    title: 'Ton courtier, importé en un fichier',
    body: 'Thinkorswim et Interactive Brokers sont pris en charge. Tout autre courtier passe par un modèle CSV, une ligne par exécution.',
  },
];

export const STEPS_TITLE = 'De ton CSV à la revue du jour en trois étapes';

export const STEPS = [
  {
    title: 'Importe le CSV de ton courtier',
    body: 'Choisis ton fichier. Le courtier est détecté automatiquement.',
  },
  {
    title: 'Le journal reconstruit tes trades',
    body: 'Tes exécutions deviennent des trades, avec frais, MFE, MAE et efficacité de sortie.',
  },
  {
    title: 'Ouvre la revue du jour',
    body: 'Courbe de P&L de l’ouverture à la clôture, chaque trade marqué à son entrée, puis un rapport de coaching.',
  },
];

export const TAGLINE =
  'Un bon journal ne juge pas ton résultat. Il juge ta façon de trader, trade après trade, jusqu’à ce que ta méthode devienne un réflexe.';

export const FAQ_TITLE = 'Questions fréquentes';

export const FAQ = [
  {
    q: 'Où sont stockées mes données ?',
    a: 'Sur ton ordinateur, dans un seul fichier SQLite. Le journal ne demande pas de compte et n’envoie pas de télémétrie.',
  },
  {
    q: 'Quels courtiers sont pris en charge ?',
    a: 'Thinkorswim et Interactive Brokers ont un importeur dédié. Pour un autre courtier, un modèle CSV permet d’importer une ligne par exécution.',
  },
  {
    q: 'L’IA calcule mes résultats ?',
    a: 'Non. Le regroupement des trades, le P&L, les frais et les statistiques viennent de code déterministe avec des tests. L’IA ajoute une couche de coaching optionnelle.',
  },
  {
    q: 'Que fait Claude exactement ?',
    a: 'Il lit ton journal et tes trades pour noter ta journée sur le processus. Si tu l’utilises, les informations nécessaires à ta demande sont envoyées à l’API d’Anthropic. Sans cette fonction, rien ne quitte ton ordinateur.',
  },
  {
    q: 'Actions, options et futures ?',
    a: 'Les trois, y compris les exécutions partielles, les renforcements et les ventes à découvert.',
  },
  {
    q: 'Combien ça coûte ?',
    a: 'Gratuit. Le journal est open source sous licence MIT, sans offre payante.',
  },
  {
    q: 'À quelle date l’accès s’ouvre ?',
    a: 'Tu seras prévenu par email dès l’ouverture, sans avoir à revenir sur cette page.',
  },
  {
    q: 'Le journal remplace un conseil financier ?',
    a: 'Non. Il mesure et analyse tes trades passés. Il ne donne aucun signal et ne remplace pas un conseiller agréé.',
  },
];

export const FINAL = {
  title: 'Commence à lire tes trades comme un professionnel',
  sub: 'Un email suffit. Pas de carte bancaire.',
};

export const FOOTER = {
  disclaimer:
    'Ce n’est pas un conseil financier. Les captures montrent des données de démonstration, pas des trades réels.',
};

export const META = {
  title: 'Journal de trading local : comprends tes trades, note ta méthode',
  description:
    'Importe le CSV de ton courtier, reconstruis tes trades et note tes journées sur le processus. Journal de trading local, tes données restent sur ton ordinateur.',
};

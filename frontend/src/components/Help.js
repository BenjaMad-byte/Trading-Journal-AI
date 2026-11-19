import { PageHeader } from './ui';

const METRICS = [
  {
    category: 'KPIs du tableau de bord',
    items: [
      {
        name: 'P&L net',
        formula: 'Somme du P&L de tous les trades clôturés, après commissions',
        description: 'Votre profit ou perte total réalisé pour la période sélectionnée.',
        why: "Le chiffre qui compte vraiment. Toutes les autres métriques ne font qu'expliquer pourquoi ce chiffre est ce qu'il est.",
        target: null,
      },
      {
        name: 'Trades totaux',
        formula: 'Nombre de positions aller-retour complètes',
        description: 'Nombre de trades ouverts et clôturés pendant la période.',
        why: "Donne le contexte du dénominateur. Un taux de réussite de 70% sur 10 trades est très différent de 70% sur 300 trades.",
        target: null,
      },
      {
        name: 'Taux de réussite (trades)',
        formula: 'Trades gagnants / Total des trades × 100',
        description: 'Pourcentage de trades individuels clôturés avec un P&L net positif.',
        why: "Un taux de réussite élevé fait du bien mais ne veut rien dire sans connaître la taille moyenne de vos gains vs vos pertes. Un taux de 40% avec un ratio risque:récompense de 3:1 bat un taux de 70% avec un ratio de 0,5:1.",
        target: '55-65% pour les setups de momentum ; 40%+ acceptable si gain/perte moyen > 2',
      },
      {
        name: 'Facteur de profit',
        formula: 'P&L brut des gains / P&L brut des pertes',
        description: "Ratio entre l'argent total gagné sur les gains et l'argent total perdu sur les pertes.",
        why: "Un facteur de profit supérieur à 1,0 signifie que vous gagnez plus que vous ne perdez. En dessous de 1,0, c'est un système perdant quel que soit le taux de réussite. Des valeurs au-dessus de 1,5 indiquent un edge solide ; au-dessus de 2,0 c'est exceptionnel.",
        target: '1,5 ou plus',
      },
      {
        name: 'Taux de réussite (jours)',
        formula: 'Jours à P&L positif / Total des jours de trading × 100',
        description: 'Pourcentage de séances de trading terminées profitables.',
        why: "Mesure la régularité au niveau de la séance, pas seulement du trade. Un trader avec 80% de jours gagnants mais quelques grosses journées catastrophiques a un profil de risque différent d'un 60% régulier.",
        target: '70-80%',
      },
      {
        name: 'Gain moyen / Perte moyenne',
        formula: 'Gain moyen en $ / Perte moyenne en $',
        description: 'Combien vous gagnez sur un gain typique par rapport à ce que vous perdez sur une perte typique.',
        why: "Combiné au taux de réussite, cela détermine l'espérance. Si votre ratio est inférieur à 1,0, il vous faut un taux de réussite très élevé juste pour être à l'équilibre. La plupart des traders professionnels visent 1,5-2,5.",
        target: '1,5 ou plus',
      },
      {
        name: 'Espérance',
        formula: '(Taux de réussite × Gain moyen) + (Taux de perte × Perte moyenne)',
        description: 'Valeur en dollars attendue par trade, en moyenne, sur un grand nombre de trades.',
        why: "La métrique la plus importante pour savoir si vous avez un vrai edge. Une espérance positive signifie que le système gagne de l'argent dans le temps. Négative, il perd quelle que soit la qualité ressentie de vos setups. 39$/trade sur 1000 trades = 39 000$.",
        target: 'Positive ; 25$+ par trade est solide en intraday',
      },
    ],
  },
  {
    category: "Rapports et analyse de l'edge",
    items: [
      {
        name: 'P&L par heure de la journée',
        formula: 'P&L net additionné par tranche de 30 minutes (9h30 - 16h00)',
        description: "Profit et perte agrégés par tranche de 30 minutes correspondant à l'heure d'entrée du trade.",
        why: "La plupart des traders intraday découvrent qu'ils perdent de l'argent après une certaine heure. Si votre tranche 13h00-14h30 est systématiquement rouge, c'est une règle simple : arrêtez de trader après le déjeuner. Les fenêtres à forte probabilité se regroupent souvent dans les 90 premières minutes.",
        target: 'Identifiez vos meilleures et pires fenêtres de P&L, puis concentrez-vous ou évitez-les en conséquence',
      },
      {
        name: 'P&L par jour de la semaine',
        formula: 'P&L net additionné par jour calendaire (lun-ven)',
        description: 'Profit et perte agrégés par jour de la semaine sur toutes les séances tradées.',
        why: "Beaucoup de traders ont des biais constants - mauvais lundis (faible conviction sur un pré-marché peu liquide), mauvais vendredis (pression de prise de profit), jeudis solides. Si le schéma persiste sur 100+ jours, c'est structurel et exploitable.",
        target: "Tout jour systématiquement négatif sur 30+ échantillons mérite une taille réduite ou d'être évité",
      },
      {
        name: 'Distribution du Multiple R',
        formula: 'P&L réel / Risque prévu par trade, regroupé en tranches de 0,5R',
        description: "Un histogramme des résultats de trade exprimés en multiples de votre risque prévu. Un trade à 2R a rapporté deux fois la distance de votre stop loss ; un trade à -1R a touché votre stop.",
        why: "Cela vous indique si votre exécution correspond à votre plan. Si vous visez des objectifs à 2R mais que la plupart des trades sont des scratchs à 0,3R, vous coupez vos gains trop tôt. S'il y a une queue épaisse du côté gauche, vous ne respectez pas vos stops. Nécessite que le multiple R soit enregistré par trade.",
        target: 'Le mode doit être positif ; la distribution doit être asymétrique à droite (plus de résultats positifs que négatifs)',
      },
      {
        name: 'État émotionnel vs résultat',
        formula: "Taux de réussite et P&L moyen regroupés par état émotionnel enregistré",
        description: "Une ventilation de la performance par état émotionnel enregistré : calme, anxieux, trop confiant, discipliné, frustré, revanche.",
        why: "Les lignes « revanche » et « frustré » montrent presque toujours les pires chiffres. Voir le coût réel en dollars de trader en colère est plus puissant que n'importe quelle règle sur le revenge trading. Nécessite que l'état émotionnel soit enregistré par trade.",
        target: 'Les lignes « calme » et « discipliné » devraient surpasser votre moyenne globale ; « revanche » devrait être un signal d\'alarme',
      },
      {
        name: 'Durée de détention (gains vs pertes)',
        formula: 'Minutes moyennes entre le premier et le dernier fill, séparées par résultat',
        description: 'Temps moyen de détention des trades gagnants vs perdants. Calculé à partir des horodatages d\'exécution.',
        why: "Le biais comportemental n°1 des traders particuliers est de garder les perdants trop longtemps et de couper les gagnants trop tôt. Si vos pertes sont détenues deux fois plus longtemps que vos gains, vous espérez une reprise au lieu de respecter votre plan.",
        target: 'Des gains détenus plus longtemps que les pertes est un signe de bonne discipline',
      },
      {
        name: 'Fréquence des erreurs',
        formula: "Nombre d'occurrences de chaque tag d'erreur issu de l'analyse des trades et du journal",
        description: "Un classement des erreurs que vous faites le plus souvent, tirées des notes de votre journal de trading et du tagging par IA.",
        why: "La répétition est le signal. Vous connaissez déjà vos règles. Ce graphique montre lesquelles vous enfreignez le plus. Corrigez une erreur à la fois - la barre la plus haute en premier.",
        target: 'Les barres devraient se réduire avec le temps à mesure que vous corrigez chaque erreur systématiquement',
      },
    ],
  },
];

const FEATURES = [
  {
    name: 'Tableau de bord',
    icon: '🗂',
    description: "Vue d'ensemble en temps réel de tous les KPIs, des graphiques de P&L cumulé et quotidien, d'une heatmap calendaire, des positions ouvertes, des trades récents, et des graphiques par heure de la journée et par jour de la semaine.",
    tips: [
      'Utilisez le sélecteur de période pour comparer deux périodes (par ex. ce mois-ci vs le mois dernier).',
      'Cliquez sur un jour du calendrier pour aller directement au Bilan du jour de cette séance.',
      'Utilisez « Modifier les objectifs » dans l\'en-tête du tableau de bord pour changer vos cibles de performance.',
    ],
  },
  {
    name: 'Objectifs',
    icon: '🎯',
    description: "Cibles de performance modifiables pour chaque carte de KPI. Une barre de progression apparaît sous chaque métrique montrant à quel point vous êtes proche de votre objectif, et devient verte une fois atteint.",
    tips: [
      'Ouvrez le panneau Objectifs avec « Modifier les objectifs » dans l\'en-tête du tableau de bord.',
      'Les objectifs sont enregistrés par compte - vous pouvez définir des cibles différentes pour votre compte day trading et votre compte swing.',
      'Cibles par défaut : Taux de réussite 65%, Facteur de profit 1,5, Taux de réussite journalier 75%, Espérance 50$, Gain/Perte moyen 1,5.',
    ],
  },
  {
    name: 'Trades',
    icon: '📋',
    description: "Journal complet des trades avec filtrage par période, symbole, sens et stratégie. Cliquez sur une ligne pour ouvrir le détail des exécutions et le coaching généré par IA.",
    tips: [
      'Utilisez le filtre de dates pour isoler un setup ou une période précise.',
      "L'onglet de coaching IA dans chaque trade utilise le contexte de votre journal et fournit un retour spécifique.",
      'Les graphiques de trade s\'ouvrent sur le jour du trade 9h30-16h00 pour les intervalles 1m à 15m, le dernier mois pour 30m et 1H, et la dernière année pour journalier et hebdomadaire.',
      'Cliquez sur Achat, Vente, VWAP, SL ou Objectif au-dessus du graphique pour le masquer ou l\'afficher.',
    ],
  },
  {
    name: 'Calendrier',
    icon: '📅',
    description: 'Heatmap mensuelle avec P&L codé par couleur pour chaque jour. Totaux hebdomadaires et mensuels affichés dans les marges.',
    tips: [
      "Les jours verts sont profitables, les jours rouges sont des pertes. L'intensité de la teinte reflète l'ampleur.",
      'Cliquez sur un jour pour naviguer directement vers le Bilan du jour de cette séance.',
    ],
  },
  {
    name: 'Bilan du jour',
    icon: '📆',
    description: 'Analyse approfondie d\'une séance de trading. Montre tous les trades, le P&L individuel, le rapport de coaching IA quotidien, et le générateur de Résumé hebdomadaire.',
    tips: [
      "Le rapport de coaching IA note votre séance selon la qualité d'exécution, pas seulement le P&L.",
      'Utilisez le bouton Résumé hebdomadaire pour générer une synthèse comportementale inter-semaines (mise en cache après la première génération).',
      "La bannière Coupe-circuit apparaît automatiquement après 3 trades perdants consécutifs dans la séance.",
    ],
  },
  {
    name: 'Edge',
    icon: '🎯',
    description: 'Quatre graphiques analytiques comportementaux : Distribution du Multiple R, État émotionnel vs résultat, Fréquence des erreurs, et Durée de détention. Ces graphiques révèlent des schémas invisibles dans le P&L brut.',
    tips: [
      'Les données de Multiple R et d\'État émotionnel nécessitent de remplir les champs d\'analyse de chaque trade.',
      'La fréquence des erreurs provient à la fois du tagging IA du journal et des notes manuelles sur les trades.',
      'La Durée de détention est calculée automatiquement à partir des horodatages d\'exécution - aucune saisie manuelle nécessaire.',
    ],
  },
  {
    name: 'Importer',
    icon: '📤',
    description: "Importateur CSV pour les relevés de compte Thinkorswim et les relevés d'activité Interactive Brokers (IBKR). Choisissez le courtier dans la liste déroulante (ou laissez Détection automatique). Analyse automatiquement les exécutions, les regroupe en trades, et détecte les doublons en cas de réimport. Voir le README pour un prompt Claude Code qui ajoute n'importe quel autre courtier.",
    tips: [
      "Réimporter un fichier est sûr - les doublons sont détectés par groupe de trades et ignorés.",
      "Si vous avez supprimé un trade erroné et devez le réimporter, le réimport le restaurera proprement.",
    ],
  },
  {
    name: 'Stratégies',
    icon: '📊',
    description: 'P&L, taux de réussite et nombre de trades ventilés par nom de stratégie. Les noms de stratégie viennent de l\'analyse IA de votre journal.',
    tips: [
      'Importez des entrées de journal pour commencer à alimenter les données de stratégie.',
      'Les stratégies avec un P&L négatif sur 10+ trades sont des signaux pour réduire la taille ou arrêter ce setup.',
    ],
  },
  {
    name: 'Journal',
    icon: '📓',
    description: "Journal de trading alimenté par IA. Importez des notes manuscrites, des captures d'écran, ou du texte saisi. Claude extrait le setup, la raison d'entrée/sortie, l'état émotionnel, les erreurs, et le multiple R.",
    tips: [
      "Plus vous détaillez vos notes avant/après marché, meilleure sera l'extraction par l'IA.",
      'Les entrées de journal sont rapprochées des trades automatiquement par symbole et par date.',
    ],
  },
  {
    name: 'Réglages',
    icon: '⚙️',
    description: "Gérez les noms utilisés par le journal : stratégies avec descriptions, sources, et tags par type. Ajoutez, renommez, fusionnez les doublons ou supprimez. Rapports a un onglet Sources et Tags équivalent.",
    tips: [
      'Fusionner A dans B déplace tous les trades de A vers B. Si une analyse de journal ultérieure mentionne A, elle est enregistrée comme B.',
      'Supprimer un nom utilisé par des trades demande si vous voulez les réaffecter à un autre nom ou les laisser vides.',
    ],
  },
  {
    name: 'Brain',
    icon: '🧠',
    description: 'Chatbot IA avec le contexte complet de votre historique de trading. Posez n\'importe quelle question sur votre performance et vos schémas.',
    tips: [
      'Demandez : « Quel est mon setup le plus performant ? » ou « Quand ai-je tendance à faire du revenge trading ? »',
      "Brain a accès à tous vos trades, votre P&L et vos analyses - il répond à partir de vos données réelles, pas de conseils génériques.",
      'Ouvrez Brain depuis le bouton Brain dans l\'en-tête ou le bouton flottant Brain en bas à droite.',
    ],
  },
  {
    name: 'Résumé hebdomadaire',
    icon: '📝',
    description: "Synthèse comportementale générée par IA pour la semaine. Disponible comme carte dépliable dans le Bilan du jour. Identifie l'erreur dominante de la semaine, le point fort marquant, et une règle à retenir.",
    tips: [
      'Généré à la demande, mis en cache après la première génération.',
      'Idéalement lancé à la fin de la semaine de trading (vendredi) pour capturer la vue d\'ensemble.',
      'Utilisez « Forcer la régénération » pour obtenir une analyse fraîche si vous avez enregistré plus de trades ou d\'entrées de journal.',
    ],
  },
  {
    name: 'Coupe-circuit',
    icon: '🔶',
    description: 'Une bannière orange qui apparaît automatiquement dans le Bilan du jour quand vous avez 3 trades perdants consécutifs ou plus dans la séance en cours.',
    tips: [
      "Ce n'est pas un arrêt forcé - c'est une invitation à la pause. La recherche est claire sur ce point : une courte pause après 3 pertes réduit significativement le revenge trading.",
      "Fermez-la une fois que vous avez consciemment réévalué la situation et décidé de continuer.",
    ],
  },
];

function MetricCard({ item }) {
  return (
    <div className="help-card">
      <h4 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{item.name}</h4>
      <div className="help-formula">{item.formula}</div>
      <div style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 10, lineHeight: 1.55 }}>{item.description}</div>
      <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: item.target ? 10 : 0 }}>
        <span style={{ color: 'var(--accent-line)', fontWeight: 600 }}>Pourquoi c'est important : </span>{item.why}
      </div>
      {item.target && (
        <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Cible : </span>{item.target}
        </div>
      )}
    </div>
  );
}

function FeatureCard({ feature }) {
  return (
    <div className="help-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span className="help-icon" aria-hidden="true">{feature.icon}</span>
        <h4 style={{ fontWeight: 600, fontSize: 16 }}>{feature.name}</h4>
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.55, marginBottom: 10 }}>{feature.description}</div>
      {feature.tips.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {feature.tips.map((tip, i) => <li key={i}>{tip}</li>)}
        </ul>
      )}
    </div>
  );
}

export default function Help() {
  return (
    <div>
      <PageHeader
        title="Aide et référence"
        subtitle="Ce que signifie chaque métrique et où se trouve chaque fonctionnalité."
      />

      {METRICS.map(section => (
        <div key={section.category} style={{ marginBottom: 'var(--space-6)' }}>
          <h2 className="section-title" style={{ marginBottom: 12 }}>{section.category}</h2>
          <div className="help-grid">
            {section.items.map(item => <MetricCard key={item.name} item={item} />)}
          </div>
        </div>
      ))}

      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2 className="section-title" style={{ marginBottom: 12 }}>Fonctionnalités</h2>
        <div className="help-grid">
          {FEATURES.map(f => <FeatureCard key={f.name} feature={f} />)}
        </div>
      </div>
    </div>
  );
}

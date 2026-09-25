import { TemplateActivity, TemplateSheet } from '../types';

export interface EpsDatabaseExport {
  templateActivities: TemplateActivity[];
  templateSheets: TemplateSheet[];
}

export function generateEpsReferenceDatabase(): EpsDatabaseExport {
  const genId = () => Math.random().toString(36).substring(2, 9);

  // CA 1: Activités de la performance mesurée
  const demiFondId = 'tpl_ca1_demi_fond';
  const relaisVitesseId = 'tpl_ca1_relais';
  const natationId = 'tpl_ca1_natation';

  // CA 2: Activités d'adaptation en milieu variable
  const coId = 'tpl_ca2_co';
  const escaladeId = 'tpl_ca2_escalade';

  // CA 3: Activités artistiques et acrobatiques
  const acrosportId = 'tpl_ca3_acrosport';
  const gymnastiqueId = 'tpl_ca3_gym';
  const danseId = 'tpl_ca3_danse';

  // CA 4: Activités d'affrontement individuel ou collectif
  const badmintonId = 'tpl_ca4_badminton';
  const tennisTableId = 'tpl_ca4_tt';
  const sportsCoId = 'tpl_ca4_sportsco';

  // CA 5: Activités d'entretien et développement de soi
  const musculationId = 'tpl_ca5_musculation';
  const courseDureeId = 'tpl_ca5_cardio';

  const templateActivities: TemplateActivity[] = [
    // CA 1
    {
      id: demiFondId,
      name: 'Demi-Fond (1/2 Fond)',
      ca: 1,
      evaluationCriteria: [
        { id: genId(), label: 'Maîtrise de l\'allure visée (Régularité)', maxScore: 6, weight: 1 },
        { id: genId(), label: 'Niveau de performance chronométrique', maxScore: 8, weight: 1 },
        { id: genId(), label: 'Gestion de l\'effort & Fréquence cardiaque', maxScore: 4, weight: 1 },
        { id: genId(), label: 'Rôle d\'observateur et de co-pilote', maxScore: 2, weight: 1 }
      ]
    },
    {
      id: relaisVitesseId,
      name: 'Relais-Vitesse (50m / 4x50m)',
      ca: 1,
      evaluationCriteria: [
        { id: genId(), label: 'Vitesse individuelle lancée', maxScore: 8, weight: 1 },
        { id: genId(), label: 'Qualité et vitesse de transmission en zone', maxScore: 8, weight: 1 },
        { id: genId(), label: 'Sécurité et gestion du couloir', maxScore: 4, weight: 1 }
      ]
    },
    {
      id: natationId,
      name: 'Natation (Vitesse & Durée)',
      ca: 1,
      evaluationCriteria: [
        { id: genId(), label: 'Temps chronométré au 50m', maxScore: 8, weight: 1 },
        { id: genId(), label: 'Efficacité motrice (nombre de coups de bras)', maxScore: 6, weight: 1 },
        { id: genId(), label: 'Virages et coulées sécurisées', maxScore: 6, weight: 1 }
      ]
    },

    // CA 2
    {
      id: coId,
      name: 'Course d\'Orientation',
      ca: 2,
      evaluationCriteria: [
        { id: genId(), label: 'Nombre de postes poinçonnés validés', maxScore: 8, weight: 1 },
        { id: genId(), label: 'Respect de l\'horaire et gestion du temps', maxScore: 6, weight: 1 },
        { id: genId(), label: 'Choix des itinéraires & sécurité', maxScore: 6, weight: 1 }
      ]
    },
    {
      id: escaladeId,
      name: 'Escalade sur SAE',
      ca: 2,
      evaluationCriteria: [
        { id: genId(), label: 'Niveau des voies réussies', maxScore: 8, weight: 1 },
        { id: genId(), label: 'Sécurité et rigueur de l\'assurage', maxScore: 8, weight: 1 },
        { id: genId(), label: 'Fluidité, lecture et équilibre de grimpe', maxScore: 4, weight: 1 }
      ]
    },

    // CA 3
    {
      id: acrosportId,
      name: 'Acrosport',
      ca: 3,
      evaluationCriteria: [
        { id: genId(), label: 'Difficulté et tenue des pyramides (3s)', maxScore: 8, weight: 1 },
        { id: genId(), label: 'Sécurité, parades et montages/démontages', maxScore: 6, weight: 1 },
        { id: genId(), label: 'Liaisons chorégraphiques & synchronisation', maxScore: 6, weight: 1 }
      ]
    },
    {
      id: gymnastiqueId,
      name: 'Gymnastique au Sol',
      ca: 3,
      evaluationCriteria: [
        { id: genId(), label: 'Complexité des éléments gymniques', maxScore: 8, weight: 1 },
        { id: genId(), label: 'Exécution technique et tenue corporelle', maxScore: 8, weight: 1 },
        { id: genId(), label: 'Composition de l\'enchaînement et réceptions', maxScore: 4, weight: 1 }
      ]
    },
    {
      id: danseId,
      name: 'Danse & Arts du Cirque',
      ca: 3,
      evaluationCriteria: [
        { id: genId(), label: 'Composition chorégraphique et variété motrice', maxScore: 8, weight: 1 },
        { id: genId(), label: 'Interprétation, expressivité et musicalité', maxScore: 8, weight: 1 },
        { id: genId(), label: 'Prise de risque et cohésion collective', maxScore: 4, weight: 1 }
      ]
    },

    // CA 4
    {
      id: badmintonId,
      name: 'Badminton',
      ca: 4,
      evaluationCriteria: [
        { id: genId(), label: 'Rapport de force (victoires et score)', maxScore: 8, weight: 1 },
        { id: genId(), label: 'Variété des frappes et rupture de l\'échange', maxScore: 6, weight: 1 },
        { id: genId(), label: 'Placement, replacement et anticipation', maxScore: 4, weight: 1 },
        { id: genId(), label: 'Arbitrage et fair-play', maxScore: 2, weight: 1 }
      ]
    },
    {
      id: tennisTableId,
      name: 'Tennis de Table',
      ca: 4,
      evaluationCriteria: [
        { id: genId(), label: 'Efficacité en match et points gagnants', maxScore: 8, weight: 1 },
        { id: genId(), label: 'Régularité des échanges et fautes directes', maxScore: 6, weight: 1 },
        { id: genId(), label: 'Service, placement de balle et spin', maxScore: 4, weight: 1 },
        { id: genId(), label: 'Arbitrage rigoureux', maxScore: 2, weight: 1 }
      ]
    },
    {
      id: sportsCoId,
      name: 'Sports Collectifs (Basket / Hand / Foot / Volley)',
      ca: 4,
      evaluationCriteria: [
        { id: genId(), label: 'Efficacité offensive (tirs et passes décisives)', maxScore: 8, weight: 1 },
        { id: genId(), label: 'Comportement défensif et récupération de balle', maxScore: 6, weight: 1 },
        { id: genId(), label: 'Jeu sans ballon et circulation dans l\'espace', maxScore: 4, weight: 1 },
        { id: genId(), label: 'Respect des règles, esprit d\'équipe et arbitrage', maxScore: 2, weight: 1 }
      ]
    },

    // CA 5
    {
      id: musculationId,
      name: 'Musculation (Développement de soi)',
      ca: 5,
      evaluationCriteria: [
        { id: genId(), label: 'Conception du projet d\'entraînement (mobile visé)', maxScore: 6, weight: 1 },
        { id: genId(), label: 'Régularité d\'exécution et respect des charges/répétitions', maxScore: 8, weight: 1 },
        { id: genId(), label: 'Posture, respiration et sécurité de l\'athlète', maxScore: 4, weight: 1 },
        { id: genId(), label: 'Analyse critique du ressenti (RPE) et bilan', maxScore: 2, weight: 1 }
      ]
    },
    {
      id: courseDureeId,
      name: 'Course en Durée & Cardio-Training',
      ca: 5,
      evaluationCriteria: [
        { id: genId(), label: 'Respect du projet de course et temps d\'effort continu', maxScore: 8, weight: 1 },
        { id: genId(), label: 'Zone cible de Fréquence Cardiaque', maxScore: 6, weight: 1 },
        { id: genId(), label: 'Régularité des allures et gestion de l\'essoufflement', maxScore: 4, weight: 1 },
        { id: genId(), label: 'Bilan de santé et auto-évaluation', maxScore: 2, weight: 1 }
      ]
    }
  ];

  const templateSheets: TemplateSheet[] = [
    // 1/2 Fond
    {
      id: genId(),
      templateActivityId: demiFondId,
      name: '30"/30" (Vitesse et FC)',
      fields: [
        { id: genId(), label: 'FC Avant Échauffement', type: 'number' },
        { id: genId(), label: 'FC Après Échauffement', type: 'number' },
        { id: genId(), label: 'Distance sur 30" (m)', type: 'speed_30s' },
        { id: genId(), label: 'FC Fin de séance', type: 'number' }
      ]
    },
    {
      id: genId(),
      templateActivityId: demiFondId,
      name: 'Allure et Temps Chronométré',
      fields: [
        { 
          id: genId(), 
          label: 'Temps Chronométré réalisé', 
          type: 'time_duration', 
          options: { units: ['minutes', 'seconds'], targetDuration: 360 } 
        },
        { id: genId(), label: 'Régularité de l\'allure (1 à 5)', type: 'rating' },
        { id: genId(), label: 'Nombre de tours de piste validés', type: 'counter' },
        { id: genId(), label: 'Projet d\'allure atteint', type: 'boolean' }
      ]
    },
    {
      id: genId(),
      templateActivityId: demiFondId,
      name: 'Test VMA / Course continue',
      fields: [
        { id: genId(), label: 'Palier ou Vitesse VMA (km/h)', type: 'number' },
        { 
          id: genId(), 
          label: 'Temps de maintien continu', 
          type: 'time_duration', 
          options: { units: ['minutes', 'seconds'] } 
        },
        { id: genId(), label: 'FC Maximale enregistrée', type: 'number' }
      ]
    },

    // Relais
    {
      id: genId(),
      templateActivityId: relaisVitesseId,
      name: 'Transmission en zone 20m',
      fields: [
        { id: genId(), label: 'Transmission réussie dans la zone', type: 'boolean' },
        { id: genId(), label: 'Perte de vitesse constatée', type: 'rating' },
        { 
          id: genId(), 
          label: 'Temps sur 50m lancé', 
          type: 'time_duration', 
          options: { units: ['seconds'] } 
        },
        { id: genId(), label: 'Témoin échappé ou tombé', type: 'boolean' }
      ]
    },
    {
      id: genId(),
      templateActivityId: relaisVitesseId,
      name: 'Chronomètre 4x50m Relais',
      fields: [
        { 
          id: genId(), 
          label: 'Temps Total Relais', 
          type: 'time_duration', 
          options: { units: ['minutes', 'seconds'] } 
        },
        { id: genId(), label: 'Fautes de passage de couloir', type: 'counter' },
        { id: genId(), label: 'Projet de performance battu', type: 'boolean' }
      ]
    },

    // Natation
    {
      id: genId(),
      templateActivityId: natationId,
      name: '50m Vitesse & Efficacité',
      fields: [
        { 
          id: genId(), 
          label: 'Chrono 50m Nage Libre', 
          type: 'time_duration', 
          options: { units: ['minutes', 'seconds'] } 
        },
        { id: genId(), label: 'Nombre de coups de bras', type: 'counter' },
        { id: genId(), label: 'Coulée de 5m respectée', type: 'boolean' },
        { id: genId(), label: 'Respiration maîtrisée', type: 'rating' }
      ]
    },
    {
      id: genId(),
      templateActivityId: natationId,
      name: 'Nage continue en durée',
      fields: [
        { 
          id: genId(), 
          label: 'Durée continue nagée', 
          type: 'time_duration', 
          options: { units: ['hours', 'minutes', 'seconds'] } 
        },
        { id: genId(), label: 'Nombre de longueurs (25m)', type: 'counter' },
        { id: genId(), label: 'Distance totale estimée (m)', type: 'number' }
      ]
    },

    // Course d'Orientation
    {
      id: genId(),
      templateActivityId: coId,
      name: 'Parcours en Étoile',
      fields: [
        { 
          id: genId(), 
          label: 'Balises trouvées', 
          type: 'orienteering_star', 
          options: { baliseCount: 10 } 
        },
        { 
          id: genId(), 
          label: 'Temps retour limite (5 min)', 
          type: 'time_duration', 
          options: { units: ['minutes', 'seconds'], targetDuration: 300 } 
        },
        { id: genId(), label: 'Retour avant le bip final', type: 'boolean' }
      ]
    },
    {
      id: genId(),
      templateActivityId: coId,
      name: 'Circuit au Score Chronométré',
      fields: [
        { id: genId(), label: 'Points de balises cumulés', type: 'counter' },
        { 
          id: genId(), 
          label: 'Temps de course réalisé', 
          type: 'time_duration', 
          options: { units: ['hours', 'minutes', 'seconds'] } 
        },
        { id: genId(), label: 'Pénalité minutes de retard', type: 'counter' },
        { id: genId(), label: 'Poinçons erreurs', type: 'counter' }
      ]
    },

    // Escalade
    {
      id: genId(),
      templateActivityId: escaladeId,
      name: 'Moulinette & Voie en difficulté',
      fields: [
        { id: genId(), label: 'Cotation / Niveau de voie', type: 'rating' },
        { id: genId(), label: 'Nombre de chutes ou repos', type: 'counter' },
        { id: genId(), label: 'Sommet atteint (Top)', type: 'boolean' },
        { id: genId(), label: 'Sécurité de l\'assurage (5 temps)', type: 'boolean' },
        { 
          id: genId(), 
          label: 'Temps de montée', 
          type: 'time_duration', 
          options: { units: ['minutes', 'seconds'] } 
        }
      ]
    },

    // Acrosport
    {
      id: genId(),
      templateActivityId: acrosportId,
      name: 'Validation des Pyramides',
      fields: [
        { id: genId(), label: 'Pyramides statiques validées (3s)', type: 'counter' },
        { id: genId(), label: 'Pyramides dynamiques validées', type: 'counter' },
        { id: genId(), label: 'Parade active assurée', type: 'boolean' },
        { id: genId(), label: 'Qualité du gainage et de l\'alignement', type: 'rating' }
      ]
    },
    {
      id: genId(),
      templateActivityId: acrosportId,
      name: 'Enchaînement Chorégraphique',
      fields: [
        { id: genId(), label: 'Évaluation artistique globale', type: 'artistic_rating' },
        { 
          id: genId(), 
          label: 'Durée de la prestation', 
          type: 'time_duration', 
          options: { units: ['minutes', 'seconds'], targetDuration: 90 } 
        },
        { id: genId(), label: 'Fluidité des transitions', type: 'rating' }
      ]
    },

    // Gymnastique
    {
      id: genId(),
      templateActivityId: gymnastiqueId,
      name: 'Enchaînement au Sol',
      fields: [
        { id: genId(), label: 'Éléments de difficulté validés', type: 'counter' },
        { id: genId(), label: 'Pénalités d\'exécution / déséquilibres', type: 'counter' },
        { id: genId(), label: 'Tenue du corps (pointes, gainage)', type: 'rating' },
        { id: genId(), label: 'Réception finale stabilisée', type: 'boolean' }
      ]
    },

    // Danse
    {
      id: genId(),
      templateActivityId: danseId,
      name: 'Prestation Collective',
      fields: [
        { id: genId(), label: 'Note artistique et créative', type: 'artistic_rating' },
        { id: genId(), label: 'Synchronisation et écoute du groupe', type: 'rating' },
        { 
          id: genId(), 
          label: 'Durée chorégraphiée', 
          type: 'time_duration', 
          options: { units: ['minutes', 'seconds'] } 
        }
      ]
    },

    // Badminton
    {
      id: genId(),
      templateActivityId: badmintonId,
      name: 'Match Standard',
      fields: [
        { id: genId(), label: 'Points marqués', type: 'counter' },
        { id: genId(), label: 'Fautes directes concédées', type: 'counter' },
        { id: genId(), label: 'Match gagné', type: 'boolean' }
      ]
    },
    {
      id: genId(),
      templateActivityId: badmintonId,
      name: 'Zones & Rupture d\'échange',
      fields: [
        { id: genId(), label: 'Attaques gagnantes (Smash / Amorti)', type: 'counter' },
        { id: genId(), label: 'Dégagés de fond de court réussis', type: 'counter' },
        { id: genId(), label: 'Fautes de service', type: 'counter' },
        { id: genId(), label: 'Capacité à faire courir l\'adversaire', type: 'rating' }
      ]
    },

    // Tennis de Table
    {
      id: genId(),
      templateActivityId: tennisTableId,
      name: 'Match de Simple',
      fields: [
        { id: genId(), label: 'Points gagnants', type: 'counter' },
        { id: genId(), label: 'Fautes de filet / dehors', type: 'counter' },
        { id: genId(), label: 'Services réguliers réussis', type: 'counter' },
        { id: genId(), label: 'Victoire de manche', type: 'boolean' }
      ]
    },

    // Sports Collectifs
    {
      id: genId(),
      templateActivityId: sportsCoId,
      name: 'Efficacité Tirs & Ballons',
      fields: [
        { id: genId(), label: 'Tirs / Paniers marqués', type: 'counter' },
        { id: genId(), label: 'Tirs non cadrés ou arrêtés', type: 'counter' },
        { id: genId(), label: 'Passes décisives', type: 'counter' },
        { id: genId(), label: 'Pertes de balle', type: 'counter' }
      ]
    },
    {
      id: genId(),
      templateActivityId: sportsCoId,
      name: 'Match d\'Équipe',
      fields: [
        { id: genId(), label: 'Score équipe', type: 'counter' },
        { id: genId(), label: 'Score adverse', type: 'counter' },
        { id: genId(), label: 'Victoire', type: 'boolean' },
        { id: genId(), label: 'Implication et esprit d\'équipe', type: 'rating' }
      ]
    },

    // Musculation
    {
      id: genId(),
      templateActivityId: musculationId,
      name: 'Série & Récupération',
      fields: [
        { id: genId(), label: 'Charge de travail (kg)', type: 'number' },
        { id: genId(), label: 'Répétitions effectuées', type: 'counter' },
        { 
          id: genId(), 
          label: 'Temps de récupération chronométré', 
          type: 'time_duration', 
          options: { units: ['minutes', 'seconds'], targetDuration: 90 } 
        },
        { id: genId(), label: 'Ressenti d\'effort RPE (1 à 10)', type: 'counter' },
        { id: genId(), label: 'Placement du dos et sécurité validés', type: 'boolean' }
      ]
    },
    {
      id: genId(),
      templateActivityId: musculationId,
      name: 'Carnet d\'entraînement complet',
      fields: [
        { id: genId(), label: 'Suivi de séance & Volume', type: 'training_log' }
      ]
    },

    // Course en durée
    {
      id: genId(),
      templateActivityId: courseDureeId,
      name: 'Course continue en aérobie',
      fields: [
        { 
          id: genId(), 
          label: 'Temps de course continue chronométré', 
          type: 'time_duration', 
          options: { units: ['hours', 'minutes', 'seconds'] } 
        },
        { id: genId(), label: 'FC Avant le départ', type: 'number' },
        { id: genId(), label: 'FC À l\'arrivée', type: 'number' },
        { id: genId(), label: 'Régularité de foulée et d\'allure', type: 'rating' },
        { id: genId(), label: 'Contrat de temps rempli', type: 'boolean' }
      ]
    }
  ];

  return { templateActivities, templateSheets };
}

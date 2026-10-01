import { Activity, ClassGroup, EvaluationCriterion, ObservationRecord, CriterionLevel, Session } from '../types';
export { 
  formatSecondsToMMSS, 
  parseMMSSToSeconds, 
  calculateWalkingTimeSeconds, 
  calculateRunningSpeedKmH 
} from '../components/RunningExactTime';

export interface StudentEvaluationSummary {
  studentId: string;
  studentName: string;
  status: 'present' | 'absent' | 'dispense' | 'not_evaluated';
  scores: Record<string, number | string>; // criterionId -> score | 'A' | 'D'
  totalWeightedScore: number;
  maxWeightedScore: number;
  scoreOn20: number | null;
  appreciation: string;
  competenceLevel: {
    level: 1 | 2 | 3 | 4;
    label: string;
    shortLabel: string;
    colorClass: string;
    bgClass: string;
    borderClass: string;
  };
}

export interface ClassEvaluationStatistics {
  totalStudents: number;
  evaluatedStudents: number;
  absentStudents: number;
  dispenseStudents: number;
  classAverageOn20: number | null;
  minNoteOn20: number | null;
  maxNoteOn20: number | null;
  successRate: number; // % >= 10/20
  criteriaAverages: Record<string, { avg: number; max: number; count: number }>;
  distribution: {
    under8: number;
    from8to10: number;
    from10to12: number;
    from12to14: number;
    from14to16: number;
    above16: number;
  };
  competenceCounts: {
    insufficient: number;
    fragile: number;
    satisfactory: number;
    veryGood: number;
  };
}

/**
 * Niveaux officiels de maîtrise du socle commun EPS (Eduscol)
 */
export function getCompetenceLevel(scoreOn20: number | null) {
  if (scoreOn20 === null) {
    return {
      level: 1 as const,
      label: 'Non évalué',
      shortLabel: 'N.E.',
      colorClass: 'text-slate-500',
      bgClass: 'bg-slate-100',
      borderClass: 'border-slate-200'
    };
  }

  if (scoreOn20 < 8) {
    return {
      level: 1 as const,
      label: 'Maîtrise insuffisante',
      shortLabel: 'Niveau 1',
      colorClass: 'text-red-700',
      bgClass: 'bg-red-50',
      borderClass: 'border-red-200'
    };
  }
  if (scoreOn20 < 12) {
    return {
      level: 2 as const,
      label: 'Maîtrise fragile',
      shortLabel: 'Niveau 2',
      colorClass: 'text-amber-700',
      bgClass: 'bg-amber-50',
      borderClass: 'border-amber-200'
    };
  }
  if (scoreOn20 < 16) {
    return {
      level: 3 as const,
      label: 'Maîtrise satisfaisante',
      shortLabel: 'Niveau 3',
      colorClass: 'text-emerald-700',
      bgClass: 'bg-emerald-50',
      borderClass: 'border-emerald-200'
    };
  }
  return {
    level: 4 as const,
    label: 'Très bonne maîtrise',
    shortLabel: 'Niveau 4',
    colorClass: 'text-indigo-700',
    bgClass: 'bg-indigo-50',
    borderClass: 'border-indigo-200'
  };
}

/**
 * Calcule le résumé d'évaluation pour un élève
 */
export function calculateStudentEvaluation(
  studentId: string,
  studentName: string,
  criteria: EvaluationCriterion[],
  gradesMap?: Record<string, number | string>,
  appreciation?: string
): StudentEvaluationSummary {
  const scores: Record<string, number | string> = {};
  let totalWeighted = 0;
  let maxWeighted = 0;
  let numericEvaluatedCount = 0;
  let aCount = 0;
  let dCount = 0;

  criteria.forEach(crit => {
    const rawVal = gradesMap?.[crit.id];
    const weight = Number(crit.weight) || 1;
    const max = Number(crit.maxScore) || 20;

    if (rawVal === 'A' || rawVal === 'a') {
      scores[crit.id] = 'A';
      aCount++;
    } else if (rawVal === 'D' || rawVal === 'd') {
      scores[crit.id] = 'D';
      dCount++;
    } else if (typeof rawVal === 'number' || (!isNaN(Number(rawVal)) && rawVal !== '' && rawVal !== null && rawVal !== undefined)) {
      const num = Math.min(max, Math.max(0, Number(rawVal)));
      scores[crit.id] = num;
      totalWeighted += num * weight;
      maxWeighted += max * weight;
      numericEvaluatedCount++;
    } else {
      scores[crit.id] = '';
    }
  });

  let status: 'present' | 'absent' | 'dispense' | 'not_evaluated' = 'not_evaluated';
  if (criteria.length > 0 && aCount === criteria.length) {
    status = 'absent';
  } else if (criteria.length > 0 && dCount === criteria.length) {
    status = 'dispense';
  } else if (numericEvaluatedCount > 0) {
    status = 'present';
  }

  let scoreOn20: number | null = null;
  if (maxWeighted > 0 && numericEvaluatedCount > 0) {
    scoreOn20 = Math.round((totalWeighted / maxWeighted) * 20 * 10) / 10;
  }

  return {
    studentId,
    studentName,
    status,
    scores,
    totalWeightedScore: Math.round(totalWeighted * 10) / 10,
    maxWeightedScore: Math.round(maxWeighted * 10) / 10,
    scoreOn20,
    appreciation: appreciation || '',
    competenceLevel: getCompetenceLevel(scoreOn20)
  };
}

/**
 * Calcule les statistiques complètes de la classe pour cette évaluation
 */
export function calculateClassEvaluationStatistics(
  summaries: StudentEvaluationSummary[],
  criteria: EvaluationCriterion[]
): ClassEvaluationStatistics {
  const totalStudents = summaries.length;
  const evaluated = summaries.filter(s => s.scoreOn20 !== null);
  const evaluatedStudents = evaluated.length;
  const absentStudents = summaries.filter(s => s.status === 'absent').length;
  const dispenseStudents = summaries.filter(s => s.status === 'dispense').length;

  let sum = 0;
  let minNote: number | null = null;
  let maxNote: number | null = null;
  let successCount = 0;

  const distribution = {
    under8: 0,
    from8to10: 0,
    from10to12: 0,
    from12to14: 0,
    from14to16: 0,
    above16: 0
  };

  const competenceCounts = {
    insufficient: 0,
    fragile: 0,
    satisfactory: 0,
    veryGood: 0
  };

  evaluated.forEach(s => {
    const n = s.scoreOn20!;
    sum += n;
    if (minNote === null || n < minNote) minNote = n;
    if (maxNote === null || n > maxNote) maxNote = n;
    if (n >= 10) successCount++;

    if (n < 8) distribution.under8++;
    else if (n < 10) distribution.from8to10++;
    else if (n < 12) distribution.from10to12++;
    else if (n < 14) distribution.from12to14++;
    else if (n < 16) distribution.from14to16++;
    else distribution.above16++;

    if (s.competenceLevel.level === 1) competenceCounts.insufficient++;
    else if (s.competenceLevel.level === 2) competenceCounts.fragile++;
    else if (s.competenceLevel.level === 3) competenceCounts.satisfactory++;
    else competenceCounts.veryGood++;
  });

  const classAverageOn20 = evaluatedStudents > 0 ? Math.round((sum / evaluatedStudents) * 10) / 10 : null;
  const successRate = evaluatedStudents > 0 ? Math.round((successCount / evaluatedStudents) * 100) : 0;

  const criteriaAverages: Record<string, { avg: number; max: number; count: number }> = {};
  criteria.forEach(crit => {
    let cSum = 0;
    let cCount = 0;
    summaries.forEach(s => {
      const v = s.scores[crit.id];
      if (typeof v === 'number') {
        cSum += v;
        cCount++;
      }
    });
    criteriaAverages[crit.id] = {
      avg: cCount > 0 ? Math.round((cSum / cCount) * 10) / 10 : 0,
      max: crit.maxScore,
      count: cCount
    };
  });

  return {
    totalStudents,
    evaluatedStudents,
    absentStudents,
    dispenseStudents,
    classAverageOn20,
    minNoteOn20: minNote,
    maxNoteOn20: maxNote,
    successRate,
    criteriaAverages,
    distribution,
    competenceCounts
  };
}

/**
 * Récupère ou génère les 4 paliers d'observation (« Ce qui est fait ») pour un critère
 * Transforme automatiquement chaque palier en note chiffrée selon le barème maxScore
 */
export function getCriterionLevels(criterion: EvaluationCriterion): CriterionLevel[] {
  if (criterion.levels && criterion.levels.length === 4) {
    return criterion.levels;
  }

  const max = Number(criterion.maxScore) || 20;
  const p1 = Math.round(max * 0.25 * 2) / 2;
  const p2 = Math.round(max * 0.50 * 2) / 2;
  const p3 = Math.round(max * 0.75 * 2) / 2;
  const p4 = max;

  return [
    {
      level: 1,
      label: 'Maîtrise insuffisante',
      descriptor: `Non acquis / Discontinu : L'élève est en difficulté sur « ${criterion.label} ». L'effort est heurté, interrompu ou non maîtrisé.`,
      points: p1
    },
    {
      level: 2,
      label: 'Maîtrise fragile',
      descriptor: `En cours d'acquisition : Réalisation partielle de « ${criterion.label} ». Des erreurs techniques ou des arrêts ponctuels sont observés.`,
      points: p2
    },
    {
      level: 3,
      label: 'Maîtrise satisfaisante',
      descriptor: `Acquis / Attendu du cycle : L'élève réalise « ${criterion.label} » avec régularité, continuité et respect des règles et contrats.`,
      points: p3
    },
    {
      level: 4,
      label: 'Très bonne maîtrise',
      descriptor: `Dépassé / Remarquable : Réalisation fluide, efficiente et autonome sur « ${criterion.label} ». Rôle moteur et capacité à analyser sa pratique.`,
      points: p4
    }
  ];
}

/**
 * Suggestions de critères par défaut selon le Champ d'Apprentissage (CA) ou l'activité
 * Chaque critère intègre ses 4 paliers d'observation concrets (« Ce qui est fait »)
 * et leurs points calculés selon le barème officiel
 */
export function getDefaultCriteriaForCa(ca?: number, activityName?: string): EvaluationCriterion[] {
  const genId = () => Math.random().toString(36).substring(2, 9);
  
  const isDemiFond = (activityName && (
    activityName.toLowerCase().includes('demi') || 
    activityName.toLowerCase().includes('fond') || 
    activityName.toLowerCase().includes('temps juste') ||
    activityName.toLowerCase().includes('course')
  )) || ca === 1;

  if (isDemiFond) {
    return [
      { 
        id: genId(), 
        label: 'Régularité & Allure (Temps de Marche TM < 30s)', 
        maxScore: 6, 
        weight: 1, 
        description: 'Continuité de course sans marcher sur les 4 blocs de 5 min (TM total < 30s = 6 pts, profil Adaptatif = 4.5 pts, Sur-estimé = 2.5 pts)',
        levels: [
          { level: 1, label: 'Maîtrise insuffisante', descriptor: 'Sur-estimé / Arrêts répétés : Marche totale > 2 min sur les 4 blocs, allure heurtée, contrat non tenu.', points: 2.5 },
          { level: 2, label: 'Maîtrise fragile', descriptor: 'Prudent / Irrégulier : Marche cumulée entre 1 et 2 min, difficulté à maintenir l\'allure de course.', points: 3.5 },
          { level: 3, label: 'Maîtrise satisfaisante', descriptor: 'Adaptatif / Régulé : Marche cumulée entre 30s et 1 min, relances efficaces pour terminer l\'effort.', points: 4.5 },
          { level: 4, label: 'Très bonne maîtrise', descriptor: 'Régulier / Continu : Marche totale < 30s (ou 0s), course continue aisée sur les 4 blocs de 5 min.', points: 6.0 }
        ]
      },
      { 
        id: genId(), 
        label: 'Performance & Vitesse réelle de course (km/h)', 
        maxScore: 8, 
        weight: 1, 
        description: 'Distance totale cumulée et vitesse réelle effective de course calculée sur le Temps de Course Effectif (TCE)',
        levels: [
          { level: 1, label: 'Maîtrise insuffisante', descriptor: 'Vitesse de course faible (< 8 km/h), allure assimilable à de la marche rapide.', points: 2.0 },
          { level: 2, label: 'Maîtrise fragile', descriptor: 'Vitesse modérée (8 à 10.5 km/h), maintien de l\'effort difficile.', points: 4.0 },
          { level: 3, label: 'Maîtrise satisfaisante', descriptor: 'Vitesse soutenue (10.5 à 13 km/h), allure de course effective stabilisée.', points: 6.0 },
          { level: 4, label: 'Très bonne maîtrise', descriptor: 'Vitesse élevée (> 13 km/h), engagement moteur optimal sur les 20 min d\'épreuve.', points: 8.0 }
        ]
      },
      { 
        id: genId(), 
        label: 'Lucidité & Régulation du contrat visé', 
        maxScore: 4, 
        weight: 1, 
        description: 'Alerte sur-régime détectée (TM > 30s) : Choix d\'adaptation du contrat (Maintien ou Réduction) pour terminer l\'effort',
        levels: [
          { level: 1, label: 'Maîtrise insuffisante', descriptor: 'Ne réagit pas à l\'essoufflement, s\'obstine sur un contrat irréaliste et finit épuisé.', points: 1.0 },
          { level: 2, label: 'Maîtrise fragile', descriptor: 'Réaction tardive face à la fatigue, ajustement du contrat mal calibré.', points: 2.0 },
          { level: 3, label: 'Maîtrise satisfaisante', descriptor: 'Alerte sur-régime prise en compte : réduction lucide du contrat pour terminer l\'effort.', points: 3.0 },
          { level: 4, label: 'Très bonne maîtrise', descriptor: 'Anticipation remarquable de ses capacités, contrat initial parfaitement tenu ou régulé avec précision.', points: 4.0 }
        ]
      },
      { 
        id: genId(), 
        label: 'Rôle d\'élève-observateur & co-pilote', 
        maxScore: 2, 
        weight: 1, 
        description: 'Chronométrage rigoureux (TCE), calcul des temps de marche et accompagnement lucide apporté au coureur',
        levels: [
          { level: 1, label: 'Maîtrise insuffisante', descriptor: 'Distrait, relevés incomplets, temps de course ou de marche non chronométrés.', points: 0.5 },
          { level: 2, label: 'Maîtrise fragile', descriptor: 'Chronométrage avec l\'aide de l\'enseignant, calculs approximatifs.', points: 1.0 },
          { level: 3, label: 'Maîtrise satisfaisante', descriptor: 'Chronométrage rigoureux (TCE), calcul exact des temps de marche et annonce des passages.', points: 1.5 },
          { level: 4, label: 'Très bonne maîtrise', descriptor: 'Co-pilote exemplaire : encouragements soutenus, conseil stratégique pertinent et fiche impeccable.', points: 2.0 }
        ]
      }
    ];
  }

  switch (ca) {
    case 2:
      return [
        { 
          id: genId(), 
          label: 'Validation des balises / Voies réussies', 
          maxScore: 8, 
          weight: 1, 
          description: 'Nombre de postes poinçonnés ou cotation des voies réussies',
          levels: [
            { level: 1, label: 'Maîtrise insuffisante', descriptor: 'Moins de 35% de réussite, échec sur les premières balises ou premières voies.', points: 2.0 },
            { level: 2, label: 'Maîtrise fragile', descriptor: '35% à 60% de réussite, réussite sur des parcours ou voies guidées uniquement.', points: 4.0 },
            { level: 3, label: 'Maîtrise satisfaisante', descriptor: '60% à 85% de réussite dans les temps impartis, voies de niveau attendu validées.', points: 6.0 },
            { level: 4, label: 'Très bonne maîtrise', descriptor: 'Plus de 85% de réussite, parcours optimisé ou voies complexes réussies en fluidité.', points: 8.0 }
          ]
        },
        { 
          id: genId(), 
          label: 'Respect de la sécurité & Protocoles', 
          maxScore: 6, 
          weight: 1, 
          description: 'Règles de sécurité, parade, assurage et respect du temps limite',
          levels: [
            { level: 1, label: 'Maîtrise insuffisante', descriptor: 'Règles de sécurité enfreintes, mise en danger ou retour hors temps limite.', points: 1.5 },
            { level: 2, label: 'Maîtrise fragile', descriptor: 'Sécurité respectée seulement après intervention ou rappel de l\'enseignant.', points: 3.0 },
            { level: 3, label: 'Maîtrise satisfaisante', descriptor: 'Respect strict et autonome des consignes de sécurité, de parade ou d\'assurage.', points: 4.5 },
            { level: 4, label: 'Très bonne maîtrise', descriptor: 'Vigilance active constante, sécurisation de soi et de ses partenaires, zéro faute.', points: 6.0 }
          ]
        },
        { 
          id: genId(), 
          label: 'Choix d\'itinéraires & Stratégie', 
          maxScore: 6, 
          weight: 1, 
          description: 'Fluidité, lecture du milieu et adaptation face aux imprévus',
          levels: [
            { level: 1, label: 'Maîtrise insuffisante', descriptor: 'Déplacements au hasard, hésitations permanentes, pas de lecture de carte ou de prise.', points: 1.5 },
            { level: 2, label: 'Maîtrise fragile', descriptor: 'Choix hésitants, arrêts fréquents, difficulté à anticiper le tracé.', points: 3.0 },
            { level: 3, label: 'Maîtrise satisfaisante', descriptor: 'Choix d\'itinéraires logiques (lignes directrices, points d\'attaque, lecture de voie).', points: 4.5 },
            { level: 4, label: 'Très bonne maîtrise', descriptor: 'Anticipation remarquable du milieu, rythme fluide et adaptation immédiate aux imprévus.', points: 6.0 }
          ]
        }
      ];
    case 3:
      return [
        { 
          id: genId(), 
          label: 'Difficulté et variété technique', 
          maxScore: 8, 
          weight: 1, 
          description: 'Éléments techniques maîtrisés, pyramides ou figures présentées',
          levels: [
            { level: 1, label: 'Maîtrise insuffisante', descriptor: 'Éléments techniques instables, pyramides ou figures non tenues (< 3s).', points: 2.0 },
            { level: 2, label: 'Maîtrise fragile', descriptor: 'Figures simples réussies mais manque de variété et instabilités motrices.', points: 4.0 },
            { level: 3, label: 'Maîtrise satisfaisante', descriptor: 'Figures conformes au niveau du cycle, tenues stabilisées 3s sans trembler.', points: 6.0 },
            { level: 4, label: 'Très bonne maîtrise', descriptor: 'Difficulté motrice élevée, propreté technique et variété des éléments présentés.', points: 8.0 }
          ]
        },
        { 
          id: genId(), 
          label: 'Composition & Synchronisation', 
          maxScore: 6, 
          weight: 1, 
          description: 'Liaisons, fluidité, occupation de l\'espace et coordination du groupe',
          levels: [
            { level: 1, label: 'Maîtrise insuffisante', descriptor: 'Juxtaposition d\'éléments sans liaison, désynchronisation et hésitations.', points: 1.5 },
            { level: 2, label: 'Maîtrise fragile', descriptor: 'Liaisons simples, synchronisation approximative avec des temps morts.', points: 3.0 },
            { level: 3, label: 'Maîtrise satisfaisante', descriptor: 'Enchaînement fluide, utilisation réfléchie de l\'espace et coordination collective.', points: 4.5 },
            { level: 4, label: 'Très bonne maîtrise', descriptor: 'Composition originale, synchronisation millimétrée et transitions chorégraphiques riches.', points: 6.0 }
          ]
        },
        { 
          id: genId(), 
          label: 'Interprétation & Expressivité', 
          maxScore: 6, 
          weight: 1, 
          description: 'Tenue corporelle, regard, émotion et réception stabilisée',
          levels: [
            { level: 1, label: 'Maîtrise insuffisante', descriptor: 'Regard fuyant, relâchement postural, posture passive.', points: 1.5 },
            { level: 2, label: 'Maîtrise fragile', descriptor: 'Tenue corporelle correcte par intermittence, peu d\'intention expressive.', points: 3.0 },
            { level: 3, label: 'Maîtrise satisfaisante', descriptor: 'Posture tonique, regard orienté vers le public/jury, fin d\'enchaînement affirmée.', points: 4.5 },
            { level: 4, label: 'Très bonne maîtrise', descriptor: 'Présence scénique remarquable, expressivité et musicalité captivantes.', points: 6.0 }
          ]
        }
      ];
    case 4:
      return [
        { 
          id: genId(), 
          label: 'Efficacité dans le rapport de force', 
          maxScore: 8, 
          weight: 1, 
          description: 'Score de match, points gagnés et rupture de l\'échange',
          levels: [
            { level: 1, label: 'Maîtrise insuffisante', descriptor: 'Subit les échanges, nombreuses fautes directes, score très défavorable.', points: 2.0 },
            { level: 2, label: 'Maîtrise fragile', descriptor: 'Renvoie au centre de manière neutre sans menacer l\'adversaire.', points: 4.0 },
            { level: 3, label: 'Maîtrise satisfaisante', descriptor: 'Vise les zones libres, provoque la faute adverse, victoires régulières en match.', points: 6.0 },
            { level: 4, label: 'Très bonne maîtrise', descriptor: 'Domine le jeu, variations de frappes (amorti/smash/passes), ratio victoires élevé.', points: 8.0 }
          ]
        },
        { 
          id: genId(), 
          label: 'Choix tactiques & Prise de décision', 
          maxScore: 6, 
          weight: 1, 
          description: 'Jeu dans les espaces libres, variété des trajectoires et passes',
          levels: [
            { level: 1, label: 'Maîtrise insuffisante', descriptor: 'Jeu précipité, sans intention tactique, choix souvent contraires au jeu.', points: 1.5 },
            { level: 2, label: 'Maîtrise fragile', descriptor: 'Intention de jouer dans les espaces libres mais réalisation motrice imprécise.', points: 3.0 },
            { level: 3, label: 'Maîtrise satisfaisante', descriptor: 'Alternance efficace court/long ou gauche/droite, jeu adapté au placement adverse.', points: 4.5 },
            { level: 4, label: 'Très bonne maîtrise', descriptor: 'Anticipation tactique permanente, feintes de frappes et gestion lucide du score.', points: 6.0 }
          ]
        },
        { 
          id: genId(), 
          label: 'Placement, replacement & Défense', 
          maxScore: 4, 
          weight: 1, 
          description: 'Anticipation, repli défensif et attitude active',
          levels: [
            { level: 1, label: 'Maîtrise insuffisante', descriptor: 'Reste statique après avoir joué la balle/volant, passif en phase défensive.', points: 1.0 },
            { level: 2, label: 'Maîtrise fragile', descriptor: 'Replacement tardif, souvent pris à contre-pied sur les retours adverses.', points: 2.0 },
            { level: 3, label: 'Maîtrise satisfaisante', descriptor: 'Replacement dynamique au centre après chaque action, posture active.', points: 3.0 },
            { level: 4, label: 'Très bonne maîtrise', descriptor: 'Déplacements vifs, couverture complète du terrain et jeu de jambes irréprochable.', points: 4.0 }
          ]
        },
        { 
          id: genId(), 
          label: 'Arbitrage et esprit d\'équipe', 
          maxScore: 2, 
          weight: 1, 
          description: 'Rôle d\'arbitre officiel, tenue de la feuille et fair-play',
          levels: [
            { level: 1, label: 'Maîtrise insuffisante', descriptor: 'Méconnaissance des règles, contestations ou refus d\'arbitrer.', points: 0.5 },
            { level: 2, label: 'Maîtrise fragile', descriptor: 'Arbitrage hésitant nécessitant les interventions de l\'enseignant.', points: 1.0 },
            { level: 3, label: 'Maîtrise satisfaisante', descriptor: 'Arbitrage sérieux, annonce claire du score et respect des décisions.', points: 1.5 },
            { level: 4, label: 'Très bonne maîtrise', descriptor: 'Arbitre exemplaire et autonome, gestion calme et pédagogique des litiges.', points: 2.0 }
          ]
        }
      ];
    case 5:
      return [
        { 
          id: genId(), 
          label: 'Projet d\'entraînement personnel', 
          maxScore: 8, 
          weight: 1, 
          description: 'Conception et réalisation de séries adaptées au mobile visé',
          levels: [
            { level: 1, label: 'Maîtrise insuffisante', descriptor: 'Charges ou allures inadaptées, absence de projet cohérent.', points: 2.0 },
            { level: 2, label: 'Maîtrise fragile', descriptor: 'Projet approximatif, régulation uniquement après consigne du professeur.', points: 4.0 },
            { level: 3, label: 'Maîtrise satisfaisante', descriptor: 'Respect scrupuleux des charges, répétitions et allures définies pour le mobile.', points: 6.0 },
            { level: 4, label: 'Très bonne maîtrise', descriptor: 'Projet personnalisé optimisé, analyse lucide des sensations et adaptation fine.', points: 8.0 }
          ]
        },
        { 
          id: genId(), 
          label: 'Mesure & Écoute corporelle', 
          maxScore: 6, 
          weight: 1, 
          description: 'Zone cible de Fréquence Cardiaque et régulation de l\'intensité',
          levels: [
            { level: 1, label: 'Maîtrise insuffisante', descriptor: 'Ignorance de la FC, sur-régime ou sous-régime flagrant.', points: 1.5 },
            { level: 2, label: 'Maîtrise fragile', descriptor: 'Prise de pouls approximative, difficulté à maintenir la zone cible.', points: 3.0 },
            { level: 3, label: 'Maîtrise satisfaisante', descriptor: 'Maintien régulier dans la zone cible de FC, gestion lucide de la respiration.', points: 4.5 },
            { level: 4, label: 'Très bonne maîtrise', descriptor: 'Régulation parfaite de l\'effort à l\'écoute de son corps, aisance ventilatoire.', points: 6.0 }
          ]
        },
        { 
          id: genId(), 
          label: 'Posture, respiration & Sécurité', 
          maxScore: 4, 
          weight: 1, 
          description: 'Gainage, trajet technique et placement articulaire',
          levels: [
            { level: 1, label: 'Maîtrise insuffisante', descriptor: 'Défauts posturaux dangereux (dos cambré, apnée, gestes brusques).', points: 1.0 },
            { level: 2, label: 'Maîtrise fragile', descriptor: 'Gainage discontinu, respiration parfois inversée.', points: 2.0 },
            { level: 3, label: 'Maîtrise satisfaisante', descriptor: 'Alignement postural correct, expiration à l\'effort et placement sécurisé.', points: 3.0 },
            { level: 4, label: 'Très bonne maîtrise', descriptor: 'Placement biomécanique impeccable, contrôle moteur total et rôle de pareur actif.', points: 4.0 }
          ]
        },
        { 
          id: genId(), 
          label: 'Bilan critique et perspectives', 
          maxScore: 2, 
          weight: 1, 
          description: 'Analyse du ressenti et ajustement pour les futures séances',
          levels: [
            { level: 1, label: 'Maîtrise insuffisante', descriptor: 'Bilan vide ou non renseigné, aucune prise de recul.', points: 0.5 },
            { level: 2, label: 'Maîtrise fragile', descriptor: 'Commentaires superficiels, ressenti d\'effort peu explicité.', points: 1.0 },
            { level: 3, label: 'Maîtrise satisfaisante', descriptor: 'Analyse cohérente du ressenti d\'effort (RPE) et identification des progrès.', points: 1.5 },
            { level: 4, label: 'Très bonne maîtrise', descriptor: 'Regard critique pointu sur son travail et propositions pertinentes pour la suite.', points: 2.0 }
          ]
        }
      ];
    default:
      return [
        { 
          id: genId(), 
          label: 'Compétence motrice principale', 
          maxScore: 10, 
          weight: 1, 
          description: 'Niveau technique et performance',
          levels: [
            { level: 1, label: 'Maîtrise insuffisante', descriptor: 'Réalisation heurtée, non maîtrisée ou inférieure aux attendus.', points: 2.5 },
            { level: 2, label: 'Maîtrise fragile', descriptor: 'Réalisation en cours d\'acquisition, des erreurs techniques récurrentes.', points: 5.0 },
            { level: 3, label: 'Maîtrise satisfaisante', descriptor: 'Réalisation stabilisée et efficace, conforme aux attendus du cycle.', points: 7.5 },
            { level: 4, label: 'Très bonne maîtrise', descriptor: 'Réalisation fluide, remarquable et d\'une grande efficience motrice.', points: 10.0 }
          ]
        },
        { 
          id: genId(), 
          label: 'Compétence méthodologique et sociale', 
          maxScore: 6, 
          weight: 1, 
          description: 'Régularité, engagement et sécurité',
          levels: [
            { level: 1, label: 'Maîtrise insuffisante', descriptor: 'Engagement faible, manque d\'autonomie ou de respect des consignes.', points: 1.5 },
            { level: 2, label: 'Maîtrise fragile', descriptor: 'Engagement irrégulier, a besoin de sollicitations pour rester actif.', points: 3.0 },
            { level: 3, label: 'Maîtrise satisfaisante', descriptor: 'Engagement constant, respect scrupuleux des consignes et du matériel.', points: 4.5 },
            { level: 4, label: 'Très bonne maîtrise', descriptor: 'Autonomie exemplaire, force de proposition et esprit d\'initiative.', points: 6.0 }
          ]
        },
        { 
          id: genId(), 
          label: 'Rôles sociaux (arbitre, observateur)', 
          maxScore: 4, 
          weight: 1, 
          description: 'Coopération et écoute',
          levels: [
            { level: 1, label: 'Maîtrise insuffisante', descriptor: 'Refus ou incapacité à tenir le rôle d\'arbitre ou d\'observateur.', points: 1.0 },
            { level: 2, label: 'Maîtrise fragile', descriptor: 'Rôle tenu avec des hésitations ou besoin d\'assistance.', points: 2.0 },
            { level: 3, label: 'Maîtrise satisfaisante', descriptor: 'Rôle assumé avec sérieux, relevés fiables et attitude bienveillante.', points: 3.0 },
            { level: 4, label: 'Très bonne maîtrise', descriptor: 'Rôle tenu avec autorité et bienveillance, conseil avisé auprès de ses pairs.', points: 4.0 }
          ]
        }
      ];
  }
}

export interface DemiFondTempsJusteSummary {
  hasData: boolean;
  totalBlocks: number;
  completedBlocks: number;
  totalTargetDistance: number;
  totalActualDistance: number;
  totalTceSeconds: number;
  totalTmSeconds: number;
  realSpeedKmH: number;
  contractSpeedKmH: number;
  profile: 'Régulier / Continu' | 'Lucide / Adaptatif' | 'Sur-estimé / Obstiné' | 'Prudent / En réserve' | 'En cours d\'évaluation';
  tag: string;
  overpacedAlertCount: number;
  adaptedContractCount: number;
  blocks: any[];
  config?: any;
}

/**
 * Extrait et agrège les données de la situation « Demi-Fond - Course au Temps Juste (4 x 5') »
 */
export function extractDemiFondTempsJusteData(observations: ObservationRecord[]): DemiFondTempsJusteSummary | null {
  for (const obs of observations) {
    for (const val of Object.values(obs.data || {})) {
      if (val && typeof val === 'object' && Array.isArray(val.blocks) && val.blocks.length > 0) {
        const blocks = val.blocks;
        const blockDuration = val.config?.blockDurationSeconds || 300;
        const completed = blocks.filter((b: any) => b.actualDistance !== undefined && b.effectiveRunningTimeSeconds !== undefined);
        
        let totalTarget = 0;
        let totalActual = 0;
        let totalTce = 0;
        let totalTm = 0;
        let overpacedCount = 0;
        let adaptedCount = 0;

        blocks.forEach((b: any) => {
          totalTarget += (b.targetDistance || 0);
          if (b.actualDistance !== undefined) totalActual += b.actualDistance;
          if (b.effectiveRunningTimeSeconds !== undefined) {
            totalTce += b.effectiveRunningTimeSeconds;
            const tm = Math.max(0, blockDuration - b.effectiveRunningTimeSeconds);
            totalTm += tm;
            if (tm > 30) overpacedCount++;
          }
          if (b.decisionNextBlock === 'reduce') adaptedCount++;
        });

        const realSpeed = totalTce > 0 ? Math.round((totalActual / totalTce) * 3.6 * 10) / 10 : 0;
        const contractDuration = blockDuration * blocks.length;
        const contractSpeed = contractDuration > 0 ? Math.round((totalTarget / contractDuration) * 3.6 * 10) / 10 : 0;

        let profile: DemiFondTempsJusteSummary['profile'] = 'En cours d\'évaluation';
        let tag = 'En cours';

        if (completed.length > 0) {
          if (totalTm < 30) {
            profile = 'Régulier / Continu';
            tag = 'Régulier (TM < 30s)';
          } else {
            const firstOverpacedIdx = completed.findIndex((b: any) => (blockDuration - (b.effectiveRunningTimeSeconds || 0)) > 30);
            if (firstOverpacedIdx !== -1 && firstOverpacedIdx < completed.length - 1) {
              const followingBlock = completed[firstOverpacedIdx + 1];
              const prevTarget = completed[firstOverpacedIdx].targetDistance;
              const nextTarget = followingBlock.targetDistance;
              const nextTm = Math.max(0, blockDuration - (followingBlock.effectiveRunningTimeSeconds || 0));
              if (nextTarget < prevTarget && nextTm <= 10) {
                profile = 'Lucide / Adaptatif';
                tag = 'Lucide & Adaptatif';
              } else {
                profile = 'Sur-estimé / Obstiné';
                tag = 'Sur-estimé / Obstiné';
              }
            } else {
              profile = 'Sur-estimé / Obstiné';
              tag = 'Sur-estimé / Obstiné';
            }
          }
        }

        return {
          hasData: true,
          totalBlocks: blocks.length,
          completedBlocks: completed.length,
          totalTargetDistance: totalTarget,
          totalActualDistance: totalActual,
          totalTceSeconds: totalTce,
          totalTmSeconds: totalTm,
          realSpeedKmH: realSpeed,
          contractSpeedKmH: contractSpeed,
          profile,
          tag,
          overpacedAlertCount: overpacedCount,
          adaptedContractCount: adaptedCount,
          blocks,
          config: val.config
        };
      }
    }
  }
  return null;
}

/**
 * Calcule les notes automatiques recommandées d'après le barème officiel Temps Juste (4 x 5')
 * Retourne les scores pour les 4 critères (Régularité /6, Performance /8, Lucidité /4, Observateur /2) et l'appréciation officielle
 */
export function computeTempsJusteOfficialGrades(data: DemiFondTempsJusteSummary) {
  // 1. Régularité & Temps de marche TM (sur 6 pts)
  let regScore = 4.0;
  if (data.profile === 'Régulier / Continu' || data.totalTmSeconds < 30) {
    regScore = 6.0;
  } else if (data.profile === 'Lucide / Adaptatif' || data.profile === 'Prudent / En réserve') {
    regScore = 5.0;
  } else if (data.totalTmSeconds <= 90) {
    regScore = 4.0;
  } else if (data.totalTmSeconds <= 180) {
    regScore = 3.0;
  } else {
    regScore = 2.0;
  }

  // 2. Performance & Vitesse réelle de course (sur 8 pts)
  let perfScore = 4.0;
  const spd = data.realSpeedKmH;
  if (spd >= 14.5) perfScore = 8.0;
  else if (spd >= 13.5) perfScore = 7.5;
  else if (spd >= 12.5) perfScore = 7.0;
  else if (spd >= 11.5) perfScore = 6.5;
  else if (spd >= 10.5) perfScore = 6.0;
  else if (spd >= 9.5) perfScore = 5.5;
  else if (spd >= 8.5) perfScore = 5.0;
  else perfScore = 4.0;

  // 3. Lucidité & Régulation du contrat visé (sur 4 pts)
  let lucidityScore = 3.0;
  if (data.profile === 'Régulier / Continu') {
    lucidityScore = 4.0; // Pas de sur-régime, contrat parfaitement calibré
  } else if (data.profile === 'Lucide / Adaptatif') {
    lucidityScore = 4.0; // Décrochage détecté et contrat immédiatement adapté
  } else if (data.profile === 'Prudent / En réserve') {
    lucidityScore = 3.0;
  } else if (data.overpacedAlertCount > 0 && data.adaptedContractCount === 0) {
    lucidityScore = 2.0; // Sur-estimé obstiné (alerte répétée sans réduction)
  } else {
    lucidityScore = 3.0;
  }

  // 4. Rôle d'élève-observateur & co-pilote (sur 2 pts)
  const observerScore = 2.0;

  const tceFormatted = `${Math.floor(data.totalTceSeconds / 60)}m${String(data.totalTceSeconds % 60).padStart(2, '0')}s`;
  const tmFormatted = `${Math.floor(data.totalTmSeconds / 60)}m${String(data.totalTmSeconds % 60).padStart(2, '0')}s`;

  let adviceComment = '';
  if (data.profile === 'Régulier / Continu') {
    adviceComment = "Remarquable continuité d'effort sans marcher. Allure régulière et contrat parfaitement maîtrisé.";
  } else if (data.profile === 'Lucide / Adaptatif') {
    adviceComment = "Très bonne lucidité tactique : adaptation efficace du contrat suite au premier décrochage pour terminer sans marcher.";
  } else if (data.profile === 'Prudent / En réserve') {
    adviceComment = "Course continue sans marcher mais contrat sous-estimé : l'élève a une réserve motrice exploitable.";
  } else {
    adviceComment = "Allure initiale trop élevée entraînant du temps de marche répété. La régulation du contrat est indispensable.";
  }

  const appreciation = `Évaluation Demi-Fond - Course au Temps Juste (4x5') : Profil ${data.profile}. Distance totale : ${data.totalActualDistance}m à ${data.realSpeedKmH} km/h (TCE : ${tceFormatted}, TM : ${tmFormatted}). ${adviceComment}`;

  const totalScoreOn20 = regScore + perfScore + lucidityScore + observerScore;

  return {
    scores: {
      regularity: regScore,
      performance: perfScore,
      lucidity: lucidityScore,
      observer: observerScore
    },
    totalScoreOn20,
    appreciation
  };
}

/**
 * Suggère un score intelligent pour un élève sur un critère donné
 * basé sur ses données d'observations enregistrées dans le cycle !
 */
export function suggestCriterionScoreFromObservations(
  criterion: EvaluationCriterion,
  studentObservations: ObservationRecord[]
): number | null {
  if (!studentObservations || studentObservations.length === 0) return null;

  const label = criterion.label.toLowerCase();
  const max = criterion.maxScore;

  // 1. Recherche prioritaire de données de Course au Temps Juste (4x5')
  const tempsJuste = extractDemiFondTempsJusteData(studentObservations);
  if (tempsJuste && tempsJuste.completedBlocks > 0) {
    // A. Régularité & Temps de Marche TM
    if (label.includes('régul') || label.includes('allure') || label.includes('marche') || label.includes('tm')) {
      if (tempsJuste.profile === 'Régulier / Continu') return max; // 6/6
      if (tempsJuste.profile === 'Lucide / Adaptatif') return Math.round(max * 0.85 * 2) / 2; // ~5/6
      if (tempsJuste.profile === 'Prudent / En réserve') return Math.round(max * 0.85 * 2) / 2;
      if (tempsJuste.totalTmSeconds <= 90) return Math.round(max * 0.65 * 2) / 2; // ~4/6
      return Math.round(max * 0.45 * 2) / 2; // ~2.5/6
    }

    // B. Performance & Vitesse Réelle km/h
    if (label.includes('perf') || label.includes('vitesse') || label.includes('distance') || label.includes('chrono')) {
      const spd = tempsJuste.realSpeedKmH;
      if (spd >= 14.5) return max; // 8/8
      if (spd >= 13.0) return Math.round(max * 0.9 * 2) / 2; // ~7/8
      if (spd >= 11.5) return Math.round(max * 0.8 * 2) / 2; // ~6.5/8
      if (spd >= 10.0) return Math.round(max * 0.7 * 2) / 2; // ~5.5/8
      if (spd >= 8.5) return Math.round(max * 0.6 * 2) / 2;  // ~5/8
      return Math.round(max * 0.5 * 2) / 2;                 // ~4/8
    }

    // C. Lucidité & Régulation du contrat visé
    if (label.includes('lucid') || label.includes('régulat') || label.includes('contrat') || label.includes('adapt')) {
      if (tempsJuste.profile === 'Régulier / Continu' || tempsJuste.profile === 'Lucide / Adaptatif') return max; // 4/4
      if (tempsJuste.profile === 'Prudent / En réserve') return Math.round(max * 0.75 * 2) / 2; // 3/4
      if (tempsJuste.overpacedAlertCount > 0 && tempsJuste.adaptedContractCount === 0) {
        return Math.round(max * 0.5 * 2) / 2; // 2/4 (Obstiné)
      }
      return Math.round(max * 0.75 * 2) / 2;
    }

    // D. Observateur & Co-pilote
    if (label.includes('observ') || label.includes('pilote') || label.includes('rôle') || label.includes('social')) {
      return max; // 2/2
    }
  }

  // 2. Recherche d'évaluations étoiles (ratings 1 à 5)
  const starValues: number[] = [];
  studentObservations.forEach(obs => {
    Object.values(obs.data || {}).forEach(v => {
      if (typeof v === 'number' && v >= 1 && v <= 5) {
        starValues.push(v);
      }
    });
  });

  if (starValues.length > 0 && (label.includes('maîtrise') || label.includes('technique') || label.includes('régul') || label.includes('qualité'))) {
    const avgStars = starValues.reduce((a, b) => a + b, 0) / starValues.length;
    const ratio = avgStars / 5;
    return Math.round(ratio * max * 2) / 2;
  }

  // 3. Recherche de ratio réussites / échecs
  for (const obs of studentObservations) {
    for (const val of Object.values(obs.data || {})) {
      if (val && typeof val === 'object' && typeof val.success === 'number' && typeof val.fail === 'number') {
        const total = val.success + val.fail;
        if (total > 0) {
          const ratio = val.success / total;
          return Math.round(ratio * max * 2) / 2;
        }
      }
    }
  }

  // 4. Recherche de balises en Course d'Orientation
  for (const obs of studentObservations) {
    for (const val of Object.values(obs.data || {})) {
      if (val && typeof val === 'object' && typeof val.balisesOk === 'number') {
        const ok = val.balisesOk;
        const errors = val.errors || 0;
        const net = Math.max(0, ok - errors * 0.5);
        const score = Math.min(max, Math.max(0, (net / 10) * max));
        return Math.round(score * 2) / 2;
      }
    }
  }

  // 5. Recherche d'assiduité et présence
  if (label.includes('observ') || label.includes('rôle') || label.includes('engage') || label.includes('invest')) {
    const validObsCount = studentObservations.filter(o => o.status !== 'absent').length;
    if (validObsCount >= 3) return max;
    if (validObsCount >= 1) return Math.round(max * 0.8 * 2) / 2;
    return Math.round(max * 0.5 * 2) / 2;
  }

  return null;
}

/**
 * Exporte les résultats d'évaluation au format CSV (compatible Pronote & Tableurs)
 */
export function exportEvaluationToCsv(
  activity: Activity,
  cls: ClassGroup,
  criteria: EvaluationCriterion[],
  summaries: StudentEvaluationSummary[]
): string {
  const headers = [
    'Identifiant',
    'Nom de l\'élève',
    'Statut',
    ...criteria.map(c => `"${c.label.replace(/"/g, '""')} (/${c.maxScore} - Coeff ${c.weight})"`),
    'Total brut',
    'Note /20',
    'Niveau de maîtrise',
    'Appréciation'
  ];

  const rows = summaries.map(s => {
    const criterionScores = criteria.map(c => {
      const v = s.scores[c.id];
      if (v === 'A' || v === 'D') return v;
      if (typeof v === 'number') return v.toString().replace('.', ',');
      return '';
    });

    const statusLabel = s.status === 'absent' ? 'ABSENT' : s.status === 'dispense' ? 'DISPENSÉ' : s.status === 'present' ? 'ÉVALUÉ' : 'NON ÉVALUÉ';
    const noteStr = s.scoreOn20 !== null ? s.scoreOn20.toString().replace('.', ',') : '';
    const cleanAppreciation = `"${(s.appreciation || '').replace(/"/g, '""')}"`;

    return [
      s.studentId,
      `"${s.studentName.replace(/"/g, '""')}"`,
      statusLabel,
      ...criterionScores,
      s.totalWeightedScore.toString().replace('.', ','),
      noteStr,
      `"${s.competenceLevel.label}"`,
      cleanAppreciation
    ].join(';');
  });

  // UTF-8 BOM pour ouverture propre dans Excel FR
  return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
}

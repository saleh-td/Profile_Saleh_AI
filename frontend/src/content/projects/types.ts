export type Project = {
  name: string;
  /** Où le projet a été réalisé, et quand. */
  origin: string;
  /**
   * Donnée explicite, pas déduite du texte d'`origin` : un badge affiché
   * ne doit jamais dépendre d'un motif de chaîne fragile à la traduction
   * ou à la reformulation. Le libellé vient du dictionnaire i18n.
   */
  engagement: "professional" | "personal";
  /**
   * Le projet mis en avant sur la home. Un seul à la fois. Donnée
   * explicite plutôt que déduite de la présence d'une `url` : si un
   * second dépôt devient public, la home ne bascule pas toute seule.
   */
  spotlight: boolean;
  /**
   * Schéma d'architecture à afficher sous la fiche. Chaque valeur
   * correspond à un composant dessiné à la main : un diagramme décrit un
   * système réel, il ne se génère pas depuis des données génériques.
   */
  diagram?: "jobsearch";
  context: string;
  architecture: string;
  results: string;
  /**
   * Optionnels : ne renseigner que si l'information est réelle.
   * Un champ absent ne s'affiche pas — mieux vaut une fiche courte
   * qu'une fiche remplie d'approximations.
   */
  choices?: string;
  constraints?: string;
  /** Technologies structurantes, la première est mise en avant. */
  stack: string[];
  /** Dépôt public ou démo. Omis si le projet n'est pas consultable. */
  url?: string;
  /**
   * Capture réelle de l'interface, en vignette. Volontairement optionnelle
   * et sans valeur de repli : un projet sans capture n'affiche rien plutôt
   * qu'une image d'illustration générique, qui ne prouverait rien.
   *
   * `width` et `height` sont les dimensions natives du fichier, exigées par
   * next/image pour réserver la place avant chargement et éviter que le
   * texte ne saute quand l'image arrive.
   */
  thumbnail?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
};

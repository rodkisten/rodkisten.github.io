/*
 * Review taxonomy and prediction mappings.
 *
 * Unselected buttons are always interpreted as "uncertain".
 * There is no dedicated uncertain button.
 */
window.REVIEW_CONFIG = {
  version: "0.2.0",

  // Positive, independent labels. Tap toggles confirmed/unknown.
  labels: [
    {
      id: "penis",
      title: "Pênis",
      keyword: "Pênis",
      aliases: ["penis", "penile", "male_genitalia", "male_genitals"]
    },
    {
      id: "scrotum_visible",
      title: "Escroto",
      keyword: "Escroto visível",
      aliases: ["scrotum", "balls", "testicles", "scrotum_visible"]
    },
    {
      id: "glans_exposed",
      title: "Glande exposta",
      keyword: "Glande exposta",
      aliases: ["glans", "glans_exposed", "exposed_glans"]
    },
    {
      id: "vascularity_prominent",
      title: "Veias",
      keyword: "Veias proeminentes",
      aliases: [
        "vascularity_prominent",
        "prominent_veins",
        "veins_prominent"
      ]
    }
  ],

  // Mutually exclusive groups. Selecting the selected chip again clears it.
  // No selection == uncertain.
  groups: [
    {
      id: "erection",
      title: "Ereção",
      options: [
        {
          id: "flaccid",
          title: "Flácido",
          keyword: "Flácido",
          aliases: ["flaccid", "soft"]
        },
        {
          id: "semi",
          title: "Semi",
          keyword: "Semi-ereto",
          aliases: ["semi", "semi_erect", "partially_erect"]
        },
        {
          id: "erect",
          title: "Ereto",
          keyword: "Ereto",
          aliases: ["erect", "hard"]
        }
      ]
    },
    {
      id: "circumcision",
      title: "Prepúcio",
      options: [
        {
          id: "circumcised",
          title: "Circuncidado",
          keyword: "Circuncidado",
          aliases: ["circumcised", "cut"]
        },
        {
          id: "uncircumcised",
          title: "Não circuncidado",
          keyword: "Não circuncidado",
          aliases: ["uncircumcised", "uncut", "foreskin"]
        }
      ]
    },
    {
      id: "visual_size",
      title: "Tamanho visual",
      help: "aparência na foto",
      options: [
        {
          id: "small",
          title: "Pequeno",
          keyword: "Tamanho visual: pequeno",
          aliases: ["small", "visual_size_small"]
        },
        {
          id: "medium",
          title: "Médio",
          keyword: "Tamanho visual: médio",
          aliases: ["medium", "visual_size_medium"]
        },
        {
          id: "large",
          title: "Grande",
          keyword: "Tamanho visual: grande",
          aliases: ["large", "visual_size_large"]
        }
      ]
    }
  ]
};

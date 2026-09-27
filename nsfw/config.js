/* Fallback taxonomy. The live Dataset Hub taxonomy can override this per session. */
window.REVIEW_CONFIG = {
  "version": "1.0",
  "schema": "male-dataset-review-taxonomy-v1",
  "labels": [
    {
      "id": "nude",
      "title": "Nudez",
      "keyword": "Nudez",
      "group_id": "content",
      "group_title": "Conteúdo",
      "aliases": [
        "nude",
        "nudity",
        "naked"
      ]
    },
    {
      "id": "explicit",
      "title": "Explícito",
      "keyword": "Explícito",
      "group_id": "content",
      "group_title": "Conteúdo",
      "aliases": [
        "explicit",
        "nsfw",
        "sexual_explicit"
      ]
    },
    {
      "id": "masturbation",
      "title": "Masturbação",
      "keyword": "Masturbação",
      "group_id": "content",
      "group_title": "Conteúdo",
      "aliases": [
        "masturbation",
        "male_masturbation"
      ]
    },
    {
      "id": "ejaculation",
      "title": "Ejaculação",
      "keyword": "Ejaculação",
      "group_id": "content",
      "group_title": "Conteúdo",
      "aliases": [
        "ejaculation",
        "cum",
        "orgasm"
      ]
    },
    {
      "id": "semen_visible",
      "title": "Sêmen visível",
      "keyword": "Sêmen visível",
      "group_id": "content",
      "group_title": "Conteúdo",
      "aliases": [
        "semen",
        "cum_visible",
        "semen_visible"
      ]
    },
    {
      "id": "fellatio",
      "title": "Felação",
      "keyword": "Felação",
      "group_id": "content",
      "group_title": "Conteúdo",
      "aliases": [
        "fellatio",
        "oral",
        "oral_sex"
      ]
    },
    {
      "id": "anal_sex",
      "title": "Sexo anal",
      "keyword": "Sexo anal",
      "group_id": "content",
      "group_title": "Conteúdo",
      "aliases": [
        "anal",
        "anal_sex"
      ]
    },
    {
      "id": "penetration",
      "title": "Penetração",
      "keyword": "Penetração",
      "group_id": "content",
      "group_title": "Conteúdo",
      "aliases": [
        "penetration",
        "penetrative"
      ]
    },
    {
      "id": "penis_visible",
      "title": "Pênis visível",
      "keyword": "Pênis visível",
      "group_id": "anatomy",
      "group_title": "Anatomia visível",
      "aliases": [
        "penis",
        "penile",
        "male_genitalia",
        "male_genitals",
        "penis_visible"
      ]
    },
    {
      "id": "glans_visible",
      "title": "Glande visível",
      "keyword": "Glande visível",
      "group_id": "anatomy",
      "group_title": "Anatomia visível",
      "aliases": [
        "glans",
        "glans_visible",
        "glans_exposed",
        "exposed_glans"
      ]
    },
    {
      "id": "foreskin_retracted",
      "title": "Prepúcio retraído",
      "keyword": "Prepúcio retraído",
      "group_id": "anatomy",
      "group_title": "Anatomia visível",
      "aliases": [
        "foreskin_retracted",
        "retracted_foreskin"
      ]
    },
    {
      "id": "scrotum_visible",
      "title": "Escroto visível",
      "keyword": "Escroto visível",
      "group_id": "anatomy",
      "group_title": "Anatomia visível",
      "aliases": [
        "scrotum",
        "balls",
        "testicles",
        "scrotum_visible"
      ]
    },
    {
      "id": "pubic_hair_visible",
      "title": "Pelos pubianos visíveis",
      "keyword": "Pelos pubianos visíveis",
      "group_id": "anatomy",
      "group_title": "Anatomia visível",
      "aliases": [
        "pubic_hair",
        "pubic_hair_visible"
      ]
    },
    {
      "id": "genital_piercing",
      "title": "Piercing genital",
      "keyword": "Piercing genital",
      "group_id": "details",
      "group_title": "Detalhes visuais",
      "aliases": [
        "genital_piercing",
        "piercing"
      ]
    },
    {
      "id": "tattoo_visible",
      "title": "Tatuagem visível",
      "keyword": "Tatuagem visível",
      "group_id": "details",
      "group_title": "Detalhes visuais",
      "aliases": [
        "tattoo",
        "tattoo_visible"
      ]
    },
    {
      "id": "condom_visible",
      "title": "Preservativo visível",
      "keyword": "Preservativo visível",
      "group_id": "details",
      "group_title": "Detalhes visuais",
      "aliases": [
        "condom",
        "condom_visible"
      ]
    },
    {
      "id": "toy_visible",
      "title": "Brinquedo sexual visível",
      "keyword": "Brinquedo sexual visível",
      "group_id": "details",
      "group_title": "Detalhes visuais",
      "aliases": [
        "toy",
        "sex_toy",
        "toy_visible"
      ]
    }
  ],
  "groups": [
    {
      "id": "foreskin",
      "title": "Prepúcio / circuncisão",
      "help": "sem seleção = incerto",
      "aliases": [
        "foreskin",
        "circumcision"
      ],
      "options": [
        {
          "id": "circumcised",
          "title": "Circuncidado",
          "keyword": "Circuncidado",
          "aliases": [
            "circumcised",
            "cut"
          ]
        },
        {
          "id": "uncircumcised",
          "title": "Não circuncidado",
          "keyword": "Não circuncidado",
          "aliases": [
            "uncircumcised",
            "uncut",
            "foreskin"
          ]
        }
      ]
    },
    {
      "id": "erection_state",
      "title": "Estado de ereção",
      "help": "sem seleção = incerto",
      "aliases": [
        "erection_state",
        "erection"
      ],
      "options": [
        {
          "id": "flaccid",
          "title": "Flácido",
          "keyword": "Flácido",
          "aliases": [
            "flaccid",
            "soft"
          ]
        },
        {
          "id": "semi_erect",
          "title": "Semi-ereto",
          "keyword": "Semi-ereto",
          "aliases": [
            "semi",
            "semi_erect",
            "partially_erect"
          ]
        },
        {
          "id": "erect",
          "title": "Ereto",
          "keyword": "Ereto",
          "aliases": [
            "erect",
            "hard"
          ]
        }
      ]
    },
    {
      "id": "pubic_hair",
      "title": "Pelos pubianos",
      "help": "sem seleção = incerto",
      "aliases": [
        "pubic_hair",
        "pubic_hair_style"
      ],
      "options": [
        {
          "id": "pubic_shaved",
          "title": "Pubianos · raspado",
          "keyword": "Pubianos · raspado",
          "aliases": [
            "pubic_shaved",
            "shaved"
          ]
        },
        {
          "id": "pubic_trimmed",
          "title": "Pubianos · aparado",
          "keyword": "Pubianos · aparado",
          "aliases": [
            "pubic_trimmed",
            "trimmed"
          ]
        },
        {
          "id": "pubic_hairy",
          "title": "Pubianos · peludo",
          "keyword": "Pubianos · peludo",
          "aliases": [
            "pubic_hairy",
            "hairy"
          ]
        }
      ]
    },
    {
      "id": "body_hair",
      "title": "Pelos corporais",
      "help": "sem seleção = incerto",
      "aliases": [
        "body_hair"
      ],
      "options": [
        {
          "id": "body_hair_low",
          "title": "Corpo · pouco pelo",
          "keyword": "Corpo · pouco pelo",
          "aliases": [
            "body_hair_low",
            "low_body_hair"
          ]
        },
        {
          "id": "body_hair_medium",
          "title": "Corpo · pelo médio",
          "keyword": "Corpo · pelo médio",
          "aliases": [
            "body_hair_medium",
            "medium_body_hair"
          ]
        },
        {
          "id": "body_hair_high",
          "title": "Corpo · muito pelo",
          "keyword": "Corpo · muito pelo",
          "aliases": [
            "body_hair_high",
            "high_body_hair",
            "hairy_body"
          ]
        }
      ]
    },
    {
      "id": "visual_tone",
      "title": "Tom visual / pigmentação",
      "help": "sem seleção = incerto",
      "aliases": [
        "visual_tone",
        "pigmentation",
        "skin_tone"
      ],
      "options": [
        {
          "id": "tone_very_light",
          "title": "Tom visual · muito claro",
          "keyword": "Tom visual · muito claro",
          "aliases": [
            "tone_very_light",
            "very_light"
          ]
        },
        {
          "id": "tone_light",
          "title": "Tom visual · claro",
          "keyword": "Tom visual · claro",
          "aliases": [
            "tone_light",
            "light"
          ]
        },
        {
          "id": "tone_medium",
          "title": "Tom visual · médio",
          "keyword": "Tom visual · médio",
          "aliases": [
            "tone_medium",
            "medium"
          ]
        },
        {
          "id": "tone_dark",
          "title": "Tom visual · escuro",
          "keyword": "Tom visual · escuro",
          "aliases": [
            "tone_dark",
            "dark"
          ]
        },
        {
          "id": "tone_very_dark",
          "title": "Tom visual · muito escuro",
          "keyword": "Tom visual · muito escuro",
          "aliases": [
            "tone_very_dark",
            "very_dark"
          ]
        }
      ]
    },
    {
      "id": "framing",
      "title": "Enquadramento",
      "help": "sem seleção = incerto",
      "aliases": [
        "framing",
        "crop"
      ],
      "options": [
        {
          "id": "close_up",
          "title": "Enquadramento · close-up",
          "keyword": "Enquadramento · close-up",
          "aliases": [
            "close_up",
            "closeup"
          ]
        },
        {
          "id": "partial_body",
          "title": "Enquadramento · corpo parcial",
          "keyword": "Enquadramento · corpo parcial",
          "aliases": [
            "partial_body",
            "body_partial"
          ]
        },
        {
          "id": "full_body",
          "title": "Enquadramento · corpo inteiro",
          "keyword": "Enquadramento · corpo inteiro",
          "aliases": [
            "full_body"
          ]
        }
      ]
    },
    {
      "id": "person_count",
      "title": "Quantidade de pessoas",
      "help": "sem seleção = incerto",
      "aliases": [
        "person_count",
        "people_count"
      ],
      "options": [
        {
          "id": "one_person",
          "title": "Pessoas · 1",
          "keyword": "Pessoas · 1",
          "aliases": [
            "one_person",
            "single_person"
          ]
        },
        {
          "id": "two_people",
          "title": "Pessoas · 2",
          "keyword": "Pessoas · 2",
          "aliases": [
            "two_people"
          ]
        },
        {
          "id": "three_plus_people",
          "title": "Pessoas · 3+",
          "keyword": "Pessoas · 3+",
          "aliases": [
            "three_plus_people",
            "group"
          ]
        }
      ]
    }
  ]
};

/** Metadata for each LangGraph node — shown in the progress timeline. */
export const NODE_META = {
  plan_steps:      { icon: 'ListOrdered', label: 'Planning sub-questions' },
  search_web:      { icon: 'Search',      label: 'Searching the web'      },
  draft_report:    { icon: 'FileEdit',    label: 'Drafting report'        },
  review_draft:    { icon: 'Sparkles',    label: 'Reviewing draft'         },
  finalize_report: { icon: 'CheckCircle', label: 'Finalising report'       },
}

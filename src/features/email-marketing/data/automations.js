export const workflowStatusTabs = ['all', 'draft', 'active', 'inactive', 'archived']

export const triggerLabels = {
  welcome_signup: 'Signup Email',
  welcome_series: 'Welcome Series',
  order_confirmation: 'Order Confirmation',
  payment_success: 'Payment Success',
  shipping_update: 'Shipping Update',
  delivery_confirmation: 'Delivery Confirmation',
  abandoned_cart: 'Abandoned Cart Flow',
  browse_abandonment: 'Browse Abandonment',
  order_followup: 'Follow-up Sequence',
  review_request: 'Review request',
  win_back: 'Win-back',
  price_drop: 'Price Drop',
  back_in_stock: 'Back in stock',
  inactive_subscriber: 'Inactive subscriber',
  reminder_email: 'Reminder Email',
  discount_offer: 'Discount Offer',
}

export const stepTypeLabels = {
  delay: 'Delay',
  condition: 'Condition',
  send_email: 'Send email',
  add_tag: 'Add tag',
  remove_tag: 'Remove tag',
  webhook: 'Webhook',
  exit: 'Exit',
}

export const createWorkflowStep = (type = 'send_email', overrides = {}) => ({
  type,
  title: overrides.title?.trim() || stepTypeLabels[type] || 'Workflow step',
  description: overrides.description?.trim() || '',
  config:
    overrides.config ||
    (type === 'delay'
      ? { unit: 'hours', value: 24 }
      : type === 'condition'
        ? { field: 'engagementScore', operator: 'gte', value: '50' }
        : type === 'send_email'
          ? { templateId: '', subjectOverride: '' }
          : type === 'add_tag' || type === 'remove_tag'
            ? { tag: '' }
            : type === 'webhook'
              ? { url: '', method: 'POST' }
              : {}),
})

const withTemplate = (step, templateId = '', subjectOverride = '') => ({
  ...step,
  config:
    step.type === 'send_email'
      ? {
          ...(step.config || {}),
          templateId,
          subjectOverride,
        }
      : step.config || {},
})

const presetBlueprints = [
  {
    key: 'welcome_series',
    label: 'Welcome Series',
    trigger: 'welcome_series',
    description: 'A multi-email onboarding journey for every new signup.',
    notes: 'Kick off with a warm welcome, then follow up with brand and offer emails.',
    steps: (templateId = '') => [
      withTemplate(createWorkflowStep('send_email', {
        title: 'Send welcome email',
        description: 'Immediate thank-you message after signup.',
      }), templateId, 'Welcome to our community'),
      createWorkflowStep('delay', {
        title: 'Wait before next touch',
        description: 'Pause before introducing the brand story.',
        config: { unit: 'days', value: 2 },
      }),
      withTemplate(createWorkflowStep('send_email', {
        title: 'Send brand intro',
        description: 'Share the value proposition and key benefits.',
      }), templateId, 'Here is what we do'),
      createWorkflowStep('delay', {
        title: 'Second pause',
        description: 'Give the subscriber time to explore.',
        config: { unit: 'days', value: 3 },
      }),
      withTemplate(createWorkflowStep('send_email', {
        title: 'Send offer email',
        description: 'Close with a conversion-friendly offer.',
      }), templateId, 'A quick offer for you'),
      createWorkflowStep('exit', {
        title: 'End journey',
        description: 'Stop after the series is complete.',
      }),
    ],
  },
  {
    key: 'welcome_signup',
    label: 'Signup Email',
    trigger: 'welcome_signup',
    description: 'A single instant email after a new user registers.',
    notes: 'Use this for the first confirmation or thank-you message.',
    steps: (templateId = '') => [
      withTemplate(createWorkflowStep('send_email', {
        title: 'Send signup email',
        description: 'Immediate confirmation after registration.',
      }), templateId, 'Thanks for signing up'),
      createWorkflowStep('exit', {
        title: 'End journey',
        description: 'Close the workflow after the first send.',
      }),
    ],
  },
  {
    key: 'order_followup',
    label: 'Follow-up Sequence',
    trigger: 'order_followup',
    description: 'Follow up after an order with a post-purchase sequence.',
    notes: 'Useful for cross-sell, feedback, and repeat purchase nudges.',
    steps: (templateId = '') => [
      withTemplate(createWorkflowStep('send_email', {
        title: 'Send thank-you email',
        description: 'Acknowledge the purchase and set expectations.',
      }), templateId, 'Thank you for your order'),
      createWorkflowStep('delay', {
        title: 'Wait before follow-up',
        description: 'Let the user experience the purchase first.',
        config: { unit: 'days', value: 3 },
      }),
      withTemplate(createWorkflowStep('send_email', {
        title: 'Send follow-up email',
        description: 'Ask for feedback or offer a complementary product.',
      }), templateId, 'How is your order going?'),
      createWorkflowStep('exit', {
        title: 'End journey',
        description: 'Stop after the follow-up touch.',
      }),
    ],
  },
  {
    key: 'abandoned_cart',
    label: 'Abandoned Cart Flow',
    trigger: 'abandoned_cart',
    description: 'Recover carts with a reminder and a timed follow-up.',
    notes: 'The cart status flag comes from the main website integration.',
    steps: (templateId = '') => [
      createWorkflowStep('condition', {
        title: 'Cart is abandoned',
        description: 'Only continue when the cart is still marked abandoned.',
        config: { field: 'customFields.ophmateCartStatus', operator: 'eq', value: 'abandoned' },
      }),
      withTemplate(createWorkflowStep('send_email', {
        title: 'Send cart reminder',
        description: 'Bring the shopper back to the cart.',
      }), templateId, 'You left something behind'),
      createWorkflowStep('delay', {
        title: 'Wait for recovery',
        description: 'Give the subscriber more time to complete checkout.',
        config: { unit: 'days', value: 1 },
      }),
      createWorkflowStep('condition', {
        title: 'Still abandoned',
        description: 'Exit if the cart has already been recovered.',
        config: { field: 'customFields.ophmateCartStatus', operator: 'eq', value: 'abandoned' },
      }),
      withTemplate(createWorkflowStep('send_email', {
        title: 'Send last reminder',
        description: 'Use a light incentive to recover the sale.',
      }), templateId, 'Last chance to complete your order'),
      createWorkflowStep('exit', {
        title: 'End journey',
        description: 'Finish the recovery flow.',
      }),
    ],
  },
  {
    key: 'reminder_email',
    label: 'Reminder Email',
    trigger: 'reminder_email',
    description: 'Automate reminders for renewals, events, or follow-ups.',
    notes: 'Use this for date-based nudges or manual reminder events.',
    steps: (templateId = '') => [
      createWorkflowStep('delay', {
        title: 'Wait before reminder',
        description: 'Hold the send until the reminder window opens.',
        config: { unit: 'days', value: 1 },
      }),
      withTemplate(createWorkflowStep('send_email', {
        title: 'Send reminder',
        description: 'Deliver the reminder message at the scheduled time.',
      }), templateId, 'Friendly reminder'),
      createWorkflowStep('exit', {
        title: 'End journey',
        description: 'Close after the reminder send.',
      }),
    ],
  },
  {
    key: 'discount_offer',
    label: 'Discount Offer',
    trigger: 'discount_offer',
    description: 'Send a timed incentive to nudge buyers toward conversion.',
    notes: 'Ideal for coupons, limited-time offers, and win-back campaigns.',
    steps: (templateId = '') => [
      createWorkflowStep('condition', {
        title: 'Eligible audience',
        description: 'Only continue when the subscriber is eligible for the offer.',
        config: { field: 'engagementScore', operator: 'lte', value: '20' },
      }),
      withTemplate(createWorkflowStep('send_email', {
        title: 'Send discount offer',
        description: 'Deliver the offer and urgency-driven CTA.',
      }), templateId, 'A special offer for you'),
      createWorkflowStep('delay', {
        title: 'Wait before final nudge',
        description: 'Give the subscriber another chance to convert.',
        config: { unit: 'days', value: 2 },
      }),
      withTemplate(createWorkflowStep('send_email', {
        title: 'Send last chance email',
        description: 'Close the loop with a final reminder.',
      }), templateId, 'Last chance to save'),
      createWorkflowStep('exit', {
        title: 'End journey',
        description: 'Finish the offer sequence.',
      }),
    ],
  },
]

export const dripCampaignPresets = presetBlueprints.map(({ key, label, trigger, description, notes }) => ({
  key,
  label,
  trigger,
  description,
  notes,
}))

export const buildDripCampaignPreset = (key, templateId = '') => {
  const preset = presetBlueprints.find((item) => item.key === key)

  if (!preset) {
    return null
  }

  return {
    name: preset.label,
    description: preset.description,
    trigger: preset.trigger,
    status: 'draft',
    entrySegmentId: '',
    triggerConfig: {
      delayWindow: '',
      notes: preset.notes,
    },
    steps: preset.steps(templateId),
  }
}

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const readyToUseTemplateCategories = [
  "Anniversary",
  "Announcement",
  "Blog post",
  "Confirmation",
  "Feedback",
  "Greeting",
  "New products",
  "Notification",
  "Onboarding",
  "Progress",
  "Re-engagement",
  "Release",
  "Reminder",
  "Sale",
  "Special Offer",
  "Thank you",
  "Welcome",
];

export const buildTemplateHtml = (form) => `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;color:#0f172a;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#fff;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#64748b;font-weight:700;">${escapeHtml(form.eyebrow)}</p>
                <h1 style="margin:0;font-size:34px;line-height:1.15;color:#0f172a;font-weight:700;">${escapeHtml(form.headline)}</h1>
                <p style="margin:16px 0 0;font-size:16px;line-height:1.8;color:#334155;white-space:pre-line;">${escapeHtml(form.bodyText).replaceAll("\n", "<br />")}</p>
                <div style="margin-top:24px;">
                  <img src="${escapeHtml(form.imageUrl)}" alt="${escapeHtml(form.imageAlt)}" style="display:block;width:100%;border-radius:24px;object-fit:cover;" />
                </div>
                <div style="margin-top:24px;">
                  <a href="${escapeHtml(form.ctaUrl)}" style="display:inline-block;text-decoration:none;font-size:15px;font-weight:700;padding:13px 20px;border-radius:12px;background:#635bff;color:#fff;border:1px solid #635bff;">${escapeHtml(form.ctaText)}</a>
                </div>
                <p style="margin:24px 0 0;font-size:12px;line-height:1.7;color:#64748b;">${escapeHtml(form.footerNote)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const templatePresets = [
  {
    key: "welcome_series",
    name: "Welcome Series",
    category: "Welcome",
    description: "A warm welcome journey for new subscribers.",
    subject: "Welcome, {{firstName}}",
    previewText: "Start your journey with a quick hello and key links.",
    variables: ["{{firstName}}", "{{email}}"],
    form: {
      eyebrow: "Welcome",
      headline: "Thanks for joining us, {{firstName}}",
      bodyText:
        "We are excited to have you here. Discover your dashboard, browse featured products, and get started with a quick tour designed for you.",
      ctaText: "Explore now",
      ctaUrl: "https://sellerslogin.com/overview",
      imageUrl:
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Welcome onboarding",
      footerNote: "You are receiving this email because you signed up for updates.",
    },
  },
  {
    key: "welcome_signup",
    name: "Signup Email",
    category: "Onboarding",
    description: "An instant signup confirmation with a friendly first touch.",
    subject: "Thanks for signing up, {{firstName}}",
    previewText: "A quick confirmation and welcome message for new users.",
    variables: ["{{firstName}}", "{{email}}"],
    form: {
      eyebrow: "Signup confirmed",
      headline: "Welcome aboard, {{firstName}}",
      bodyText:
        "Thanks for signing up. We have created your account and you can now explore your dashboard, saved offers, and recommended products.",
      ctaText: "Open dashboard",
      ctaUrl: "https://sellerslogin.com/overview",
      imageUrl:
        "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Signup email",
      footerNote: "You are receiving this because you created a new account.",
    },
  },
  {
    key: "abandoned_cart_recovery",
    name: "Abandoned Cart Recovery",
    category: "Re-engagement",
    description: "A reminder email to recover missed checkouts.",
    subject: "You left items behind, {{firstName}}",
    previewText: "Come back and finish your checkout in a few clicks.",
    variables: [
      "{{firstName}}",
      "{{customFields.ophmateCartItemsSummary}}",
      "{{customFields.ophmateCartValue}}",
    ],
    form: {
      eyebrow: "Cart recovery",
      headline: "Your cart is waiting, {{firstName}}",
      bodyText:
        "Items you picked are still reserved for you: {{customFields.ophmateCartItemsSummary}}. Return to your cart and complete checkout before they sell out.",
      ctaText: "Return to cart",
      ctaUrl: "https://sellerslogin.com/cart",
      imageUrl:
        "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Abandoned cart",
      footerNote: "This reminder is sent automatically when checkout is not completed.",
    },
  },
  {
    key: "order_confirmation",
    name: "Order Confirmation",
    category: "Confirmation",
    description: "A clean thank-you email after a purchase or COD order.",
    subject: "Order {{customFields.ophmateOrderNumber}} is confirmed",
    previewText: "Thanks for shopping with us. Here is your order summary.",
    variables: [
      "{{firstName}}",
      "{{customFields.ophmateOrderNumber}}",
      "{{customFields.ophmateItemsSummary}}",
      "{{customFields.ophmateShippingAddressText}}",
    ],
    form: {
      eyebrow: "Order update",
      headline: "Thanks for your order, {{firstName}}",
      bodyText:
        "Your order {{customFields.ophmateOrderNumber}} is confirmed. Items: {{customFields.ophmateItemsSummary}}. Shipping to: {{customFields.ophmateShippingAddressText}}.",
      ctaText: "View order",
      ctaUrl: "https://sellerslogin.com/orders",
      imageUrl:
        "https://images.unsplash.com/photo-1556740720-0d7f8f2f7f0f?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Order confirmation",
      footerNote: "A confirmation will remain in your order history for easy reference.",
    },
  },
  {
    key: "payment_success_thank_you",
    name: "Payment Success / Thank You",
    category: "Thank you",
    description: "A thank-you email for successful payments with order details.",
    subject: "Payment received for {{customFields.ophmateOrderNumber}}",
    previewText: "A quick thank-you after a successful payment.",
    variables: [
      "{{firstName}}",
      "{{customFields.ophmateOrderNumber}}",
      "{{customFields.ophmateOrderDate}}",
      "{{customFields.ophmateOrderTime}}",
    ],
    form: {
      eyebrow: "Thank you",
      headline: "Payment successful, {{firstName}}",
      bodyText:
        "We have received your payment for order {{customFields.ophmateOrderNumber}} on {{customFields.ophmateOrderDate}} at {{customFields.ophmateOrderTime}}. Thank you for shopping with us.",
      ctaText: "View receipt",
      ctaUrl: "https://sellerslogin.com/orders",
      imageUrl:
        "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Thank you email",
      footerNote: "If you have questions, reply to this email and our team will help.",
    },
  },
  {
    key: "follow_up_sequence",
    name: "Follow-up Sequence",
    category: "Feedback",
    description: "A friendly post-purchase follow-up with support and next steps.",
    subject: "How is everything going, {{firstName}}?",
    previewText: "A follow-up email to keep the conversation going.",
    variables: ["{{firstName}}", "{{customFields.ophmateOrderNumber}}"],
    form: {
      eyebrow: "Follow-up",
      headline: "We hope everything is going well, {{firstName}}",
      bodyText:
        "Just checking in after your recent order {{customFields.ophmateOrderNumber}}. If you need any help, our team is here for you.",
      ctaText: "Contact support",
      ctaUrl: "https://sellerslogin.com/support",
      imageUrl:
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Follow-up sequence",
      footerNote: "We send follow-up messages to help you get the best experience.",
    },
  },
  {
    key: "reminder_email",
    name: "Reminder Email",
    category: "Reminder",
    description: "A simple reminder for due actions, events, or renewals.",
    subject: "Friendly reminder for {{firstName}}",
    previewText: "Use this for reminders, renewals, and due dates.",
    variables: ["{{firstName}}", "{{customFields.ophmateReminderType}}"],
    form: {
      eyebrow: "Reminder",
      headline: "A quick reminder, {{firstName}}",
      bodyText:
        "This is a gentle reminder for {{customFields.ophmateReminderType}}. Please review the details and take the next step when you are ready.",
      ctaText: "Review now",
      ctaUrl: "https://sellerslogin.com/overview",
      imageUrl:
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Reminder email",
      footerNote: "You are receiving this reminder because it is relevant to your account.",
    },
  },
  {
    key: "discount_offer",
    name: "Discount Offer",
    category: "Special Offer",
    description: "A conversion-focused template with urgency and offer copy.",
    subject: "A special offer just for you, {{firstName}}",
    previewText: "Use this template for limited-time offers and win-back flows.",
    variables: [
      "{{firstName}}",
      "{{customFields.ophmateDiscountCode}}",
      "{{customFields.ophmateOrderNumber}}",
    ],
    form: {
      eyebrow: "Special offer",
      headline: "Save more today, {{firstName}}",
      bodyText:
        "Unlock a time-sensitive discount on your next purchase. Use code {{customFields.ophmateDiscountCode}} before the offer expires.",
      ctaText: "Claim offer",
      ctaUrl: "https://sellerslogin.com/offers",
      imageUrl:
        "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Discount offer",
      footerNote: "Offer terms and expiry can be customized before sending.",
    },
  },
  {
    key: "anniversary_milestone",
    name: "Anniversary Milestone",
    category: "Anniversary",
    description: "A warm milestone email to celebrate a special date.",
    subject: "Happy anniversary, {{firstName}}",
    previewText: "Celebrate a meaningful moment with a thoughtful note.",
    variables: ["{{firstName}}", "{{customFields.ophmateOrderNumber}}"],
    form: {
      eyebrow: "Anniversary",
      headline: "Cheers to another year with us, {{firstName}}",
      bodyText:
        "We love celebrating milestones with our community. Thank you for staying with us and being part of the journey.",
      ctaText: "See your reward",
      ctaUrl: "https://sellerslogin.com/offers",
      imageUrl:
        "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Anniversary celebration",
      footerNote: "A special offer may be attached to your anniversary message.",
    },
  },
  {
    key: "announcement_company",
    name: "Company Announcement",
    category: "Announcement",
    description: "A polished announcement template for news and updates.",
    subject: "Important update from our team",
    previewText: "Share news with a clean and direct announcement layout.",
    variables: ["{{firstName}}"],
    form: {
      eyebrow: "Announcement",
      headline: "Here is an important update",
      bodyText:
        "We wanted to share a quick announcement with you. Read the latest update and stay informed about what is changing next.",
      ctaText: "Read update",
      ctaUrl: "https://sellerslogin.com/overview",
      imageUrl:
        "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Announcement briefing",
      footerNote: "Thanks for staying connected and reading our updates.",
    },
  },
  {
    key: "blog_post_digest",
    name: "Blog Post Digest",
    category: "Blog post",
    description: "A content-heavy digest for articles, stories, and updates.",
    subject: "New article: {{firstName}}, see what is new",
    previewText: "Perfect for sharing blog posts and editorial content.",
    variables: ["{{firstName}}"],
    form: {
      eyebrow: "Blog post",
      headline: "Top stories worth reading today",
      bodyText:
        "Explore our latest article roundup, insights, and practical tips designed to keep your readers engaged.",
      ctaText: "Read article",
      ctaUrl: "https://sellerslogin.com/blog",
      imageUrl:
        "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Blog reading",
      footerNote: "Your readers can reply to get more content like this.",
    },
  },
  {
    key: "customer_feedback",
    name: "Customer Feedback",
    category: "Feedback",
    description: "A survey-style email to collect opinions and ratings.",
    subject: "We would love your feedback, {{firstName}}",
    previewText: "Ask for feedback after a purchase, signup, or service call.",
    variables: ["{{firstName}}"],
    form: {
      eyebrow: "Feedback",
      headline: "Tell us what you think",
      bodyText:
        "Your thoughts help us improve. Share your experience so we can make the next one even better for you.",
      ctaText: "Share feedback",
      ctaUrl: "https://sellerslogin.com/support",
      imageUrl:
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Feedback survey",
      footerNote: "Feedback helps us improve our product and service quality.",
    },
  },
  {
    key: "friendly_greeting",
    name: "Friendly Greeting",
    category: "Greeting",
    description: "A short and friendly hello for campaigns and onboarding.",
    subject: "A quick hello from our team",
    previewText: "A casual greeting email for light-touch communication.",
    variables: ["{{firstName}}"],
    form: {
      eyebrow: "Greeting",
      headline: "Hello there, {{firstName}}",
      bodyText:
        "Just dropping by to say hello and share a quick note. We are glad to have you with us.",
      ctaText: "Say hi back",
      ctaUrl: "https://sellerslogin.com/overview",
      imageUrl:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Greeting email",
      footerNote: "A friendly greeting can keep your brand feeling human.",
    },
  },
  {
    key: "new_products_launch",
    name: "New Products Launch",
    category: "New products",
    description: "A launch template to showcase fresh products or collections.",
    subject: "Fresh arrivals are here, {{firstName}}",
    previewText: "Perfect for announcing new products or collections.",
    variables: ["{{firstName}}"],
    form: {
      eyebrow: "New products",
      headline: "Discover what is new this week",
      bodyText:
        "We have added fresh products and collection updates. Explore the latest additions and see what stands out.",
      ctaText: "Shop new arrivals",
      ctaUrl: "https://sellerslogin.com/offers",
      imageUrl:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "New products showcase",
      footerNote: "New product launches can improve repeat visits and interest.",
    },
  },
  {
    key: "account_notification",
    name: "Account Notification",
    category: "Notification",
    description: "A short system-style notice for account or order events.",
    subject: "Notification: action required for your account",
    previewText: "Use this for account notices, order updates, and alerts.",
    variables: ["{{firstName}}"],
    form: {
      eyebrow: "Notification",
      headline: "You have a new account notice",
      bodyText:
        "Please review the latest account notification and take any required action when you are ready.",
      ctaText: "View notice",
      ctaUrl: "https://sellerslogin.com/overview",
      imageUrl:
        "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Notification dashboard",
      footerNote: "System notifications help users stay informed quickly.",
    },
  },
  {
    key: "onboarding_guide",
    name: "Onboarding Guide",
    category: "Onboarding",
    description: "A guided onboarding flow for new customers or members.",
    subject: "Let us get you started, {{firstName}}",
    previewText: "A step-by-step onboarding experience for new users.",
    variables: ["{{firstName}}"],
    form: {
      eyebrow: "Onboarding",
      headline: "Your quick start guide",
      bodyText:
        "Follow these simple steps to get set up, explore the dashboard, and start using the product with confidence.",
      ctaText: "Start onboarding",
      ctaUrl: "https://sellerslogin.com/overview",
      imageUrl:
        "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Onboarding guide",
      footerNote: "A strong onboarding sequence improves activation and retention.",
    },
  },
  {
    key: "progress_update",
    name: "Progress Update",
    category: "Progress",
    description: "A progress-focused email for milestones and status updates.",
    subject: "Your progress update is ready, {{firstName}}",
    previewText: "Share a checkpoint, milestone, or status summary.",
    variables: ["{{firstName}}"],
    form: {
      eyebrow: "Progress",
      headline: "Here is your progress update",
      bodyText:
        "We wanted to share a quick progress update so you can see what is complete and what comes next.",
      ctaText: "View progress",
      ctaUrl: "https://sellerslogin.com/overview",
      imageUrl:
        "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Progress chart",
      footerNote: "Progress emails are helpful for tracking outcomes over time.",
    },
  },
  {
    key: "reengagement_winback",
    name: "Re-engagement Winback",
    category: "Re-engagement",
    description: "A reactivation email to bring inactive users back.",
    subject: "We miss you, {{firstName}}",
    previewText: "Reconnect with inactive subscribers and customers.",
    variables: ["{{firstName}}"],
    form: {
      eyebrow: "Re-engagement",
      headline: "We would love to see you again",
      bodyText:
        "It has been a while since we last connected. Come back and see what is new, helpful, and worth your time.",
      ctaText: "Come back now",
      ctaUrl: "https://sellerslogin.com/offers",
      imageUrl:
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Re-engagement email",
      footerNote: "Re-engagement emails can help revive dormant audiences.",
    },
  },
  {
    key: "release_notes",
    name: "Release Notes",
    category: "Release",
    description: "A product release announcement with key highlights.",
    subject: "Latest release notes are here",
    previewText: "Use for launches, feature releases, and changelog updates.",
    variables: ["{{firstName}}"],
    form: {
      eyebrow: "Release",
      headline: "What is new in this release",
      bodyText:
        "We have packed this release with improvements, fixes, and updates designed to make the experience smoother.",
      ctaText: "See what changed",
      ctaUrl: "https://sellerslogin.com/overview",
      imageUrl:
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Release notes",
      footerNote: "Release emails help customers stay informed about new features.",
    },
  },
  {
    key: "sale_flash",
    name: "Flash Sale",
    category: "Sale",
    description: "A high-conversion sale template with urgency and clarity.",
    subject: "Flash sale starts now, {{firstName}}",
    previewText: "Perfect for limited-time sales and promos.",
    variables: ["{{firstName}}"],
    form: {
      eyebrow: "Sale",
      headline: "Save big before time runs out",
      bodyText:
        "Our limited-time sale is live. Browse the top picks, grab your favorites, and check out before the offer expires.",
      ctaText: "Shop the sale",
      ctaUrl: "https://sellerslogin.com/offers",
      imageUrl:
        "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Sale promotion",
      footerNote: "Clear sale messaging can improve clicks and conversions.",
    },
  },
];

export const getTemplatePreset = (key = "") =>
  templatePresets.find((preset) => preset.key === key) || null;

export const applyTemplatePreset = (baseForm, key = "") => {
  const preset = getTemplatePreset(key);
  if (!preset) {
    return baseForm;
  }

  return {
    ...baseForm,
    name: preset.name,
    subject: preset.subject,
    previewText: preset.previewText,
    ...preset.form,
  };
};

export { templatePresets };
